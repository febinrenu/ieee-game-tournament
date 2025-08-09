const express = require('express');
const Database = require('better-sqlite3');
const cors = require('cors');
const path = require('path');
const rateLimit = require('express-rate-limit');

const app = express();
const PORT = process.env.PORT || 10106;

// Middleware
app.use(cors({
  origin: true, // Allow all origins
  credentials: true, // Allow credentials
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
  preflightContinue: false,
  optionsSuccessStatus: 200
}));
app.use(express.json());
app.use(express.static('.'));

// Handle preflight requests for all routes
app.options('*', cors({
  origin: true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin']
}));

// Additional CORS middleware to ensure headers are always set
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin');
  res.header('Access-Control-Allow-Credentials', 'true');
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  
  next();
});

// Rate limiting to handle high concurrent load
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
// app.use('/api/', limiter);

// Initialize better-sqlite3 Database
let db;
try {
  db = new Database('./tournament_scores.db', { verbose: console.log });
  console.log('Connected to SQLite database with better-sqlite3.');
  
  // Enable WAL mode for better performance
  db.pragma('journal_mode = WAL');
  console.log('WAL mode enabled for improved performance.');
  
  // Set up WAL checkpoint monitoring to prevent file growth
  const fs = require('fs');
  const walCheckpointInterval = setInterval(() => {
    try {
      fs.stat('./tournament_scores.db-wal', (err, stat) => {
        if (err) {
          if (err.code !== 'ENOENT') {
            console.error('Error checking WAL file:', err);
          }
        } else if (stat.size > 10 * 1024 * 1024) { // 10MB threshold
          db.pragma('wal_checkpoint(RESTART)');
          console.log('WAL checkpoint executed due to file size:', stat.size);
        }
      });
    } catch (error) {
      console.error('Error in WAL checkpoint monitoring:', error);
    }
  }, 30000).unref(); // Check every 30 seconds, unref to not block process exit
  
  initializeDatabase();
} catch (err) {
  console.error('Error opening database:', err.message);
  process.exit(1);
}

