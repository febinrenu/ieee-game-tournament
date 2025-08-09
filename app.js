// Game Configuration
const gameConfig = {
    totalTimeLimit: 600000, // 10 minutes in milliseconds
    serverUrl: 'http://localhost:10106', // Backend server URL
    levels: [
        {
            id: 1,
            name: "Binary Memory Pattern",
            theme: "memory",
            description: "Memorize and reproduce binary patterns",
            gridSize: "4x4",
            timeToMemorize: 2000,
            maxAttempts: 3
        },
        {
            id: 2,
            name: "Algorithm Pathfinding",
            theme: "algorithms",
            description: "Create algorithm to guide robot through maze",
            availableBlocks: ["forward", "turnLeft", "turnRight", "repeat"]
        },
        {
            id: 3,
            name: "Cybersecurity Firewall",
            theme: "security",
            description: "Block malicious packets while allowing safe ones",
            successThresholds: { blockThreats: 85, allowSafe: 90 }
        },
        {
            id: 4,
            name: "AI Training Challenge",
            theme: "artificial intelligence",
            description: "Train AI to make correct decisions",
            targetAccuracy: 80
        },
        {
            id: 5,
            name: "Real-time Coding Duel",
            theme: "programming",
            description: "Complete algorithms using drag-and-drop blocks",
            challenges: ["sorting", "loops", "mathematics"]
        }
    ]
};

// Game State
let gameState = {
    currentLevel: 1,
    score: 0,
    startTime: 0,
    timeRemaining: gameConfig.totalTimeLimit,
    levelsCompleted: 0,
    levelScores: [],
    levelStartScore: 0, // Track score at start of level
    completedLevels: [], // Track which levels are completed
    isGameActive: false,
    timer: null,
    registrationNumber: '',
    studentName: '', // Add student name for leaderboard
    sessionId: generateSessionId(), // Unique session identifier
    levelPerformance: [], // Track performance per level for accuracy calculation
    levelStartTimes: {}, // Track when each level started
    currentLevelStartTime: 0, // Track current level start time
    
    // Detailed analytics tracking
    analytics: {
        totalClicks: 0,
        levelSwitches: 0,
        hintsUsed: 0,
        errorsMade: 0,
        binaryPatternAttempts: 0,
        pathfindingAlgorithmLength: 0,
        firewallThreatsBlocked: 0,
        firewallSafeAllowed: 0,
        aiTrainingAccuracy: 0,
        codingChallengeSolved: 'none',
        deviceInfo: getDeviceInfo()
    },
    
    // Anti-cheat variables
    binaryPatternLocked: false // Prevent clicks during pattern display
};

// Generate unique session ID
function generateSessionId() {
    return 'sess_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

// Get device information for analytics
function getDeviceInfo() {
    const userAgent = navigator.userAgent;
    const screenWidth = window.screen.width;
    const screenHeight = window.screen.height;
    
    let deviceType = 'desktop';
    if (/iPhone|iPad|iPod|Android/i.test(userAgent)) {
        deviceType = screenWidth <= 768 ? 'mobile' : 'tablet';
    } else if (screenWidth <= 768) {
        deviceType = 'mobile';
    } else if (screenWidth <= 1024) {
        deviceType = 'tablet';
    }
    
    return {
        userAgent: userAgent,
        screenResolution: `${screenWidth}x${screenHeight}`,
        deviceType: deviceType
    };
}

// Track user interactions
function trackClick() {
    gameState.analytics.totalClicks++;
}

// Track errors
function trackError() {
    gameState.analytics.errorsMade++;
}

// Initialize game
document.addEventListener('DOMContentLoaded', function() {
    initializeGame();
    
    // Add global click tracking
    document.addEventListener('click', trackClick);
});

function initializeGame() {
    setupEventListeners();
    
    // Check for registration number in URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const regNumber = urlParams.get('reg');
    
    if (regNumber) {
        // Pre-fill the registration number if it exists in URL
        document.getElementById('register-number').value = regNumber;
        // Clear any validation errors
        document.getElementById('registration-error').classList.add('hidden');
        
        // Check if we should auto-resume
        const autoResume = urlParams.get('resume');
        if (autoResume === 'true') {
            // Try to get the student name from localStorage
            const savedName = localStorage.getItem(`student_name_${regNumber}`);
            if (savedName) {
                document.getElementById('student-name').value = savedName;
                // Auto-trigger resume check after a short delay
                setTimeout(() => {
                    const studentName = document.getElementById('student-name').value.trim();
                    if (studentName) {
                        registerUserInDatabase(studentName, regNumber);
                    }
                }, 500);
            }
        }
    }
    
    showScreen('welcome-screen');
}

function setupEventListeners() {
    // Welcome screen
    document.getElementById('start-btn').addEventListener('click', startGame);
    document.getElementById('welcome-leaderboard-btn').addEventListener('click', viewLeaderboard);
    
    // Registration number input
    const registerInput = document.getElementById('register-number');
    registerInput.addEventListener('input', function() {
        const errorDiv = document.getElementById('registration-error');
        const value = this.value.trim();
        
        // Clear previous error when user starts typing
        errorDiv.classList.add('hidden');
        
        // Real-time validation for registration number
        if (value.length > 0) {
            const regNumberPattern = /^[A-Za-z0-9]*$/;
            
            // Check for invalid characters
            if (!regNumberPattern.test(value)) {
                errorDiv.classList.remove('hidden');
                errorDiv.textContent = 'Only letters and numbers are allowed (no spaces or special characters)';
                return;
            }
            
            // Check length
            if (value.length > 11) {
                this.value = value.substring(0, 11); // Prevent typing more than 11 characters
            } else if (value.length < 11) {
                errorDiv.classList.remove('hidden');
                errorDiv.textContent = `Registration number must be 11 characters (current: ${value.length})`;
                return;
            } else {
                // Exactly 11 characters and valid format
                errorDiv.classList.add('hidden');
            }
        }
    });
    
    // Allow Enter key to start game
    registerInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            startGame();
        }
    });
    
    // Results screen
    document.getElementById('view-leaderboard-btn').addEventListener('click', viewLeaderboard);
    document.getElementById('restart-btn').addEventListener('click', restartGame);
    document.getElementById('share-btn').addEventListener('click', shareResults);
    
    // Header leaderboard button
    const headerLeaderboardBtn = document.getElementById('header-leaderboard-btn');
    if (headerLeaderboardBtn) {
        headerLeaderboardBtn.addEventListener('click', viewLeaderboard);
    }
    
    // Skip level buttons
    for (let i = 1; i <= 5; i++) {
        const skipBtn = document.getElementById(`skip-level-${i}`);
        if (skipBtn) {
            skipBtn.addEventListener('click', () => skipLevel(i));
        }
    }
}

function skipLevel(levelNum) {
    if (confirm(`Are you sure you want to skip Level ${levelNum}? You won't earn points for this level.`)) {
        // Track skipped level with 0 performance
        completeLevel(0, 0);
        
        if (levelNum >= 5) {
            completeGame();
        }
    }
}

function startGame() {
    // Validate registration details
    const studentName = document.getElementById('student-name').value.trim();
    const registerNumber = document.getElementById('register-number').value.trim();
    const errorDiv = document.getElementById('registration-error');
    
    if (!studentName || !registerNumber) {
        errorDiv.classList.remove('hidden');
        errorDiv.textContent = 'Please enter both your name and registration number';
        if (!studentName) {
            document.getElementById('student-name').focus();
        } else {
            document.getElementById('register-number').focus();
        }
        return;
    }
    
    // Validate registration number format: exactly 11 alphanumeric characters
    const regNumberPattern = /^[A-Za-z0-9]{11}$/;
    if (!regNumberPattern.test(registerNumber)) {
        errorDiv.classList.remove('hidden');
        if (registerNumber.length !== 11) {
            errorDiv.textContent = `Registration number must be exactly 11 characters (current: ${registerNumber.length})`;
        } else {
            errorDiv.textContent = 'Registration number must contain only letters and numbers (no spaces or special characters)';
        }
        document.getElementById('register-number').focus();
        return;
    }
    
    // Hide error if validation passes
    errorDiv.classList.add('hidden');
    
    // Step 1: Register user in database
    registerUserInDatabase(studentName, registerNumber);
}

async function registerUserInDatabase(studentName, registerNumber) {
    try {
        // First, check if user has existing progress
        const progressResponse = await fetch(`${gameConfig.serverUrl}/api/get-progress/${registerNumber}`);
        
        if (progressResponse.ok) {
            const progressData = await progressResponse.json();
            if (progressData.success && progressData.user) {
                // User exists, check their progress
                const user = progressData.user;
                
                if (user.isCompleted) {
                    // User has completed the tournament
                    showNotification('Tournament Complete', 
                        `You have already completed the tournament with a score of ${user.currentScore}. View the leaderboard to see your ranking.`, 
                        'info', 6000);
                    
                    // Show completed status
                    const errorDiv = document.getElementById('registration-error');
                    errorDiv.innerHTML = `
                        <div style="background: var(--color-bg-3); padding: 1rem; border-radius: 8px; margin-top: 1rem;">
                            <p><strong>Tournament already completed!</strong></p>
                            <p>Score: ${user.currentScore} | Levels: ${user.completedLevels}/5</p>
                            <button onclick="viewLeaderboard()" class="btn btn--primary">View Leaderboard</button>
                        </div>
                    `;
                    errorDiv.classList.remove('hidden');
                    return;
                    
                } else if (user.hasStarted && user.currentLevel > 1) {
                    // User has partial progress, offer to resume
                    showNotification('Progress Found', 
                        `You have progress saved! Continue from Level ${user.currentLevel}.`, 
                        'info', 6000);
                    
                    const errorDiv = document.getElementById('registration-error');
                    errorDiv.innerHTML = `
                        <div style="background: var(--color-bg-2); padding: 1rem; border-radius: 8px; margin-top: 1rem;">
                            <p><strong>Previous progress found!</strong></p>
                            <p>Score: ${user.currentScore} | Level: ${user.currentLevel}/5 | Time: ${formatTime(user.timeRemaining)}</p>
                            <button onclick="resumeGame('${registerNumber}', '${studentName}')" class="btn btn--primary">Resume Game</button>
                        </div>
                    `;
                    errorDiv.classList.remove('hidden');
                    return;
                    
                } else {
                    // User registered but hasn't started or is on level 1
                    await startActualGame(studentName, registerNumber);
                    return;
                }
            }
        }
        
        // User doesn't exist, register them
        const registerResponse = await fetch(`${gameConfig.serverUrl}/api/register-user`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                registrationNumber: registerNumber,
                studentName: studentName,
                sessionId: gameState.sessionId
            })
        });

        const data = await registerResponse.json();

        if (data.success) {
            showNotification('Registration Successful', 'Starting your tournament...', 'success', 2000);
            await startActualGame(studentName, registerNumber);
        } else {
            throw new Error(data.message);
        }
        
    } catch (error) {
        console.error('Registration error:', error);
        showNotification('Registration Failed', error.message || 'Failed to register. Please try again.', 'error', 4000);
        
        const errorDiv = document.getElementById('registration-error');
        errorDiv.textContent = 'Registration failed. Please try again.';
        errorDiv.classList.remove('hidden');
    }
}

// Resume game from saved progress
async function resumeGame(registerNumber, studentName) {
    try {
        const progressResponse = await fetch(`${gameConfig.serverUrl}/api/get-progress/${registerNumber}`);
        const progressData = await progressResponse.json();
        
        if (progressData.success && progressData.user) {
            const user = progressData.user;
            
            // Restore game state
            gameState.registrationNumber = user.registrationNumber;
            gameState.studentName = user.studentName;
            gameState.score = user.currentScore;
            gameState.timeRemaining = user.timeRemaining;
            gameState.currentLevel = user.currentLevel;
            gameState.levelsCompleted = user.completedLevels;
            gameState.startTime = Date.now() - (600000 - user.timeRemaining); // Approximate start time
            gameState.isGameActive = true;
            
            // Restore analytics
            gameState.analytics = { ...gameState.analytics, ...user.analytics };
            
            // Mark completed levels
            gameState.completedLevels = [];
            Object.entries(user.levelStatuses).forEach(([levelKey, status]) => {
                const levelNum = parseInt(levelKey.replace('level', ''));
                if (status === 'completed' || status === 'skipped') {
                    gameState.completedLevels.push(levelNum);
                }
            });
            
            showNotification('Game Resumed', `Welcome back! Continuing from Level ${user.currentLevel}`, 'success', 3000);
            showScreen('game-screen');
            startTimer();
            initializeLevel(user.currentLevel);
            
        } else {
            throw new Error('Failed to load progress');
        }
    } catch (error) {
        console.error('Resume error:', error);
        showNotification('Resume Failed', 'Could not load your progress. Please try again.', 'error');
    }
}

async function startActualGame(studentName, registerNumber) {
    try {
        // Step 2: Mark game as started in database
        const gameStartTime = new Date().toISOString();
        
        const response = await fetch(`${gameConfig.serverUrl}/api/start-game`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                registrationNumber: registerNumber,
                gameStartTime: gameStartTime
            })
        });

        const result = await response.json();
        
        if (result.success) {
            // Save student name in localStorage for resume functionality
            localStorage.setItem(`student_name_${registerNumber}`, studentName);
            
            // Add registration number to URL for leaderboard tracking
            const url = new URL(window.location.href);
            url.searchParams.set('reg', registerNumber);
            window.history.replaceState({}, '', url);
            
            // Initialize game state
            gameState.registrationNumber = registerNumber;
            gameState.studentName = studentName;
            gameState.startTime = Date.now();
            gameState.isGameActive = true;
            gameState.timeRemaining = gameConfig.totalTimeLimit;
            gameState.currentLevel = 1;
            gameState.score = 0;
            gameState.levelsCompleted = 0;
            gameState.levelScores = [];
            gameState.levelPerformance = [];
            gameState.completedLevels = []; // Reset completed levels
            gameState.levelStartTimes = {}; // Reset level timing
            gameState.currentLevelStartTime = 0;
            
            // Reset analytics for new game
            gameState.analytics = {
                totalClicks: 0,
                levelSwitches: 0,
                hintsUsed: 0,
                errorsMade: 0,
                binaryPatternAttempts: 0,
                pathfindingAlgorithmLength: 0,
                firewallThreatsBlocked: 0,
                firewallSafeAllowed: 0,
                aiTrainingAccuracy: 0,
                codingChallengeSolved: 'none',
                deviceInfo: getDeviceInfo()
            };
            
            // Start the game UI
            showScreen('game-screen');
            updateLevelNavigation();
            initializeLevel(1);
            startTimer();
            
            showNotification(
                'Tournament Started!', 
                'Good luck! You have 10 minutes to complete all levels.',
                'success',
                5000
            );
            
        } else {
            showNotification(
                'Start Game Failed', 
                result.message || 'Failed to start the tournament.',
                'error'
            );
        }
        
    } catch (error) {
        console.error('Start game error:', error);
        showNotification(
            'Connection Error', 
            'Failed to start the game. Please try again.',
            'error'
        );
    }
}

function startTimer() {
    if (gameState.timer) clearInterval(gameState.timer);
    
    gameState.timer = setInterval(() => {
        if (!gameState.isGameActive) return;
        
        const elapsed = Date.now() - gameState.startTime;
        gameState.timeRemaining = Math.max(0, gameConfig.totalTimeLimit - elapsed);
        
        updateTimerDisplay();
        
        if (gameState.timeRemaining <= 0) {
            endGame();
        } else if (gameState.timeRemaining <= 60000) {
            document.getElementById('timer').classList.add('warning');
        }
    }, 100);
}

function updateTimerDisplay() {
    const minutes = Math.floor(gameState.timeRemaining / 60000);
    const seconds = Math.floor((gameState.timeRemaining % 60000) / 1000);
    document.getElementById('timer').textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

function updateScore(points) {
    gameState.score += points;
    document.getElementById('score').textContent = gameState.score;
}

function updateProgressBar() {
    const progress = (gameState.currentLevel - 1) / 5 * 100;
    document.getElementById('progress-fill').style.width = progress + '%';
}

function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(screen => {
        screen.classList.remove('active');
    });
    document.getElementById(screenId).classList.add('active');
}

function initializeLevel(levelNum) {
    gameState.currentLevel = levelNum;
    gameState.levelStartScore = gameState.score; // Track score at start of level
    gameState.currentLevelStartTime = Date.now(); // Track when level starts
    gameState.levelStartTimes[levelNum] = gameState.currentLevelStartTime;
    
    document.getElementById('current-level').textContent = levelNum;
    document.getElementById('level-title').textContent = gameConfig.levels[levelNum - 1].name;
    updateProgressBar();
    
    // Hide all level containers
    document.querySelectorAll('.level-container').forEach(container => {
        container.classList.remove('active');
    });
    
    // Show current level container
    document.getElementById(`level-${levelNum}`).classList.add('active');
    
    // Update level navigation
    updateLevelNavigation();
    
    // Initialize specific level
    switch(levelNum) {
        case 1: initializeBinaryMemory(); break;
        case 2: initializePathfinding(); break;
        case 3: initializeFirewall(); break;
        case 4: initializeAITraining(); break;
        case 5: initializeCoding(); break;
    }
}

function updateLevelNavigation() {
    const navContainer = document.getElementById('level-navigation');
    if (!navContainer) return;
    
    navContainer.innerHTML = '';
    
    for (let i = 1; i <= 5; i++) {
        const btn = document.createElement('button');
        btn.className = 'level-nav-btn';
        btn.textContent = i;
        btn.onclick = () => goToLevel(i);
        
        if (i === gameState.currentLevel) {
            btn.classList.add('active');
        }
        
        // Mark completed levels and disable them
        if (gameState.completedLevels.includes(i)) {
            btn.classList.add('completed');
            btn.title = 'Level completed - cannot be replayed';
            btn.onclick = null; // Remove click handler
        }
        
        navContainer.appendChild(btn);
    }
}

function goToLevel(levelNum) {
    if (levelNum < 1 || levelNum > 5) return;
    
    // Prevent access to completed levels
    if (gameState.completedLevels.includes(levelNum)) {
        showNotification('Already Completed', `Level ${levelNum} is already completed and cannot be replayed.`, 'info');
        return;
    }
    
    initializeLevel(levelNum);
}