function initializeDatabase() {
  // Create scores table if it doesn't exist
  const createTableQuery = `
    CREATE TABLE IF NOT EXISTS tournament_scores (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      registration_number TEXT UNIQUE NOT NULL,
      student_name TEXT,
      final_score INTEGER NOT NULL,
      levels_completed INTEGER NOT NULL,
      levels_skipped INTEGER DEFAULT 0,
      time_remaining INTEGER NOT NULL,
      total_time_taken INTEGER DEFAULT 0, -- Time taken to complete tournament (ms)
      game_start_time DATETIME,
      game_end_time DATETIME,
      level_breakdown TEXT, -- JSON string of level performance
      completion_time DATETIME DEFAULT CURRENT_TIMESTAMP,
      ip_address TEXT,
  session_id TEXT,
  password TEXT,
      -- Performance metrics
      total_attempts INTEGER DEFAULT 0,
      successful_attempts INTEGER DEFAULT 0,
      -- Level-specific timings
      level_1_time INTEGER DEFAULT 0,
      level_2_time INTEGER DEFAULT 0,
      level_3_time INTEGER DEFAULT 0,
      level_4_time INTEGER DEFAULT 0,
      level_5_time INTEGER DEFAULT 0,
      -- Level completion status
      level_1_status TEXT DEFAULT 'not_attempted', -- completed, skipped, not_attempted
      level_2_status TEXT DEFAULT 'not_attempted',
      level_3_status TEXT DEFAULT 'not_attempted',
      level_4_status TEXT DEFAULT 'not_attempted',
      level_5_status TEXT DEFAULT 'not_attempted',
      -- Detailed game analytics
      binary_pattern_attempts INTEGER DEFAULT 0,
      pathfinding_algorithm_length INTEGER DEFAULT 0,
      firewall_threats_blocked INTEGER DEFAULT 0,
      firewall_safe_allowed INTEGER DEFAULT 0,
      coding_challenge_solved TEXT DEFAULT 'none', -- which challenge was attempted
      -- Engagement metrics
      total_clicks INTEGER DEFAULT 0,
      level_switches INTEGER DEFAULT 0,
      hints_used INTEGER DEFAULT 0,
      errors_made INTEGER DEFAULT 0,
      -- Device and browser info
      user_agent TEXT,
      screen_resolution TEXT,
      device_type TEXT DEFAULT 'unknown' -- mobile, tablet, desktop
    )
  `;
  
  try {
    db.exec(createTableQuery);
    console.log('Tournament scores table ready.');
    
    // Migrate legacy columns if present (remove accuracy-related columns)
    try {
      const cols = db.prepare(`PRAGMA table_info(tournament_scores)`).all();
      const hasAccuracyCols = cols.some(c => ['accuracy_rate','average_level_performance','ai_training_accuracy'].includes(c.name));
      if (hasAccuracyCols) {
        console.log('Migrating tournament_scores schema to drop accuracy columns...');
        db.transaction(() => {
          db.exec(`
            CREATE TABLE IF NOT EXISTS tournament_scores_new (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              registration_number TEXT UNIQUE NOT NULL,
              student_name TEXT,
              final_score INTEGER NOT NULL,
              levels_completed INTEGER NOT NULL,
              levels_skipped INTEGER DEFAULT 0,
              time_remaining INTEGER NOT NULL,
              total_time_taken INTEGER DEFAULT 0,
              game_start_time DATETIME,
              game_end_time DATETIME,
              level_breakdown TEXT,
              completion_time DATETIME DEFAULT CURRENT_TIMESTAMP,
              ip_address TEXT,
              session_id TEXT,
              password TEXT,
              total_attempts INTEGER DEFAULT 0,
              successful_attempts INTEGER DEFAULT 0,
              level_1_time INTEGER DEFAULT 0,
              level_2_time INTEGER DEFAULT 0,
              level_3_time INTEGER DEFAULT 0,
              level_4_time INTEGER DEFAULT 0,
              level_5_time INTEGER DEFAULT 0,
              level_1_status TEXT DEFAULT 'not_attempted',
              level_2_status TEXT DEFAULT 'not_attempted',
              level_3_status TEXT DEFAULT 'not_attempted',
              level_4_status TEXT DEFAULT 'not_attempted',
              level_5_status TEXT DEFAULT 'not_attempted',
              binary_pattern_attempts INTEGER DEFAULT 0,
              pathfinding_algorithm_length INTEGER DEFAULT 0,
              firewall_threats_blocked INTEGER DEFAULT 0,
              firewall_safe_allowed INTEGER DEFAULT 0,
              coding_challenge_solved TEXT DEFAULT 'none',
              total_clicks INTEGER DEFAULT 0,
              level_switches INTEGER DEFAULT 0,
              hints_used INTEGER DEFAULT 0,
              errors_made INTEGER DEFAULT 0,
              user_agent TEXT,
              screen_resolution TEXT,
              device_type TEXT DEFAULT 'unknown'
            );
          `);
          db.exec(`
            INSERT INTO tournament_scores_new (
              id, registration_number, student_name, final_score, levels_completed, levels_skipped,
              time_remaining, total_time_taken, game_start_time, game_end_time, level_breakdown,
              completion_time, ip_address, session_id, password, total_attempts, successful_attempts,
              level_1_time, level_2_time, level_3_time, level_4_time, level_5_time,
              level_1_status, level_2_status, level_3_status, level_4_status, level_5_status,
              binary_pattern_attempts, pathfinding_algorithm_length, firewall_threats_blocked, firewall_safe_allowed,
              coding_challenge_solved, total_clicks, level_switches, hints_used, errors_made,
              user_agent, screen_resolution, device_type
            )
            SELECT 
              id, registration_number, student_name, final_score, levels_completed, levels_skipped,
              time_remaining, total_time_taken, game_start_time, game_end_time, level_breakdown,
              completion_time, ip_address, session_id, '' as password, total_attempts, successful_attempts,
              level_1_time, level_2_time, level_3_time, level_4_time, level_5_time,
              level_1_status, level_2_status, level_3_status, level_4_status, level_5_status,
              binary_pattern_attempts, pathfinding_algorithm_length, firewall_threats_blocked, firewall_safe_allowed,
              coding_challenge_solved, total_clicks, level_switches, hints_used, errors_made,
              user_agent, screen_resolution, device_type
            FROM tournament_scores;
          `);
          db.exec(`DROP TABLE tournament_scores;`);
          db.exec(`ALTER TABLE tournament_scores_new RENAME TO tournament_scores;`);
        })();
        console.log('Schema migration complete.');
      }
    } catch (mErr) {
      console.warn('Schema migration check failed:', mErr.message);
    }

    // Ensure password column exists (for pre-existing databases without it)
    try {
      const colsAfter = db.prepare(`PRAGMA table_info(tournament_scores)`).all();
      const hasPassword = colsAfter.some(c => c.name === 'password');
      if (!hasPassword) {
        db.exec(`ALTER TABLE tournament_scores ADD COLUMN password TEXT`);
        console.log('Added missing password column to tournament_scores.');
      }
    } catch (alterErr) {
      console.warn('Password column check/alter failed:', alterErr.message);
    }

    // Create indexes for better performance
    db.exec(`CREATE INDEX IF NOT EXISTS idx_final_score ON tournament_scores(final_score DESC)`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_completion_time ON tournament_scores(completion_time DESC)`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_levels_completed ON tournament_scores(levels_completed DESC)`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_session_id ON tournament_scores(session_id)`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_device_type ON tournament_scores(device_type)`);
    
    console.log('Database indexes created successfully.');
  } catch (err) {
    console.error('Error initializing database:', err.message);
  }
}

// API Routes