// LEVEL 1: Binary Memory Pattern
function initializeBinaryMemory() {
    const grid = document.getElementById('binary-grid');
    grid.innerHTML = '';
    
    // Create 4x4 grid
    for (let i = 0; i < 16; i++) {
        const cell = document.createElement('div');
        cell.className = 'binary-cell';
        cell.dataset.index = i;
        cell.addEventListener('click', toggleBinaryCell);
        cell.title = 'Click to toggle this cell';
        grid.appendChild(cell);
    }
    
    // Remove existing event listeners
    const showBtn = document.getElementById('show-pattern');
    const submitBtn = document.getElementById('submit-pattern');
    const clearBtn = document.getElementById('clear-pattern');
    
    showBtn.replaceWith(showBtn.cloneNode(true));
    submitBtn.replaceWith(submitBtn.cloneNode(true));
    clearBtn.replaceWith(clearBtn.cloneNode(true));
    
    // Add fresh event listeners
    document.getElementById('show-pattern').addEventListener('click', showBinaryPattern);
    document.getElementById('submit-pattern').addEventListener('click', submitBinaryPattern);
    document.getElementById('clear-pattern').addEventListener('click', clearBinaryPattern);
    
    gameState.binaryPattern = generateBinaryPattern();
    gameState.userPattern = new Array(16).fill(false);
    gameState.attemptsLeft = 3;
    gameState.binaryPatternLocked = false; // Reset lock state
    updateAttemptsDisplay();
    
    // Reset button states
    document.getElementById('show-pattern').classList.remove('hidden');
    document.getElementById('submit-pattern').classList.add('hidden');
    document.getElementById('clear-pattern').classList.add('hidden');
    
    // Add instructions
    showBinaryInstructions();
}

function showBinaryInstructions() {
    // Remove existing instructions first
    const existing = document.getElementById('binary-instructions');
    if (existing) existing.remove();
    
    const instructionsDiv = document.createElement('div');
    instructionsDiv.id = 'binary-instructions';
    instructionsDiv.className = 'level-instructions';
    instructionsDiv.innerHTML = `
        <h4>How to Play:</h4>
        <ul>
            <li>🧠 <strong>Step 1:</strong> Click "Show Pattern" to see the binary pattern for 3 seconds</li>
            <li>👀 <strong>Step 2:</strong> Memorize which cells are lit up (blue)</li>
            <li>🖱️ <strong>Step 3:</strong> Click cells to recreate the pattern</li>
            <li>✅ <strong>Step 4:</strong> Click "Submit Pattern" when ready</li>
            <li>🎯 You have <strong>3 attempts</strong> to get it right!</li>
        </ul>
    `;
    
    const levelContainer = document.getElementById('level-1');
    const description = levelContainer.querySelector('.level-description');
    description.appendChild(instructionsDiv);
}

function generateBinaryPattern() {
    const pattern = [];
    for (let i = 0; i < 16; i++) {
        pattern.push(Math.random() > 0.5);
    }
    return pattern;
}

function showBinaryPattern() {
    const cells = document.querySelectorAll('.binary-cell');
    
    // Lock pattern to prevent cheating
    gameState.binaryPatternLocked = true;
    
    // Add visual indicator that clicking is disabled and use CSS pointer-events: none
    cells.forEach(cell => {
        cell.classList.add('locked');
    });
    
    // Show pattern
    gameState.binaryPattern.forEach((active, index) => {
        if (active) {
            cells[index].classList.add('active');
        }
    });
    
    // Hide pattern after 3 seconds
    setTimeout(() => {
        cells.forEach(cell => {
            cell.classList.remove('active', 'locked');
        });
        
        // Unlock pattern for user interaction
        gameState.binaryPatternLocked = false;
        
        // Enable interaction
        document.getElementById('show-pattern').classList.add('hidden');
        document.getElementById('submit-pattern').classList.remove('hidden');
        document.getElementById('clear-pattern').classList.remove('hidden');
        
        // Show instruction for user
        showNotification('Your Turn!', 'Now click the cells to recreate the pattern you saw.', 'info', 2000);
    }, 3000);
}

function toggleBinaryCell(event) {
    // Prevent cheating: don't allow clicks during pattern display
    if (gameState.binaryPatternLocked) {
        showNotification('Wait!', 'Pattern is being displayed. Wait for it to finish.', 'warning', 1500);
        return;
    }
    
    const index = parseInt(event.target.dataset.index);
    const cell = event.target;
    
    gameState.userPattern[index] = !gameState.userPattern[index];
    cell.classList.toggle('active');
}

function clearBinaryPattern() {
    gameState.userPattern = new Array(16).fill(false);
    document.querySelectorAll('.binary-cell').forEach(cell => {
        cell.classList.remove('active', 'correct', 'incorrect', 'locked');
    });
}

function submitBinaryPattern() {
    const cells = document.querySelectorAll('.binary-cell');
    let correct = true;
    
    // Track binary pattern attempt
    gameState.analytics.binaryPatternAttempts++;
    
    // Decrease attempts first (regardless of correctness)
    gameState.attemptsLeft--;
    updateAttemptsDisplay();
    
    gameState.binaryPattern.forEach((expected, index) => {
        const cell = cells[index];
        const userInput = gameState.userPattern[index];
        
        if (expected === userInput) {
            cell.classList.add('correct');
        } else {
            cell.classList.add('incorrect');
            correct = false;
        }
    });
    
    if (correct) {
        updateScore(200);
        createParticles();
        playSuccessSound();
        showNotification('Excellent!', 'Pattern memorized correctly! +200 points', 'success');
        setTimeout(() => completeLevel(100, 4 - gameState.attemptsLeft), 1500);
    } else {
        playErrorSound();
        trackError(); // Track the error
        
        if (gameState.attemptsLeft <= 0) {
            showNotification('Level Complete', '3 attempts completed! Level blocked. Moving to next level.', 'warning');
            setTimeout(() => completeLevel(0, 3), 1500);
        } else {
            showNotification('Try Again!', `Incorrect pattern! ${gameState.attemptsLeft} attempts remaining.`, 'error', 3000);
            setTimeout(() => {
                clearBinaryPattern();
                // Reset buttons for next attempt
                document.getElementById('show-pattern').classList.remove('hidden');
                document.getElementById('submit-pattern').classList.add('hidden');
                document.getElementById('clear-pattern').classList.add('hidden');
                // Reset lock state for next attempt
                gameState.binaryPatternLocked = false;
            }, 1500);
        }
    }
}

function updateAttemptsDisplay() {
    document.getElementById('attempts-left').textContent = gameState.attemptsLeft;
}

// LEVEL 2: Algorithm Pathfinding
function initializePathfinding() {
    const grid = document.getElementById('pathfinding-grid');
    grid.innerHTML = '';
    
    // Remove any existing instructions first to prevent duplicates
    const existingInstructions = document.getElementById('pathfinding-instructions');
    if (existingInstructions) {
        existingInstructions.remove();
    }
    
    // Create easier maze (0 = path, 1 = wall, 2 = end)
    gameState.maze = [
        [0,0,0,0,1,0,0,2],
        [0,1,1,0,1,0,1,0],
        [0,0,0,0,0,0,0,0],
        [1,1,1,0,1,1,1,0],
        [0,0,0,0,0,0,0,0],
        [0,1,1,1,0,1,1,1],
        [0,0,0,0,0,0,0,0],
        [1,1,1,0,0,0,1,0]
    ];
    
    gameState.robotPosition = {x: 0, y: 0, direction: 'right'};
    gameState.algorithmSequence = [];
    
    // Create grid cells with better visual indicators
    for (let y = 0; y < 8; y++) {
        for (let x = 0; x < 8; x++) {
            const cell = document.createElement('div');
            cell.className = 'path-cell';
            cell.dataset.x = x;
            cell.dataset.y = y;
            
            if (gameState.maze[y][x] === 1) {
                cell.classList.add('wall');
                cell.title = 'Wall - Robot cannot pass';
            } else if (x === 0 && y === 0) {
                cell.classList.add('start');
                cell.title = 'Start Position - Robot starts here';
            } else if (gameState.maze[y][x] === 2) {
                cell.classList.add('end');
                cell.title = 'Goal - Get the robot here!';
            } else {
                cell.title = 'Open path';
            }
            
            grid.appendChild(cell);
        }
    }
    
    // Add robot to starting position
    updateRobotDisplay();
    
    // Clear sequence area
    document.getElementById('sequence-blocks').innerHTML = '';
    
    // Add helpful instructions
    showPathfindingInstructions();
    
    // Setup drag and drop with improved implementation
    setupAlgorithmDragDrop();
    
    // Remove existing event listeners and add fresh ones
    const runBtn = document.getElementById('run-algorithm');
    const clearBtn = document.getElementById('clear-algorithm');
    
    runBtn.replaceWith(runBtn.cloneNode(true));
    clearBtn.replaceWith(clearBtn.cloneNode(true));
    
    document.getElementById('run-algorithm').addEventListener('click', runAlgorithm);
    document.getElementById('clear-algorithm').addEventListener('click', clearAlgorithm);
}

function showPathfindingInstructions() {
    const instructionsDiv = document.createElement('div');
    instructionsDiv.id = 'pathfinding-instructions';
    instructionsDiv.className = 'level-instructions';
    instructionsDiv.innerHTML = `
        <h4>🎯 Goal: Guide the robot from START to GOAL!</h4>
        <div style="background: var(--color-bg-3); padding: var(--space-12); border-radius: var(--radius-md); margin: var(--space-8) 0;">
            <p><strong>Quick Start Guide:</strong></p>
            <ol style="margin: 0; padding-left: var(--space-20);">
                <li> <strong>START</strong> = Blue square (robot begins here)</li>
                <li>🔴 <strong>GOAL</strong> = Red square (get robot here to win)</li>
                <li> <strong>WALLS</strong> = White squares (robot cannot pass through)</li>
                <li>📝 <strong>Drag blocks</strong> from left to create a path sequence</li>
                <li>▶️ <strong>Click "Run Algorithm"</strong> to test your solution</li>
            </ol>
        </div>
        <details style="margin-top: var(--space-8);">
            <summary><strong>🤖 Robot Controls (Click to expand)</strong></summary>
            <ul style="margin-top: var(--space-8);">
                <li>🔵 <strong>Forward:</strong> Moves robot one step in current direction</li>
                <li>◀️ <strong>Turn Left:</strong> Rotates robot 90° counterclockwise</li>
                <li>▶️ <strong>Turn Right:</strong> Rotates robot 90° clockwise</li>
            </ul>
            <p><strong>Current robot direction: <span id="robot-direction" style="color: var(--color-primary); font-weight: bold;">RIGHT</span></strong></p>
        </details>
        <details style="margin-top: var(--space-8);">
            <summary><strong>💡 Need help? Click for solution hint</strong></summary>
            <div style="background: var(--color-bg-2); padding: var(--space-8); border-radius: var(--radius-sm); margin-top: var(--space-8);">
                <p><strong>Sample solution:</strong> Forward → Forward → Forward → Turn Right → Forward → Turn Left → Forward</p>
                <p style="font-size: var(--font-size-sm); color: var(--color-text-secondary);">Try this if you get stuck!</p>
            </div>
        </details>
    `;
    
    const levelContainer = document.getElementById('level-2');
    const description = levelContainer.querySelector('.level-description');
    description.appendChild(instructionsDiv);
}

function setupAlgorithmDragDrop() {
    const blocks = document.querySelectorAll('#algorithm-blocks .block');
    const sequenceArea = document.getElementById('sequence-blocks');
    
    // Clear any existing event listeners by cloning elements
    blocks.forEach(block => {
        const newBlock = block.cloneNode(true);
        block.parentNode.replaceChild(newBlock, block);
    });
    
    // Setup drag events on refreshed elements
    const refreshedBlocks = document.querySelectorAll('#algorithm-blocks .block');
    refreshedBlocks.forEach(block => {
        block.draggable = true;
        block.addEventListener('dragstart', handleDragStart);
        block.addEventListener('dragend', handleDragEnd);
        
        // Add click as alternative to drag-and-drop
        block.addEventListener('click', function() {
            addBlockToSequence(block.dataset.action);
        });
    });
    
    // Setup drop events on sequence area
    sequenceArea.addEventListener('dragover', handleDragOver);
    sequenceArea.addEventListener('drop', handleDrop);
    sequenceArea.addEventListener('dragenter', handleDragEnter);
    sequenceArea.addEventListener('dragleave', handleDragLeave);
}

function handleDragStart(e) {
    e.dataTransfer.setData('text/plain', e.target.dataset.action);
    e.dataTransfer.effectAllowed = 'copy';
    e.target.style.opacity = '0.5';
}

function handleDragEnd(e) {
    e.target.style.opacity = '1';
}

function handleDragEnter(e) {
    e.preventDefault();
    e.target.classList.add('drag-over');
}

function handleDragLeave(e) {
    e.target.classList.remove('drag-over');
}

function handleDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
}

function handleDrop(e) {
    e.preventDefault();
    e.target.classList.remove('drag-over');
    const action = e.dataTransfer.getData('text/plain');
    
    if (action) {
        addBlockToSequence(action);
    }
}

function addBlockToSequence(action) {
    const sequenceArea = document.getElementById('sequence-blocks');
    
    const blockElement = document.createElement('div');
    blockElement.className = 'sequence-block';
    blockElement.textContent = getBlockText(action);
    blockElement.dataset.action = action;
    
    // Add click to remove functionality
    blockElement.addEventListener('click', function() {
        const index = Array.from(sequenceArea.children).indexOf(blockElement);
        gameState.algorithmSequence.splice(index, 1);
        blockElement.remove();
    });
    
    sequenceArea.appendChild(blockElement);
    gameState.algorithmSequence.push(action);
}

function getBlockText(action) {
    const texts = {
        'forward': '▲ Forward',
        'turnLeft': '◀ Turn Left', 
        'turnRight': '▶ Turn Right',
    };
    return texts[action] || action;
}

function runAlgorithm() {
    if (gameState.algorithmSequence.length === 0) {
        showNotification('Missing Algorithm', 'Please add some algorithm blocks first!', 'warning');
        return;
    }
    
    // Track algorithm length for analytics
    gameState.analytics.pathfindingAlgorithmLength = gameState.algorithmSequence.length;
    
    gameState.robotPosition = {x: 0, y: 0, direction: 'right'};
    updateRobotDisplay();
    executeAlgorithmStep(0);
}

function executeAlgorithmStep(stepIndex) {
    if (stepIndex >= gameState.algorithmSequence.length) {
        checkPathfindingSuccess();
        return;
    }
    
    const action = gameState.algorithmSequence[stepIndex];
    
    switch(action) {
        case 'forward':
            moveRobot();
            break;
        case 'turnLeft':
            turnRobot('left');
            break;
        case 'turnRight':
            turnRobot('right');
            break;
    }
    
    setTimeout(() => executeAlgorithmStep(stepIndex + 1), 500);
}

function moveRobot() {
    const directions = {
        'up': {x: 0, y: -1},
        'right': {x: 1, y: 0},
        'down': {x: 0, y: 1},
        'left': {x: -1, y: 0}
    };
    
    const move = directions[gameState.robotPosition.direction];
    const newX = gameState.robotPosition.x + move.x;
    const newY = gameState.robotPosition.y + move.y;
    
    // Check bounds and walls
    if (newX >= 0 && newX < 8 && newY >= 0 && newY < 8 && gameState.maze[newY][newX] !== 1) {
        gameState.robotPosition.x = newX;
        gameState.robotPosition.y = newY;
        updateRobotDisplay();
    }
}

function turnRobot(direction) {
    const directions = ['up', 'right', 'down', 'left'];
    const currentIndex = directions.indexOf(gameState.robotPosition.direction);
    
    if (direction === 'left') {
        gameState.robotPosition.direction = directions[(currentIndex + 3) % 4];
    } else {
        gameState.robotPosition.direction = directions[(currentIndex + 1) % 4];
    }
    
    // Update direction display
    const directionDisplay = document.getElementById('robot-direction');
    if (directionDisplay) {
        directionDisplay.textContent = gameState.robotPosition.direction.toUpperCase();
    }
}

function updateRobotDisplay() {
    // Remove robot from all cells
    const cells = document.querySelectorAll('.path-cell');
    cells.forEach(cell => cell.classList.remove('robot'));
    
    // Add robot to current position
    const robotIndex = gameState.robotPosition.y * 8 + gameState.robotPosition.x;
    cells[robotIndex].classList.add('robot');
    
    // Update direction indicator
    const directionSpan = document.getElementById('robot-direction');
    if (directionSpan) {
        directionSpan.textContent = gameState.robotPosition.direction.toUpperCase();
    }
}

function checkPathfindingSuccess() {
    // Find the goal position dynamically
    let goalX = -1, goalY = -1;
    for (let y = 0; y < 8; y++) {
        for (let x = 0; x < 8; x++) {
            if (gameState.maze[y][x] === 2) {
                goalX = x;
                goalY = y;
                break;
            }
        }
        if (goalX !== -1) break;
    }
    
    if (gameState.robotPosition.x === goalX && gameState.robotPosition.y === goalY) {
        updateScore(300);
        createParticles();
        playSuccessSound();
        showNotification('Mission Accomplished!', 'Robot reached the GOAL! +300 points\n\nYou successfully programmed the robot to navigate through the maze!', 'success');
        setTimeout(() => completeLevel(100, 1), 1500);
    } else {
        playErrorSound();
        showNotification('Try Again', `🤖 Robot stopped at position (${gameState.robotPosition.x + 1}, ${gameState.robotPosition.y + 1}).\n🎯 Goal is at position (${goalX + 1}, ${goalY + 1}).\n\n💡 Tip: Check if your robot is facing the right direction and adjust your algorithm sequence!`, 'error', 6000);
        // Reset robot to start for another attempt
        setTimeout(() => {
            gameState.robotPosition = {x: 0, y: 0, direction: 'right'};
            updateRobotDisplay();
            const directionDisplay = document.getElementById('robot-direction');
            if (directionDisplay) {
                directionDisplay.textContent = 'RIGHT';
            }
        }, 2000);
    }
}

function clearAlgorithm() {
    gameState.algorithmSequence = [];
    document.getElementById('sequence-blocks').innerHTML = '';
    
    // Reset robot position
    gameState.robotPosition = {x: 0, y: 0, direction: 'right'};
    updateRobotDisplay();
}

// LEVEL 3: Cybersecurity Firewall
function initializeFirewall() {
    gameState.packetsProcessed = 0;
    gameState.safeAllowed = 0;
    gameState.threatsBlocked = 0;
    gameState.totalSafe = 0;
    gameState.totalThreats = 0;
    gameState.firewallActive = false;
    
    // Clear any existing packets
    const firewallArea = document.getElementById('firewall-area');
    const existingPackets = firewallArea.querySelectorAll('.packet');
    existingPackets.forEach(packet => packet.remove());
    
    const startBtn = document.getElementById('start-firewall');
    startBtn.replaceWith(startBtn.cloneNode(true));
    document.getElementById('start-firewall').addEventListener('click', startFirewallTest);
    document.getElementById('start-firewall').style.display = 'inline-flex';
    
    updateFirewallStats();
    showFirewallInstructions();
}