// Step 1: Register user immediately when they start the game
app.post('/api/register-user', (req, res) => {
  const { registrationNumber, studentName, sessionId, password } = req.body;
  
  // Validation
  if (!registrationNumber || !studentName || !password) {
    return res.status(400).json({ 
      success: false, 
      message: 'Registration number, student name, and password are required.' 
    });
  }
  
  const clientIP = req.ip || req.connection.remoteAddress;
  const userAgent = req.get('User-Agent') || '';
  
  try {
    // Check if user already exists
    const checkQuery = `SELECT registration_number, final_score, game_start_time, password as stored_password FROM tournament_scores WHERE registration_number = ?`;
    const existingUser = db.prepare(checkQuery).get(registrationNumber);
    
    if (existingUser) {
      // User already exists, verify password and return their current status
      if ((existingUser.stored_password || '') !== password) {
        return res.status(401).json({
          success: false,
          message: 'Incorrect password.'
        });
      }
      const hasStarted = existingUser.game_start_time !== null;
      return res.json({ 
        success: true, 
        message: 'User already registered.',
        userExists: true,
        hasStarted: hasStarted,
        currentScore: existingUser.final_score || 0,
        allowRestart: !hasStarted // Only allow restart if they haven't started yet
      });
    }
    
    // Create new user record with initial values
  const insertQuery = `
    INSERT INTO tournament_scores 
  (registration_number, student_name, final_score, levels_completed, levels_skipped,
   time_remaining, total_time_taken, game_start_time, game_end_time,
     level_breakdown, ip_address, session_id, password, total_attempts, successful_attempts,
   level_1_time, level_2_time, level_3_time, level_4_time, level_5_time,
     level_1_status, level_2_status, level_3_status, level_4_status, level_5_status,
   binary_pattern_attempts, pathfinding_algorithm_length, firewall_threats_blocked, firewall_safe_allowed,
   coding_challenge_solved, total_clicks, level_switches, hints_used, errors_made,
     user_agent, screen_resolution, device_type)
  VALUES (?, ?, 0, 0, 0, 600000, 0, NULL, NULL, '[]', ?, ?, ?, 0, 0, 0, 0, 0, 0, 0,
        'not_attempted', 'not_attempted', 'not_attempted', 'not_attempted', 'not_attempted',
    0, 0, 0, 0, 'none', 0, 0, 0, 0, ?, '', 'unknown')
  `;
    
    const insertStmt = db.prepare(insertQuery);
    const result = insertStmt.run(
      registrationNumber, 
      studentName, 
      clientIP, 
  sessionId, 
  password || '',
      userAgent
    );
    
    console.log(`New user registered: ${studentName} (${registrationNumber})`);
    res.json({ 
      success: true, 
      message: 'User registered successfully.',
      userExists: false,
      hasStarted: false,
      currentScore: 0,
      allowRestart: true
    });
    
  } catch (err) {
    console.error('Database error during user registration:', err);
    return res.status(500).json({ 
      success: false, 
      message: 'Failed to register user in database.' 
    });
  }
});

// Step 2: Mark game as started (prevents page reload abuse)
app.post('/api/start-game', (req, res) => {
  const { registrationNumber, gameStartTime, password } = req.body;
  
  if (!registrationNumber) {
    return res.status(400).json({ 
      success: false, 
      message: 'Registration number is required.' 
    });
  }
  
  try {
    // Verify password if provided
    try {
      if (password) {
        const row = db.prepare('SELECT password FROM tournament_scores WHERE registration_number = ?').get(registrationNumber);
        if (!row) {
          return res.status(404).json({ success: false, message: 'User not found.' });
        }
        if ((row.password || '') !== password) {
          return res.status(401).json({ success: false, message: 'Incorrect password.' });
        }
      }
    } catch (verr) {
      console.error('Password verification error:', verr);
      return res.status(500).json({ success: false, message: 'Failed to verify password.' });
    }
    const updateQuery = `
      UPDATE tournament_scores 
      SET game_start_time = ? 
      WHERE registration_number = ? AND game_start_time IS NULL
    `;
    
    const updateStmt = db.prepare(updateQuery);
    const result = updateStmt.run(gameStartTime, registrationNumber);
    
    if (result.changes === 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Game already started or user not found.' 
      });
    }
    
    console.log(`Game started for: ${registrationNumber}`);
    res.json({ 
      success: true, 
      message: 'Game started successfully.' 
    });
    
  } catch (err) {
    console.error('Database error during game start:', err);
    return res.status(500).json({ 
      success: false, 
      message: 'Failed to start game.' 
    });
  }
});

// Authenticated progress retrieval (requires password in body)
app.post('/api/get-progress-auth', (req, res) => {
  const { registrationNumber, password } = req.body || {};

  if (!registrationNumber || !password) {
    return res.status(400).json({ success: false, message: 'Registration number and password are required.' });
  }

  try {
    const query = `
      SELECT registration_number, student_name, final_score, time_remaining,
             level_1_status, level_2_status, level_3_status, level_4_status, level_5_status,
             level_1_time, level_2_time, level_3_time, level_4_time, level_5_time,
             game_start_time, binary_pattern_attempts, pathfinding_algorithm_length,
             firewall_threats_blocked, firewall_safe_allowed,
             coding_challenge_solved, total_clicks, level_switches, hints_used, errors_made,
             password as stored_password
      FROM tournament_scores 
      WHERE registration_number = ?
    `;

    const user = db.prepare(query).get(registrationNumber);

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    if ((user.stored_password || '') !== password) {
      return res.status(401).json({ success: false, message: 'Incorrect password.' });
    }

    // Determine current level (first level that's not completed or skipped)
    let currentLevel = 1;
    const levelStatuses = [
      user.level_1_status,
      user.level_2_status, 
      user.level_3_status,
      user.level_4_status,
      user.level_5_status
    ];
    
    for (let i = 0; i < levelStatuses.length; i++) {
      if (levelStatuses[i] === 'not_attempted') {
        currentLevel = i + 1;
        break;
      }
      if (i === levelStatuses.length - 1) {
        currentLevel = 6; // All levels completed
      }
    }

    // Calculate completed levels count (completed or skipped)
    const completedLevels = levelStatuses.filter(status => 
      status === 'completed' || status === 'skipped'
    ).length;

    res.json({ 
      success: true, 
      user: {
        registrationNumber: user.registration_number,
        studentName: user.student_name,
        currentScore: user.final_score,
        timeRemaining: user.time_remaining,
        currentLevel: currentLevel,
        completedLevels: completedLevels,
        hasStarted: user.game_start_time !== null,
        isCompleted: currentLevel > 5,
        levelStatuses: {
          level1: user.level_1_status,
          level2: user.level_2_status,
          level3: user.level_3_status,
          level4: user.level_4_status,
          level5: user.level_5_status
        },
        levelTimes: {
          level1: user.level_1_time,
          level2: user.level_2_time,
          level3: user.level_3_time,
          level4: user.level_4_time,
          level5: user.level_5_time
        },
        analytics: {
          binaryPatternAttempts: user.binary_pattern_attempts,
          pathfindingAlgorithmLength: user.pathfinding_algorithm_length,
          firewallThreatsBlocked: user.firewall_threats_blocked,
          firewallSafeAllowed: user.firewall_safe_allowed,
          codingChallengeSolved: user.coding_challenge_solved,
          totalClicks: user.total_clicks,
          levelSwitches: user.level_switches,
          hintsUsed: user.hints_used,
          errorsMade: user.errors_made
        }
      }
    });

  } catch (err) {
    console.error('Database error during auth progress retrieval:', err);
    return res.status(500).json({ success: false, message: 'Failed to retrieve user progress.' });
  }
});