function showFirewallInstructions() {
    // Remove existing instructions first
    const existing = document.getElementById('firewall-instructions');
    if (existing) existing.remove();
    
    const instructionsDiv = document.createElement('div');
    instructionsDiv.id = 'firewall-instructions';
    instructionsDiv.className = 'level-instructions';
    instructionsDiv.innerHTML = `
        <h4>Firewall Instructions:</h4>
        <ul>
            <li>🟢 <strong>Safe packets (green):</strong> Let them pass through - DO NOT click them</li>
            <li>🔴 <strong>Threat packets (red):</strong> Click to block them</li>
            <li>⏱️ Test runs for 30 seconds</li>
            <li>🎯 <strong>Goal:</strong> Block 85%+ threats AND allow 90%+ safe packets</li>
            <li>⚡ Packets move from left to right</li>
            <li>💡 NOTE: Click the threat when its on the firewall or after the firewall</li>
        </ul>
        <p><strong>Ready? Click "Start Firewall Test" to begin!</strong></p>
    `;
    
    const levelContainer = document.getElementById('level-3');
    const description = levelContainer.querySelector('.level-description');
    description.appendChild(instructionsDiv);
}

function startFirewallTest() {
    gameState.firewallActive = true;
    gameState.packetInterval = setInterval(spawnPacket, 800);
    
    // Run test for 30 seconds
    setTimeout(() => {
        clearInterval(gameState.packetInterval);
        checkFirewallSuccess();
    }, 30000);
    
    document.getElementById('start-firewall').style.display = 'none';
}

function spawnPacket() {
    if (!gameState.firewallActive) return;
    
    const packet = document.createElement('div');
    packet.className = 'packet';
    
    const isThreat = Math.random() > 0.6;
    packet.classList.add(isThreat ? 'threat' : 'safe');
    
    if (isThreat) gameState.totalThreats++;
    else gameState.totalSafe++;
    
    packet.style.top = Math.random() * 340 + 'px';
    packet.style.left = '-50px';
    
    packet.addEventListener('click', () => handlePacketClick(packet, isThreat));
    
    document.getElementById('firewall-area').appendChild(packet);
    updateFirewallStats();
    
    // Remove packet if it reaches the end
    setTimeout(() => {
        if (packet.parentNode) {
            if (!isThreat) {
                gameState.safeAllowed++;
                gameState.analytics.firewallSafeAllowed++; // Track for analytics
            }
            packet.remove();
            updateFirewallStats();
        }
    }, 3000);
}

function handlePacketClick(packet, isThreat) {
    packet.style.pointerEvents = 'none';
    
    if (isThreat) {
        gameState.threatsBlocked++;
        gameState.analytics.firewallThreatsBlocked++; // Track for analytics
        packet.classList.add('blocked');
        playBlockSound();
    } else {
        // Blocked a safe packet (mistake)
        packet.classList.add('blocked');
        trackError(); // Track the error
        playErrorSound();
    }
    
    setTimeout(() => packet.remove(), 500);
    updateFirewallStats();
}

function updateFirewallStats() {
    document.getElementById('safe-allowed').textContent = gameState.safeAllowed;
    document.getElementById('total-safe').textContent = gameState.totalSafe;
    document.getElementById('threats-blocked').textContent = gameState.threatsBlocked;
    document.getElementById('total-threats').textContent = gameState.totalThreats;
}

function checkFirewallSuccess() {
    gameState.firewallActive = false;
    
    const threatBlockRate = gameState.totalThreats > 0 ? (gameState.threatsBlocked / gameState.totalThreats) * 100 : 0;
    const safeAllowRate = gameState.totalSafe > 0 ? (gameState.safeAllowed / gameState.totalSafe) * 100 : 0;
    
    if (threatBlockRate >= 85 && safeAllowRate >= 90) {
        updateScore(400);
        createParticles();
        playSuccessSound();
        const performance = Math.round((threatBlockRate + safeAllowRate) / 2);
        setTimeout(() => completeLevel(performance, 1), 1500);
    } else {
        playErrorSound();
        showNotification('Improve Performance', `Need better performance! Threats blocked: ${Math.round(threatBlockRate)}%, Safe allowed: ${Math.round(safeAllowRate)}%`, 'warning');
        setTimeout(() => initializeFirewall(), 2000);
    }
}

// LEVEL 4: AI Training Challenge
function initializeAITraining() {
    gameState.aiScenarios = [
        {
            question: "A user enters sensitive data on an unsecured website. What should the AI recommend?",
            options: [
                "Proceed with the transaction",
                "Block the website entirely",
                "Warn about security risks and suggest alternatives",
                "Ignore the security concerns"
            ],
            correct: 2
        },
        {
            question: "An email contains suspicious links and urgent language. How should the AI classify it?",
            options: [
                "Mark as spam/phishing",
                "Forward to all contacts",
                "Reply with personal information",
                "Archive for later review"
            ],
            correct: 0
        },
        {
            question: "A network shows unusual traffic patterns at night. What should the AI do?",
            options: [
                "Ignore as normal system updates",
                "Flag for security team investigation",
                "Automatically shut down network",
                "Send alerts to all users"
            ],
            correct: 1
        },
        {
            question: "A user's password has been compromised. What is the best AI response?",
            options: [
                "Continue using the old password",
                "Just send a warning email",
                "Wait for the user to notice",
                "Force immediate password reset and enable 2FA"
            ],
            correct: 3
        },
        {
            question: "An AI detects potential data breach attempt. What should be the priority action?",
            options: [
                "Wait and monitor for more evidence",
                "Immediately alert security team and log incident",
                "Block all network traffic",
                "Send notification to all employees"
            ],
            correct: 1
        },
        {
            question: "A machine learning model shows bias in hiring decisions. How should AI ethics be applied?",
            options: [
                "Continue using the model as-is",
                "Retrain with diverse, balanced datasets",
                "Manually override all decisions",
                "Use the model only for initial screening"
            ],
            correct: 1
        },
        {
            question: "An autonomous system faces an ethical dilemma with multiple possible outcomes. What should guide the decision?",
            options: [
                "Prioritize human safety and wellbeing",
                "Choose the fastest option",
                "Select the most cost-effective solution",
                "Let humans decide later"
            ],
            correct: 0
        }
    ];
    
    gameState.aiAccuracy = 0;
    gameState.correctAnswers = 0;
    gameState.currentScenario = 0;
    
    const startBtn = document.getElementById('start-ai-training');
    startBtn.replaceWith(startBtn.cloneNode(true));
    document.getElementById('start-ai-training').addEventListener('click', startAITraining);
    document.getElementById('start-ai-training').style.display = 'inline-flex';
    
    updateAIProgress();
}

function startAITraining() {
    document.getElementById('start-ai-training').style.display = 'none';
    showNextScenario();
}

function showNextScenario() {
    if (gameState.currentScenario >= gameState.aiScenarios.length) {
        checkAITrainingSuccess();
        return;
    }
    
    const scenario = gameState.aiScenarios[gameState.currentScenario];
    document.getElementById('scenario-question').textContent = scenario.question;
    
    const optionsContainer = document.getElementById('scenario-options');
    optionsContainer.innerHTML = '';
    
    scenario.options.forEach((option, index) => {
        const button = document.createElement('button');
        button.className = 'option-btn';
        button.textContent = option;
        button.addEventListener('click', () => handleAIAnswer(index));
        optionsContainer.appendChild(button);
    });
}

function handleAIAnswer(selectedIndex) {
    const scenario = gameState.aiScenarios[gameState.currentScenario];
    const buttons = document.querySelectorAll('.option-btn');
    
    // Disable all buttons immediately
    buttons.forEach((btn, index) => {
        btn.style.pointerEvents = 'none';
        if (index === scenario.correct) {
            btn.classList.add('correct');
            // Add visual success effect for correct answer
            if (index === selectedIndex) {
                btn.style.transform = 'scale(1.05)';
                btn.style.boxShadow = '0 0 20px rgba(var(--color-success-rgb), 0.6)';
                createSuccessParticles(btn);
            }
        } else if (index === selectedIndex && index !== scenario.correct) {
            btn.classList.add('incorrect');
            // Add visual error effect for wrong answer
            btn.style.transform = 'scale(0.95)';
            btn.style.boxShadow = '0 0 15px rgba(var(--color-error-rgb), 0.6)';
        }
    });
    
    if (selectedIndex === scenario.correct) {
        gameState.correctAnswers++;
        playSuccessSound();
    } else {
        playErrorSound();
    }
    
    gameState.currentScenario++;
    gameState.aiAccuracy = (gameState.correctAnswers / gameState.currentScenario) * 100;
    updateAIProgress();
    
    setTimeout(showNextScenario, 2500);
}