// Step 3: Submit tournament score (only updates if score is better)
app.post('/api/submit-score', (req, res) => {
  const {
    registrationNumber,
    studentName,
    finalScore,
  levelsCompleted,
    timeRemaining,
    levelBreakdown,
    sessionId,
    gameStartTime,
    gameEndTime,
    totalTimeTaken,
    analytics
  } = req.body;

  // Validation
  if (!registrationNumber || finalScore === undefined) {
    return res.status(400).json({ 
      success: false, 
      message: 'Registration number and final score are required.' 
    });
  }

  try {
    // First check if user exists and if this score is better
    const checkScoreQuery = `SELECT final_score, game_start_time FROM tournament_scores WHERE registration_number = ?`;
    const checkStmt = db.prepare(checkScoreQuery);
    const existingRecord = checkStmt.get(registrationNumber);
    
    if (!existingRecord) {
      return res.status(400).json({ 
        success: false, 
        message: 'User not registered. Please register first.' 
      });
    }
    
    if (!existingRecord.game_start_time) {
      return res.status(400).json({ 
        success: false, 
        message: 'Game not started. Please start the game first.' 
      });
    }
    
    // Check if new score is better than existing score
    const currentBestScore = existingRecord.final_score || 0;
    if (finalScore <= currentBestScore && currentBestScore > 0) {
      return res.json({ 
        success: true, 
        message: 'Score submitted, but existing score is better.',
        scoreUpdated: false,
        currentBestScore: currentBestScore,
        submittedScore: finalScore
      });
    }

    // Proceed with score update since it's better
    updateUserScore();
    
  } catch (err) {
    console.error('Database error during score check:', err);
    return res.status(500).json({ 
      success: false, 
      message: 'Database error during score check.' 
    });
  }

  function updateUserScore() {
    try {
      const clientIP = req.ip || req.connection.remoteAddress;
      
      // Process level breakdown to extract detailed metrics
      let levelsSkipped = 0;
  let levelsCompletedComputed = 0; // compute completed levels from statuses/breakdown
      let totalAttempts = 0;
      let successfulAttempts = 0;
  let avgPerformance = 0;
      const levelTimes = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
      const levelStatuses = { 1: 'not_attempted', 2: 'not_attempted', 3: 'not_attempted', 4: 'not_attempted', 5: 'not_attempted' };

      if (levelBreakdown && Array.isArray(levelBreakdown)) {
        // Process each level's performance
        let totalPerformance = 0;
        let performanceLevels = 0;

        levelBreakdown.forEach(level => {
          const levelNum = level.level;
          totalAttempts += level.attempts || 0;
          
          if (level.performance === 0 && level.attempts === 0) {
            // This level was skipped
            levelsSkipped++;
            levelStatuses[levelNum] = 'skipped';
          } else if (level.performance > 0) {
            // This level was completed
            successfulAttempts++;
            levelStatuses[levelNum] = 'completed';
            totalPerformance += level.performance;
            performanceLevels++;
          }
          
          // Store individual level timing if available
          if (level.timeSpent) {
            levelTimes[levelNum] = level.timeSpent;
          }
        });

        avgPerformance = performanceLevels > 0 ? totalPerformance / performanceLevels : 0;
      }

      // If we have no levelBreakdown, try to compute from DB statuses as a fallback
      if (!levelBreakdown || !Array.isArray(levelBreakdown) || levelBreakdown.length === 0) {
        try {
          const statusRow = db.prepare(`
            SELECT level_1_status, level_2_status, level_3_status, level_4_status, level_5_status
            FROM tournament_scores WHERE registration_number = ?
          `).get(registrationNumber);
          if (statusRow) {
            const statuses = [
              statusRow.level_1_status,
              statusRow.level_2_status,
              statusRow.level_3_status,
              statusRow.level_4_status,
              statusRow.level_5_status
            ];
            levelsSkipped = statuses.filter(s => s === 'skipped').length;
            // mark completed for levelsCompletedComputed below as well
            statuses.forEach((s, idx) => {
              if (s === 'completed') levelStatuses[idx + 1] = 'completed';
            });
          }
        } catch (e) {
          console.warn('Fallback status fetch failed:', e?.message);
        }
      }

      // Compute completed count from levelStatuses
      levelsCompletedComputed = Object.values(levelStatuses).filter(s => s === 'completed').length;

  // Process analytics data
      let analyticsData = {
        totalClicks: 0,
        levelSwitches: 0,
        hintsUsed: 0,
        errorsMade: 0,
        binaryPatternAttempts: 0,
        pathfindingAlgorithmLength: 0,
        firewallThreatsBlocked: 0,
        firewallSafeAllowed: 0,
        codingChallengeSolved: 'none',
        deviceInfo: { userAgent: '', screenResolution: '', deviceType: 'unknown' }
      };

      if (analytics) {
        analyticsData = { ...analyticsData, ...analytics };
      }

      // Calculate total time taken
      const totalTime = totalTimeTaken || (600000 - timeRemaining); // Assuming 600000ms as gameConfig.totalTimeLimit
      
      // Update score with better-sqlite3 transaction
      const updateTransaction = db.transaction(() => {
        const updateQuery = `
          UPDATE tournament_scores SET
            student_name = ?,
            final_score = ?,
            levels_completed = ?,
            levels_skipped = ?,
            time_remaining = ?,
            total_time_taken = ?,
            game_start_time = ?,
            game_end_time = ?,
            level_breakdown = ?,
            completion_time = CURRENT_TIMESTAMP,
            ip_address = ?,
            session_id = ?,
            total_attempts = ?,
            successful_attempts = ?,
            level_1_time = ?,
            level_2_time = ?,
            level_3_time = ?,
            level_4_time = ?,
            level_5_time = ?,
            level_1_status = ?,
            level_2_status = ?,
            level_3_status = ?,
            level_4_status = ?,
            level_5_status = ?,
            binary_pattern_attempts = ?,
            pathfinding_algorithm_length = ?,
            firewall_threats_blocked = ?,
            firewall_safe_allowed = ?,
            coding_challenge_solved = ?,
            total_clicks = ?,
            level_switches = ?,
            hints_used = ?,
            errors_made = ?,
            user_agent = ?,
            screen_resolution = ?,
            device_type = ?
          WHERE registration_number = ?
        `;
        
        const updateStmt = db.prepare(updateQuery);
        return updateStmt.run(
          studentName || 'Anonymous',
          finalScore,
          levelsCompletedComputed,
          levelsSkipped,
          timeRemaining || 0,
          totalTime,
          gameStartTime,
          gameEndTime,
          JSON.stringify(levelBreakdown || []),
          clientIP,
          sessionId,
          totalAttempts,
          successfulAttempts,
          levelTimes[1],
          levelTimes[2],
          levelTimes[3],
          levelTimes[4],
          levelTimes[5],
          levelStatuses[1],
          levelStatuses[2],
          levelStatuses[3],
          levelStatuses[4],
          levelStatuses[5],
          analyticsData.binaryPatternAttempts || 0,
          analyticsData.pathfindingAlgorithmLength || 0,
          analyticsData.firewallThreatsBlocked || 0,
          analyticsData.firewallSafeAllowed || 0,
          analyticsData.codingChallengeSolved || 'none',
          analyticsData.totalClicks || 0,
          analyticsData.levelSwitches || 0,
          analyticsData.hintsUsed || 0,
          analyticsData.errorsMade || 0,
          analyticsData.deviceInfo?.userAgent || '',
          analyticsData.deviceInfo?.screenResolution || '',
          analyticsData.deviceInfo?.deviceType || 'unknown',
          registrationNumber
        );
      });
      
      const result = updateTransaction();
      
      res.json({
        success: true,
        message: 'Score submitted successfully!',
        scoreUpdated: true,
        scoreId: result.lastInsertRowid,
  rank: null // Will be calculated in leaderboard
      });
      
    } catch (err) {
      console.error('Database error during score update:', err);
      return res.status(500).json({ 
        success: false, 
        message: 'Error saving score to database.' 
      });
    }
  }
});

// NEW: Update individual level progress (called after each level completion/skip)
app.post('/api/update-level-progress', (req, res) => {
  const {
    registrationNumber,
    levelNumber,
    levelStatus, // 'completed', 'skipped', 'not_attempted'
    levelScore,
    levelTime,
    currentTotalScore,
    timeRemaining,
    analytics
  } = req.body;

  // Validation
  if (!registrationNumber || !levelNumber || !levelStatus) {
    return res.status(400).json({ 
      success: false, 
      message: 'Registration number, level number, and level status are required.' 
    });
  }

  try {
    // Check if user exists
    const checkQuery = `SELECT registration_number, final_score FROM tournament_scores WHERE registration_number = ?`;
    const existingUser = db.prepare(checkQuery).get(registrationNumber);
    
    if (!existingUser) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found. Please register first.' 
      });
    }

    // Update and then recompute levels_completed/levels_skipped atomically
    const tx = db.transaction(() => {
      // Update level-specific progress
      const levelStatusColumn = `level_${levelNumber}_status`;
      const levelTimeColumn = `level_${levelNumber}_time`;
      
    const updateQuery = `
        UPDATE tournament_scores 
        SET ${levelStatusColumn} = ?, 
            ${levelTimeColumn} = ?, 
            final_score = ?,
            time_remaining = ?,
            binary_pattern_attempts = ?,
            pathfinding_algorithm_length = ?,
            firewall_threats_blocked = ?,
            firewall_safe_allowed = ?,
            coding_challenge_solved = ?,
            total_clicks = ?,
            level_switches = ?,
            hints_used = ?,
            errors_made = ?
        WHERE registration_number = ?
      `;
      
      db.prepare(updateQuery).run(
        levelStatus,
        levelTime || 0,
        currentTotalScore || existingUser.final_score,
        timeRemaining || 0,
        analytics?.binaryPatternAttempts || 0,
        analytics?.pathfindingAlgorithmLength || 0,
        analytics?.firewallThreatsBlocked || 0,
        analytics?.firewallSafeAllowed || 0,
        analytics?.codingChallengeSolved || 'none',
        analytics?.totalClicks || 0,
        analytics?.levelSwitches || 0,
        analytics?.hintsUsed || 0,
        analytics?.errorsMade || 0,
        registrationNumber
      );

      // Fetch current statuses
      const statusRow = db.prepare(`
        SELECT 
          level_1_status, level_2_status, level_3_status, level_4_status, level_5_status
        FROM tournament_scores WHERE registration_number = ?
      `).get(registrationNumber);

      const statuses = [
        statusRow.level_1_status,
        statusRow.level_2_status,
        statusRow.level_3_status,
        statusRow.level_4_status,
        statusRow.level_5_status
      ];

      const completed = statuses.filter(s => s === 'completed').length;
      const skipped = statuses.filter(s => s === 'skipped').length;

      // Update aggregate counts
      db.prepare(`
        UPDATE tournament_scores
        SET levels_completed = ?,
            levels_skipped = ?
        WHERE registration_number = ?
      `).run(completed, skipped, registrationNumber);
    });

    tx();

    console.log(`Level ${levelNumber} progress updated for ${registrationNumber}: ${levelStatus}`);
    res.json({ 
      success: true, 
      message: `Level ${levelNumber} progress saved successfully.`,
      levelStatus: levelStatus,
      currentScore: currentTotalScore
    });
    
  } catch (err) {
    console.error('Database error during level progress update:', err);
    return res.status(500).json({ 
      success: false, 
      message: 'Failed to update level progress.' 
    });
  }
});

// NEW: Get user's current progress (for resuming)
app.get('/api/get-progress/:registrationNumber', (req, res) => {
  const registrationNumber = req.params.registrationNumber;

  try {
    const query = `
  SELECT registration_number, student_name, final_score, time_remaining,
             level_1_status, level_2_status, level_3_status, level_4_status, level_5_status,
             level_1_time, level_2_time, level_3_time, level_4_time, level_5_time,
     game_start_time, binary_pattern_attempts, pathfinding_algorithm_length,
     firewall_threats_blocked, firewall_safe_allowed,
             coding_challenge_solved, total_clicks, level_switches, hints_used, errors_made
      FROM tournament_scores 
      WHERE registration_number = ?
    `;
    
    const user = db.prepare(query).get(registrationNumber);
    
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found.' 
      });
    }

    // Determine current level (first level that's not completed or skipped)
    let currentLevel = 1;
    const levelStatuses = [
      user.level_1_status,
      user.level_2_status, 
      user.level_3_status,
      user.level_4_status,
      user.level_5_status
    ];
    
    for (let i = 0; i < levelStatuses.length; i++) {
      if (levelStatuses[i] === 'not_attempted') {
        currentLevel = i + 1;
        break;
      }
      if (i === levelStatuses.length - 1) {
        currentLevel = 6; // All levels completed
      }
    }

    // Calculate completed levels count
    const completedLevels = levelStatuses.filter(status => 
      status === 'completed' || status === 'skipped'
    ).length;

    res.json({ 
      success: true, 
      user: {
        registrationNumber: user.registration_number,
        studentName: user.student_name,
        currentScore: user.final_score,
        timeRemaining: user.time_remaining,
        currentLevel: currentLevel,
        completedLevels: completedLevels,
        hasStarted: user.game_start_time !== null,
        isCompleted: currentLevel > 5,
        levelStatuses: {
          level1: user.level_1_status,
          level2: user.level_2_status,
          level3: user.level_3_status,
          level4: user.level_4_status,
          level5: user.level_5_status
        },
        levelTimes: {
          level1: user.level_1_time,
          level2: user.level_2_time,
          level3: user.level_3_time,
          level4: user.level_4_time,
          level5: user.level_5_time
        },
        analytics: {
          binaryPatternAttempts: user.binary_pattern_attempts,
          pathfindingAlgorithmLength: user.pathfinding_algorithm_length,
          firewallThreatsBlocked: user.firewall_threats_blocked,
          firewallSafeAllowed: user.firewall_safe_allowed,
          
          codingChallengeSolved: user.coding_challenge_solved,
          totalClicks: user.total_clicks,
          levelSwitches: user.level_switches,
          hintsUsed: user.hints_used,
          errorsMade: user.errors_made
        }
      }
    });
    
  } catch (err) {
    console.error('Database error during progress retrieval:', err);
    return res.status(500).json({ 
      success: false, 
      message: 'Failed to retrieve user progress.' 
    });
  }
});