function createSuccessParticles(element) {
    const rect = element.getBoundingClientRect();
    for (let i = 0; i < 8; i++) {
        const particle = document.createElement('div');
        particle.style.position = 'fixed';
        particle.style.left = (rect.left + rect.width / 2) + 'px';
        particle.style.top = (rect.top + rect.height / 2) + 'px';
        particle.style.width = '6px';
        particle.style.height = '6px';
        particle.style.background = 'rgba(var(--color-success-rgb), 1)';
        particle.style.borderRadius = '50%';
        particle.style.pointerEvents = 'none';
        particle.style.zIndex = '10000';
        particle.style.animation = `successParticle 1s ease-out forwards`;
        particle.style.animationDelay = i * 50 + 'ms';
        
        document.body.appendChild(particle);
        
        setTimeout(() => {
            if (particle.parentNode) {
                particle.parentNode.removeChild(particle);
            }
        }, 1200);
    }
}

function updateAIProgress() {
    document.getElementById('ai-accuracy').textContent = Math.round(gameState.aiAccuracy);
    document.getElementById('ai-progress-fill').style.width = gameState.aiAccuracy + '%';
    
    // Add pulsing effect to progress bar when accuracy changes
    const progressFill = document.getElementById('ai-progress-fill');
    progressFill.style.animation = 'none';
    setTimeout(() => {
        progressFill.style.animation = 'progressPulse 0.6s ease-out';
    }, 10);
}

function checkAITrainingSuccess() {
    // Calculate score based on accuracy (no retry allowed)
    let scoreAwarded = 0;
    
    if (gameState.aiAccuracy >= 90) {
        scoreAwarded = 600; // Perfect/Excellent
    } else if (gameState.aiAccuracy >= 80) {
        scoreAwarded = 500; // Very Good
    } else if (gameState.aiAccuracy >= 70) {
        scoreAwarded = 400; // Good
    } else if (gameState.aiAccuracy >= 60) {
        scoreAwarded = 300; // Fair
    } else if (gameState.aiAccuracy >= 50) {
        scoreAwarded = 200; // Poor
    } else {
        scoreAwarded = 100; // Very Poor
    }
    
    updateScore(scoreAwarded);
    
    if (gameState.aiAccuracy >= 50) {
        createParticles();
        playSuccessSound();
        
        let performanceMessage = "";
        if (gameState.aiAccuracy >= 90) performanceMessage = "🏆 Excellent AI Training! Perfect accuracy!";
        else if (gameState.aiAccuracy >= 80) performanceMessage = "🌟 Very Good AI Training! Great job!";
        else if (gameState.aiAccuracy >= 70) performanceMessage = "👍 Good AI Training! Well done!";
        else if (gameState.aiAccuracy >= 60) performanceMessage = "✅ Fair AI Training! Acceptable performance!";
        else performanceMessage = "📊 AI Training completed. Moving forward!";
        
        showNotification('AI Training Complete!', `${performanceMessage}\nAccuracy: ${Math.round(gameState.aiAccuracy)}% | Score: +${scoreAwarded} points`, 'success');
        setTimeout(() => {
            gameState.analytics.aiTrainingAccuracy = gameState.aiAccuracy; // Track for analytics
            completeLevel(gameState.aiAccuracy, 1);
        }, 1500);
    } else {
        playErrorSound();
        showNotification('AI Training Complete', `⚠️ AI Training completed with low accuracy!\nAccuracy: ${Math.round(gameState.aiAccuracy)}% | Score: +${scoreAwarded} points\nMoving to next level.`, 'warning');
        setTimeout(() => {
            gameState.analytics.aiTrainingAccuracy = gameState.aiAccuracy; // Track for analytics
            completeLevel(gameState.aiAccuracy, 1);
        }, 1500);
    }
}

// LEVEL 5: Real-time Coding Duel
function initializeCoding() {
    // Define multiple algorithm challenges
    const algorithmChallenges = [
        {
            title: "Bubble Sort Algorithm",
            description: "Sort an array by comparing adjacent elements",
            solution: [
                "for i in range(len(arr)):", 
                "if arr[i] > arr[i+1]:",
                "swap(arr[i], arr[i+1])",
                "return arr"
            ],
            blocks: [
                "swap(arr[i], arr[i+1])", // Shuffled
                "for i in range(len(arr)):", // Shuffled
                "if arr[i] > arr[i+1]:", // Shuffled
                "return arr", // Shuffled
                "while condition:", // Remains irrelevant
                "if x > y:" // Remains irrelevant
            ]
        },
        {
            title: "Linear Search Algorithm",
            description: "Find an element in an array sequentially",
            solution: [
                "for i in range(len(arr)):", 
                "if arr[i] == target:",
                "return i",
                "return -1"
            ],
            blocks: [
                "return i", // Shuffled
                "while i < len(arr):", // Irrelevant, should be removed
                "for i in range(len(arr)):", // Shuffled
                "return -1", // Shuffled
                "if arr[i] != target:", // Irrelevant, should be removed
                "if arr[i] == target:" // Shuffled
            ]
        },
        {
            title: "Factorial Calculation",
            description: "Calculate factorial of a number",
            solution: [
                "if n <= 1:", 
                "return 1", 
                "return n * factorial(n-1)"
            ],
            blocks: [
                "return n * factorial(n-1)", // Shuffled
                "return 1", // Shuffled
                "if n <= 1:", // Shuffled
                "for i in range(n):", // Irrelevant, should be removed
                "while n > 0:", // Irrelevant, should be removed
                "if n == 0:" // Irrelevant, should be removed
            ]
        },
        {
            title: "Sum of Array",
            description: "Calculate the sum of all elements in an array",
            solution: [
                "total = 0", 
                "for num in arr:", 
                "total += num", 
                "return total"
            ],
            blocks: [
                "return total", // Shuffled
                "for num in arr:", // Shuffled
                "if num > 0:", // Irrelevant
                "total = 0", // Shuffled
                "total += num", // Shuffled
                "while arr:" // Irrelevant
            ]
        },
        {
            title: "Find Maximum Element",
            description: "Find the largest element in an array",
            solution: [
                "max_val = arr[0]",
                "for num in arr:", 
                "if num > max_val:", 
                "max_val = num",
                "return max_val"
            ],
            blocks: [
                "return max_val", // Shuffled
                "max_val = arr[0]", // Shuffled
                "if num > max_val:", // Shuffled
                "for num in arr:", // Shuffled
                "max_val = num", // Shuffled
                "while arr:" // Irrelevant
            ]
        },
        {
            title: "Count Even Numbers",
            description: "Count how many even numbers are in an array",
            solution: [
                "count = 0",
                "for num in arr:", 
                "if num % 2 == 0:", 
                "count += 1", 
                "return count"
            ],
            blocks: [
                "return count", // Shuffled
                "count += 1", // Shuffled
                "if num % 2 == 0:", // Shuffled
                "count = 0", // Shuffled
                "for num in arr:", // Shuffled
                "if num % 2 == 1:" // Irrelevant
            ]
        }
    ];

    
    // Randomly select one challenge
    const randomIndex = Math.floor(Math.random() * algorithmChallenges.length);
    gameState.codingChallenge = algorithmChallenges[randomIndex];
    
    console.log('Selected coding challenge:', gameState.codingChallenge.title); // Debug log
    
    gameState.userCode = [];
    
    document.getElementById('coding-challenge-title').textContent = gameState.codingChallenge.title;
    document.getElementById('code-lines').innerHTML = '';
    
    // Update the HTML blocks with the specific challenge blocks
    const codeBlocksContainer = document.getElementById('code-blocks');
    codeBlocksContainer.innerHTML = '';
    
    console.log('Creating blocks for challenge:', gameState.codingChallenge.blocks); // Debug log
    
    gameState.codingChallenge.blocks.forEach((blockCode, index) => {
        const blockElement = document.createElement('div');
        blockElement.className = 'code-block';
        blockElement.dataset.code = blockCode;
        blockElement.textContent = blockCode;
        blockElement.style.display = 'block'; // Ensure visibility
        codeBlocksContainer.appendChild(blockElement);
        console.log(`Created block ${index}:`, blockCode); // Debug log
    });
    
    console.log('Code blocks container has', codeBlocksContainer.children.length, 'children'); // Debug log
    
    setupCodingDragDrop();
    
    const runBtn = document.getElementById('run-code');
    const clearBtn = document.getElementById('clear-code');
    
    runBtn.replaceWith(runBtn.cloneNode(true));
    clearBtn.replaceWith(clearBtn.cloneNode(true));
    
    document.getElementById('run-code').addEventListener('click', executeCode);
    document.getElementById('clear-code').addEventListener('click', clearCode);
}

function setupCodingDragDrop() {
    const codeBlocksContainer = document.getElementById('code-blocks');
    const blocks = document.querySelectorAll('#code-blocks .code-block');
    const editor = document.getElementById('code-lines');
    
    console.log('Setting up drag and drop for', blocks.length, 'blocks'); // Debug log
    
    // Make sure blocks are visible and functional
    blocks.forEach((block, index) => {
        console.log(`Setting up block ${index}:`, block.textContent); // Debug log
        
        // Set up draggable properties
        block.draggable = true;
        block.addEventListener('dragstart', handleCodeDragStart);
        block.addEventListener('dragend', function(e) {
            e.target.style.opacity = '1';
        });
        
        // Add click as alternative to drag
        block.addEventListener('click', function() {
            console.log('Block clicked:', block.dataset.code); // Debug log
            addCodeLine(block.dataset.code);
        });
        
        // Add visual feedback
        block.style.cursor = 'grab';
        block.addEventListener('mousedown', function() {
            this.style.cursor = 'grabbing';
        });
        block.addEventListener('mouseup', function() {
            this.style.cursor = 'grab';
        });
        block.addEventListener('mouseleave', function() {
            this.style.cursor = 'grab';
        });
    });
    
    // Set up drop zone
    editor.addEventListener('dragover', function(e) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'copy';
    });
    editor.addEventListener('drop', handleCodeDrop);
    editor.addEventListener('dragenter', function(e) {
        e.preventDefault();
        editor.classList.add('drag-over');
    });
    editor.addEventListener('dragleave', function(e) {
        e.preventDefault();
        editor.classList.remove('drag-over');
    });
    
    console.log('Drag and drop setup complete'); // Debug log
}