// Get leaderboard
app.get('/api/leaderboard', (req, res) => {
  const limit = parseInt(req.query.limit) || 100;
  const offset = parseInt(req.query.offset) || 0;

  try {
    const leaderboardQuery = `
      SELECT 
        ROW_NUMBER() OVER (ORDER BY final_score DESC, completion_time ASC) as rank,
        registration_number,
        student_name,
        final_score,
        levels_completed,
        levels_skipped,
        time_remaining,
        total_time_taken,
        game_start_time,
        game_end_time,
        level_breakdown,
        completion_time,
        total_attempts,
        successful_attempts,
        level_1_time,
        level_2_time,
        level_3_time,
        level_4_time,
        level_5_time,
        level_1_status,
        level_2_status,
        level_3_status,
        level_4_status,
        level_5_status
      FROM tournament_scores 
      ORDER BY final_score DESC, completion_time ASC
      LIMIT ? OFFSET ?
    `;

    const leaderboardStmt = db.prepare(leaderboardQuery);
    const rows = leaderboardStmt.all(limit, offset);

    // Parse level breakdown JSON
    const leaderboard = rows.map(row => ({
      ...row,
      level_breakdown: JSON.parse(row.level_breakdown || '{}')
    }));

    res.json({
      success: true,
      leaderboard: leaderboard,
      total: leaderboard.length
    });
    
  } catch (err) {
    console.error('Database error:', err.message);
    return res.status(500).json({ 
      success: false, 
      message: 'Error fetching leaderboard.' 
    });
  }
});

// Get total participants count
app.get('/api/stats', (req, res) => {
  try {
    const statsQuery = `
      SELECT 
        COUNT(*) as total_participants,
        MAX(final_score) as highest_score,
        AVG(final_score) as average_score,
        AVG(levels_completed) as average_levels_completed,
        AVG(levels_skipped) as average_levels_skipped,
        AVG(total_time_taken) as average_time_taken,
        AVG(total_attempts) as average_attempts,
        AVG(successful_attempts) as average_successful_attempts,
        SUM(CASE WHEN level_1_status = 'completed' THEN 1 ELSE 0 END) as level_1_completions,
        SUM(CASE WHEN level_2_status = 'completed' THEN 1 ELSE 0 END) as level_2_completions,
        SUM(CASE WHEN level_3_status = 'completed' THEN 1 ELSE 0 END) as level_3_completions,
        SUM(CASE WHEN level_4_status = 'completed' THEN 1 ELSE 0 END) as level_4_completions,
        SUM(CASE WHEN level_5_status = 'completed' THEN 1 ELSE 0 END) as level_5_completions,
        SUM(CASE WHEN level_1_status = 'skipped' THEN 1 ELSE 0 END) as level_1_skips,
        SUM(CASE WHEN level_2_status = 'skipped' THEN 1 ELSE 0 END) as level_2_skips,
        SUM(CASE WHEN level_3_status = 'skipped' THEN 1 ELSE 0 END) as level_3_skips,
        SUM(CASE WHEN level_4_status = 'skipped' THEN 1 ELSE 0 END) as level_4_skips,
        SUM(CASE WHEN level_5_status = 'skipped' THEN 1 ELSE 0 END) as level_5_skips
      FROM tournament_scores
    `;

    const statsStmt = db.prepare(statsQuery);
    const row = statsStmt.get();

    res.json({
      success: true,
      stats: row
    });
    
  } catch (err) {
    console.error('Database error:', err.message);
    return res.status(500).json({ 
      success: false, 
      message: 'Error fetching statistics.' 
    });
  }
});

// Check user registration status
app.get('/api/check-registration/:registrationNumber', (req, res) => {
  const registrationNumber = req.params.registrationNumber;

  try {
    const checkQuery = `
      SELECT 
        registration_number,
        student_name,
        final_score,
        game_start_time,
        game_end_time,
        completion_time,
        levels_completed
      FROM tournament_scores 
      WHERE registration_number = ?
    `;

    const checkStmt = db.prepare(checkQuery);
    const row = checkStmt.get(registrationNumber);

    if (!row) {
      return res.json({
        success: true,
        registered: false,
        message: 'User not registered.'
      });
    }

    const hasStarted = row.game_start_time !== null;
    const hasCompleted = row.game_end_time !== null;

    res.json({
      success: true,
      registered: true,
      hasStarted: hasStarted,
      hasCompleted: hasCompleted,
      currentScore: row.final_score || 0,
      levelsCompleted: row.levels_completed || 0,
      studentName: row.student_name,
      completionTime: row.completion_time
    });
    
  } catch (err) {
    console.error('Database error:', err.message);
    return res.status(500).json({ 
      success: false, 
      message: 'Error checking registration status.' 
    });
  }
});