function handleCodeDragStart(e) {
    e.dataTransfer.setData('text/plain', e.target.dataset.code);
    e.dataTransfer.effectAllowed = 'copy';
    e.target.style.opacity = '0.5';
}

function handleCodeDrop(e) {
    e.preventDefault();
    const code = e.dataTransfer.getData('text/plain');
    
    console.log('Code dropped:', code); // Debug log
    
    if (code) {
        addCodeLine(code);
    }
    
    // Reset visual feedback
    const editor = document.getElementById('code-lines');
    editor.classList.remove('drag-over');
    
    // Reset opacity of dragged elements
    const blocks = document.querySelectorAll('#code-blocks .code-block');
    blocks.forEach(block => {
        block.style.opacity = '1';
    });
}

function addCodeLine(code) {
    const editor = document.getElementById('code-lines');
    
    console.log('Adding code line:', code); // Debug log
    
    const codeLine = document.createElement('div');
    codeLine.className = 'code-line';
    codeLine.textContent = code;
    
    // Add click to remove functionality
    codeLine.addEventListener('click', function() {
        const index = Array.from(editor.children).indexOf(codeLine);
        gameState.userCode.splice(index, 1);
        codeLine.remove();
        console.log('Code line removed:', code); // Debug log
    });
    
    editor.appendChild(codeLine);
    gameState.userCode.push(code);
    
    console.log('Current user code:', gameState.userCode); // Debug log
}

function executeCode() {
    const correctSolution = gameState.codingChallenge.solution;
    const userSolution = gameState.userCode;
    
    let isCorrect = userSolution.length === correctSolution.length;
    
    if (isCorrect) {
        for (let i = 0; i < correctSolution.length; i++) {
            if (userSolution[i] !== correctSolution[i]) {
                isCorrect = false;
                break;
            }
        }
    }
    
    if (isCorrect) {
        updateScore(600);
        createParticles();
        playSuccessSound();
        gameState.analytics.codingChallengeSolved = gameState.codingChallenge.title; // Track which challenge was solved
        showNotification('Perfect Solution!', 'Algorithm completed correctly! +600 points', 'success');
        setTimeout(() => {
            completeLevel(100, 1);
            completeGame();
        }, 1500);
    } else {
        playErrorSound();
        trackError(); // Track the error
        showNotification('Try Again', 'Algorithm incorrect. Try rearranging the code blocks!', 'error');
    }
}

function visualizeCodeExecution() {
    // Function removed - no longer showing expected solutions
}

function clearCode() {
    gameState.userCode = [];
    document.getElementById('code-lines').innerHTML = '';
}

// Game Flow Functions
// Track level completion with performance data
function completeLevel(performance = 100, attempts = 1) {
    // Calculate time spent on this level
    const levelEndTime = Date.now();
    const timeSpent = gameState.currentLevelStartTime ? levelEndTime - gameState.currentLevelStartTime : 0;
    
    // Store performance data for this level
    gameState.levelPerformance.push({
        level: gameState.currentLevel,
        performance: performance, // 0-100 percentage
        attempts: attempts,
        score: gameState.score - gameState.levelStartScore,
        timeSpent: timeSpent, // Time spent on this level in milliseconds
        completed: performance > 0, // True if level was completed, false if skipped
        startTime: gameState.levelStartTimes[gameState.currentLevel],
        endTime: levelEndTime
    });
    
    // Save progress to server immediately
    saveLevelProgressToServer(gameState.currentLevel, performance > 0 ? 'completed' : 'skipped', timeSpent);
    
    nextLevel();
}

// Save individual level progress to server
async function saveLevelProgressToServer(levelNumber, levelStatus, levelTime) {
    try {
        const response = await fetch(`${gameConfig.serverUrl}/api/update-level-progress`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                registrationNumber: gameState.registrationNumber,
                levelNumber: levelNumber,
                levelStatus: levelStatus, // 'completed', 'skipped'
                levelScore: gameState.score - gameState.levelStartScore,
                levelTime: levelTime,
                currentTotalScore: gameState.score,
                timeRemaining: gameState.timeRemaining,
                analytics: gameState.analytics
            })
        });

        const data = await response.json();
        
        if (data.success) {
            console.log(`Level ${levelNumber} progress saved: ${levelStatus}`);
        } else {
            console.error('Failed to save level progress:', data.message);
            // Don't show error to user as this shouldn't interrupt gameplay
        }
        
    } catch (error) {
        console.error('Error saving level progress:', error);
        // Continue gameplay even if save fails
    }
}

function nextLevel() {
    // Mark current level as completed (avoid duplicates)
    if (!gameState.completedLevels.includes(gameState.currentLevel)) {
        gameState.completedLevels.push(gameState.currentLevel);
    }
    
    // Calculate score earned for this level only
    const levelScore = gameState.score - gameState.levelStartScore;
    gameState.levelScores.push(levelScore);
    
    // Only increment levelsCompleted if the level was actually completed (not skipped)
    const currentLevelPerformance = gameState.levelPerformance[gameState.levelPerformance.length - 1];
    if (currentLevelPerformance && currentLevelPerformance.completed) {
        gameState.levelsCompleted++;
    }
    
    if (gameState.currentLevel >= 5) {
        completeGame();
    } else {
        gameState.currentLevel++;
        initializeLevel(gameState.currentLevel);
    }
}

function completeGame() {
    gameState.isGameActive = false;
    clearInterval(gameState.timer);
    
    // Submit score to server before showing results
    submitScoreToServer().then(() => {
        showResults();
    }).catch((error) => {
        console.error('Error submitting score:', error);
        showNotification('Score Submission', 'Unable to save your score to the leaderboard. Please check your connection.', 'warning');
        showResults();
    });
}

function endGame() {
    gameState.isGameActive = false;
    clearInterval(gameState.timer);
    
    // Submit score to server before showing results
    submitScoreToServer().then(() => {
        showResults();
    }).catch((error) => {
        console.error('Error submitting score:', error);
        showNotification('Score Submission', 'Unable to save your score to the leaderboard. Please check your connection.', 'warning');
        showResults();
    });
}

// Score Submission Functions
async function submitScoreToServer() {
    // Calculate accuracy rate
    const totalAttempts = gameState.levelPerformance.reduce((sum, level) => sum + (level.attempts || 1), 0);
    const correctAttempts = gameState.levelPerformance.filter(level => level.completed).length;
    const accuracyRate = totalAttempts > 0 ? (correctAttempts / totalAttempts) * 100 : 0;

    // Calculate total time taken
    const gameEndTime = Date.now();
    const totalTimeTaken = gameState.startTime ? gameEndTime - gameState.startTime : gameConfig.totalTimeLimit - gameState.timeRemaining;

    const scoreData = {
        registrationNumber: gameState.registrationNumber,
        studentName: gameState.studentName,
        finalScore: gameState.score,
        levelsCompleted: gameState.levelsCompleted,
        accuracyRate: Math.round(accuracyRate * 100) / 100, // Round to 2 decimal places
        timeRemaining: gameState.timeRemaining,
        levelBreakdown: gameState.levelPerformance,
        sessionId: gameState.sessionId,
        gameStartTime: gameState.startTime ? new Date(gameState.startTime).toISOString() : null,
        gameEndTime: new Date(gameEndTime).toISOString(),
        totalTimeTaken: totalTimeTaken,
        
        // Include detailed analytics
        analytics: gameState.analytics
    };

    try {
        const response = await fetch(`${gameConfig.serverUrl}/api/submit-score`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(scoreData)
        });

        const result = await response.json();
        
        if (result.success) {
            showNotification('Score Submitted!', 'Your score has been saved to the leaderboard successfully!', 'success');
            return result;
        } else {
            throw new Error(result.message || 'Failed to submit score');
        }
    } catch (error) {
        console.error('Score submission error:', error);
        throw error;
    }
}

async function getStudentRank() {
    try {
        const response = await fetch(`${gameConfig.serverUrl}/api/rank/${gameState.registrationNumber}`);
        const result = await response.json();
        
        if (result.success) {
            return result.student.rank;
        }
    } catch (error) {
        console.error('Error fetching rank:', error);
    }
    return null;
}

function showResults() {
    showScreen('results-screen');
    
    // Calculate final statistics
    const finalScore = gameState.score;
    const timeUsed = gameConfig.totalTimeLimit - gameState.timeRemaining;
    
    // Calculate overall accuracy based on actual performance in each level
    let totalPerformance = 0;
    if (gameState.levelPerformance.length > 0) {
        totalPerformance = gameState.levelPerformance.reduce((sum, level) => sum + level.performance, 0);
        totalPerformance = Math.round(totalPerformance / gameState.levelPerformance.length);
    }
    
    // Display registration number
    document.getElementById('final-registration').textContent = gameState.registrationNumber;
    
    // Animate score count-up
    animateValue('final-score', 0, finalScore, 2000);
    
    document.getElementById('levels-completed').textContent = gameState.levelsCompleted;
    document.getElementById('time-remaining').textContent = formatTime(gameState.timeRemaining);
    document.getElementById('accuracy-rate').textContent = totalPerformance + '%';
    
    // Show level breakdown
    showLevelBreakdown();
    
    // Try to get and display rank
    getStudentRank().then(rank => {
        if (rank) {
            addRankDisplay(rank);
        }
    });
    
    // Add leaderboard button if not already present
    addLeaderboardButton();
}