// Get individual student rank
app.get('/api/rank/:registrationNumber', (req, res) => {
  const registrationNumber = req.params.registrationNumber;

  try {
    const rankQuery = `
      SELECT 
        rank,
        registration_number,
        student_name,
        final_score,
        levels_completed,
        levels_skipped,
        time_remaining,
        total_time_taken,
        completion_time,
        total_attempts,
        successful_attempts,
        level_1_status,
        level_2_status,
        level_3_status,
        level_4_status,
        level_5_status
      FROM (
        SELECT 
          ROW_NUMBER() OVER (ORDER BY final_score DESC, completion_time ASC) as rank,
          registration_number, student_name, final_score, levels_completed, levels_skipped,
          time_remaining, total_time_taken, completion_time, total_attempts, successful_attempts,
          level_1_status, level_2_status, level_3_status, level_4_status, level_5_status
        FROM tournament_scores
      ) ranked_scores
      WHERE registration_number = ?
    `;

    const rankStmt = db.prepare(rankQuery);
    const row = rankStmt.get(registrationNumber);

    if (!row) {
      return res.status(404).json({ 
        success: false, 
        message: 'Student not found in leaderboard.' 
      });
    }

    res.json({
      success: true,
      student: row
    });
    
  } catch (err) {
    console.error('Database error:', err.message);
    return res.status(500).json({ 
      success: false, 
      message: 'Error fetching rank.' 
    });
  }
});

// Serve the leaderboard HTML page
app.get('/leaderboard', (req, res) => {
  res.sendFile(path.join(__dirname, 'leaderboard.html'));
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'Server is running', timestamp: new Date().toISOString() });
});

// =================
// DATABASE CLEARING ENDPOINTS
// =================

// Clear all tournament data (Admin endpoint)
app.delete('/api/admin/clear-all', (req, res) => {
  const adminKey = req.query.key || req.headers['admin-key'];
  
  // Simple admin key check (you can change this)
  if (adminKey !== 'IEEE2025ADMIN') {
    return res.status(403).json({
      success: false,
      message: 'Unauthorized. Admin key required.'
    });
  }

  try {
    const clearQuery = 'DELETE FROM tournament_scores';
    const clearStmt = db.prepare(clearQuery);
    const result = clearStmt.run();

    console.log('🗑️ Database cleared by admin');
    res.json({
      success: true,
      message: 'All tournament data has been cleared successfully.',
      deletedRecords: result.changes,
      timestamp: new Date().toISOString()
    });
    
  } catch (err) {
    console.error('Error clearing database:', err.message);
    return res.status(500).json({
      success: false,
      message: 'Error clearing database.'
    });
  }
});

// Clear specific student record
app.delete('/api/admin/clear-student', (req, res) => {
  const adminKey = req.query.key || req.headers['admin-key'];
  const registrationNumber = req.query.reg || req.body.registrationNumber;
  
  if (adminKey !== 'IEEE2025ADMIN') {
    return res.status(403).json({
      success: false,
      message: 'Unauthorized. Admin key required.'
    });
  }

  if (!registrationNumber) {
    return res.status(400).json({
      success: false,
      message: 'Registration number is required.'
    });
  }

  try {
    const deleteQuery = 'DELETE FROM tournament_scores WHERE registration_number = ?';
    const deleteStmt = db.prepare(deleteQuery);
    const result = deleteStmt.run(registrationNumber);

    if (result.changes === 0) {
      return res.status(404).json({
        success: false,
        message: 'Student not found.'
      });
    }

    console.log(`🗑️ Student record deleted: ${registrationNumber}`);
    res.json({
      success: true,
      message: `Student record for ${registrationNumber} has been deleted.`,
      deletedRecords: result.changes
    });
    
  } catch (err) {
    console.error('Error deleting student record:', err.message);
    return res.status(500).json({
      success: false,
      message: 'Error deleting student record.'
    });
  }
});

// Get database backup (export data)
app.get('/api/admin/backup', (req, res) => {
  const adminKey = req.query.key || req.headers['admin-key'];
  
  if (adminKey !== 'IEEE2025ADMIN') {
    return res.status(403).json({
      success: false,
      message: 'Unauthorized. Admin key required.'
    });
  }

  try {
  const backupQuery = 'SELECT * FROM tournament_scores ORDER BY completion_time DESC';
    const backupStmt = db.prepare(backupQuery);
    const rows = backupStmt.all();

    const backup = {
      exportDate: new Date().toISOString(),
      totalRecords: rows.length,
      data: rows.map(row => {
        const { password, ...rest } = row;
        return {
          ...rest,
          level_breakdown: JSON.parse(row.level_breakdown || '{}')
        };
      })
    };

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="tournament_backup_${new Date().toISOString().split('T')[0]}.json"`);
    res.json(backup);
    
  } catch (err) {
    console.error('Error creating backup:', err.message);
    return res.status(500).json({
      success: false,
      message: 'Error creating backup.'
    });
  }
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('Closing database connection...');
  try {
    db.close();
    console.log('Database connection closed.');
  } catch (err) {
    console.error('Error closing database:', err.message);
  }
  process.exit(0);
});

app.listen(PORT, () => {
  console.log(`🚀 Tournament server running on http://localhost:${PORT}`);
  console.log(`📊 Leaderboard available at http://localhost:${PORT}/leaderboard`);
  console.log(`🏆 Ready to handle 600+ concurrent students with better-sqlite3!`);
  console.log(`⚡ WAL mode enabled for improved performance!`);
});