function addRankDisplay(rank) {
    const resultsHeader = document.querySelector('.results-header');
    let rankDisplay = document.getElementById('rank-display');
    
    if (!rankDisplay) {
        rankDisplay = document.createElement('div');
        rankDisplay.id = 'rank-display';
        rankDisplay.className = 'rank-display';
        rankDisplay.innerHTML = `
            <div class="rank-badge-large">
                <div class="rank-number">#${rank}</div>
                <div class="rank-label">Your Rank</div>
            </div>
        `;
        resultsHeader.appendChild(rankDisplay);
    } else {
        rankDisplay.querySelector('.rank-number').textContent = `#${rank}`;
    }
}

function addLeaderboardButton() {
    const resultsActions = document.querySelector('.results-actions');
    let leaderboardBtn = document.getElementById('leaderboard-btn');
    
    if (!leaderboardBtn) {
        leaderboardBtn = document.createElement('button');
        leaderboardBtn.id = 'leaderboard-btn';
        leaderboardBtn.className = 'btn btn--secondary btn--lg';
        leaderboardBtn.innerHTML = '📊 View Leaderboard';
        leaderboardBtn.addEventListener('click', () => {
            window.open('leaderboard.html', '_blank');
        });
        
        // Insert before share button
        const shareBtn = document.getElementById('share-btn');
        resultsActions.insertBefore(leaderboardBtn, shareBtn);
    }
}

function showLevelBreakdown() {
    const container = document.getElementById('level-breakdown');
    container.innerHTML = '';
    
    gameState.levelPerformance.forEach((levelData, index) => {
        const levelConfig = gameConfig.levels[levelData.level - 1];
        const levelResult = document.createElement('div');
        levelResult.className = 'level-result';
        
        let statusIcon = '';
        let statusText = '';
        if (levelData.performance === 0 && levelData.attempts === 0) {
            statusIcon = '⏭️';
            statusText = 'Skipped';
        } else if (levelData.performance >= 90) {
            statusIcon = '🏆';
            statusText = 'Excellent';
        } else if (levelData.performance >= 70) {
            statusIcon = '⭐';
            statusText = 'Good';
        } else if (levelData.performance >= 50) {
            statusIcon = '✅';
            statusText = 'Completed';
        } else {
            statusIcon = '❌';
            statusText = 'Poor';
        }
        
        levelResult.innerHTML = `
            <div class="level-name">
                ${statusIcon} Level ${levelData.level}: ${levelConfig.name}
                <small style="display: block; color: var(--color-text-secondary); font-size: var(--font-size-xs);">
                    ${statusText} • ${levelData.performance}% accuracy
                </small>
            </div>
            <span class="level-score">${levelData.score} pts</span>
        `;
        container.appendChild(levelResult);
    });
}

function viewLeaderboard() {
    // Navigate to leaderboard with registration number preserved in URL
    const regNumber = gameState.registrationNumber;
    if (regNumber) {
        window.open(`./leaderboard.html?reg=${encodeURIComponent(regNumber)}`, '_blank');
    } else {
        window.open('./leaderboard.html', '_blank');
    }
}

function restartGame() {
    gameState = {
        currentLevel: 1,
        score: 0,
        startTime: 0,
        timeRemaining: gameConfig.totalTimeLimit,
        levelsCompleted: 0,
        levelScores: [],
        levelStartScore: 0,
        completedLevels: [],
        isGameActive: false,
        timer: null,
        registrationNumber: '',
        studentName: '',
        levelPerformance: [],
        levelStartTimes: {},
        currentLevelStartTime: 0,
        sessionId: generateSessionId(),
        
        // Reset analytics
        analytics: {
            totalClicks: 0,
            levelSwitches: 0,
            hintsUsed: 0,
            errorsMade: 0,
            binaryPatternAttempts: 0,
            pathfindingAlgorithmLength: 0,
            firewallThreatsBlocked: 0,
            firewallSafeAllowed: 0,
            aiTrainingAccuracy: 0,
            codingChallengeSolved: 'none',
            deviceInfo: getDeviceInfo()
        }
    };
    
    // Clear registration form
    document.getElementById('register-number').value = '';
    document.getElementById('student-name').value = '';
    document.getElementById('registration-error').classList.add('hidden');
    
    showScreen('welcome-screen');
}

function shareResults() {
    const leaderboardUrl = `${window.location.origin}/leaderboard.html`;
    const text = `🏆 IEEE Computer Society Tournament Results 🏆
    
Student: ${gameState.studentName}
Registration: ${gameState.registrationNumber}
Final Score: ${gameState.score} points
Levels Completed: ${gameState.levelsCompleted}/5
Time Remaining: ${formatTime(gameState.timeRemaining)}

🔗 View Live Leaderboard: ${leaderboardUrl}
#IEEETournament #ComputerScience`;
    
    if (navigator.share) {
        navigator.share({ 
            title: 'IEEE Tournament Results',
            text: text,
            url: leaderboardUrl
        });
    } else {
        navigator.clipboard.writeText(text).then(() => {
            showNotification('Success', 'Results copied to clipboard! Share with your friends!', 'success', 4000);
        }).catch(() => {
            showNotification('Share Results', text, 'info', 10000);
        });
    }
}

// Generate resume URL for users with partial progress
function generateResumeUrl(registrationNumber) {
    const baseUrl = window.location.origin + window.location.pathname;
    return `${baseUrl}?reg=${registrationNumber}&resume=true`;
}

// Utility Functions
function formatTime(milliseconds) {
    const minutes = Math.floor(milliseconds / 60000);
    const seconds = Math.floor((milliseconds % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

function animateValue(elementId, start, end, duration) {
    const element = document.getElementById(elementId);
    const startTime = performance.now();
    
    function update() {
        const currentTime = performance.now();
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        const current = Math.floor(start + (end - start) * progress);
        element.textContent = current;
        
        if (progress < 1) {
            requestAnimationFrame(update);
        }
    }
    
    requestAnimationFrame(update);
}

// Visual Effects
function createParticles() {
    const container = document.getElementById('particles-container');
    
    for (let i = 0; i < 20; i++) {
        const particle = document.createElement('div');
        particle.className = 'particle';
        particle.style.left = Math.random() * window.innerWidth + 'px';
        particle.style.top = Math.random() * window.innerHeight + 'px';
        particle.style.background = ['#0066CC', '#00CC66', '#FF6B35'][Math.floor(Math.random() * 3)];
        
        container.appendChild(particle);
        
        setTimeout(() => particle.remove(), 3000);
    }
}

// Notification System
function showNotification(title, message, type = 'info', duration = 5000) {
    const container = document.getElementById('notification-container');
    
    const notification = document.createElement('div');
    notification.className = `notification notification--${type}`;
    
    const iconMap = {
        success: '🎉',
        error: '❌',
        warning: '⚠️',
        info: 'ℹ️'
    };
    
    notification.innerHTML = `
        <div class="notification-icon">${iconMap[type]}</div>
        <div class="notification-content">
            <div class="notification-title">${title}</div>
            <div class="notification-message">${message}</div>
        </div>
        <button class="notification-close" onclick="this.parentElement.remove()">×</button>
    `;
    
    container.appendChild(notification);
    
    // Trigger animation
    setTimeout(() => notification.classList.add('show'), 100);
    
    // Auto remove after duration
    if (duration > 0) {
        setTimeout(() => {
            if (notification.parentElement) {
                notification.classList.remove('show');
                setTimeout(() => {
                    if (notification.parentElement) {
                        notification.remove();
                    }
                }, 300);
            }
        }, duration);
    }
    
    return notification;
}

// Audio Functions (using Web Audio API)
function createAudioContext() {
    if (!gameState.audioContext) {
        try {
            gameState.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        } catch (e) {
            console.log('Audio context not available');
            return null;
        }
    }
    return gameState.audioContext;
}

function playSuccessSound() {
    const audioContext = createAudioContext();
    if (!audioContext) return;
    
    try {
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.setValueAtTime(523.25, audioContext.currentTime); // C5
        oscillator.frequency.setValueAtTime(659.25, audioContext.currentTime + 0.1); // E5
        oscillator.frequency.setValueAtTime(783.99, audioContext.currentTime + 0.2); // G5
        
        gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.3);
    } catch (e) {
        console.log('Audio playback failed');
    }
}

function playErrorSound() {
    const audioContext = createAudioContext();
    if (!audioContext) return;
    
    try {
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.setValueAtTime(200, audioContext.currentTime);
        oscillator.frequency.setValueAtTime(150, audioContext.currentTime + 0.1);
        
        gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.2);
    } catch (e) {
        console.log('Audio playback failed');
    }
}

function playBlockSound() {
    const audioContext = createAudioContext();
    if (!audioContext) return;
    
    try {
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
        oscillator.type = 'square';
        
        gainNode.gain.setValueAtTime(0.05, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.1);
    } catch (e) {
        console.log('Audio playback failed');
    }
}