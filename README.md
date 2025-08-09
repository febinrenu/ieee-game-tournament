# 🏆 IEEE Computer Society Tournament Challenge

A comprehensive tournament game system designed to handle 600+ concurrent students with real-time scoring and beautiful leaderboards.

## 🚀 Features

### Game Features
- **5 Progressive Levels**: Binary Memory, Pathfinding, Cybersecurity, AI Training, and Coding Challenge
- **Real-time Scoring**: Instant score calculation and submission
- **Mobile Responsive**: Optimized for all devices including smartphones and tablets
- **Performance Tracking**: Individual level performance monitoring
- **Time Management**: 10-minute tournament with live timer

### Leaderboard System
- **Live Updates**: Real-time leaderboard with 30-second auto-refresh
- **Beautiful UI**: Stunning podium display for top 3 performers
- **Detailed Statistics**: Comprehensive stats for all participants
- **Ranking System**: Dynamic ranking with visual badges
- **Performance Analytics**: Individual student performance tracking

### Technical Capabilities
- **High Concurrency**: Designed to handle 600+ simultaneous players
- **Rate Limiting**: Built-in protection against spam and abuse
- **Database Integration**: SQLite for development, easily upgradeable to PostgreSQL/MySQL
- **RESTful API**: Clean API endpoints for score management
- **Session Management**: Unique session tracking for each participant

## 📋 Prerequisites

- **Node.js** (v14.0.0 or higher)
- **npm** (comes with Node.js)
- **Web Browser** (Chrome, Firefox, Safari, Edge)

## 🛠️ Quick Setup

### Method 1: Automatic Setup (Windows)
1. Download/clone the project files
2. Run `setup.bat` as Administrator
3. Follow the on-screen instructions
4. Start the server with `npm start`

### Method 2: Manual Setup
```bash
# 1. Install dependencies
npm install

# 2. Start the server
npm start

# 3. Access the game
# Game: http://localhost:3000
# Leaderboard: http://localhost:3000/leaderboard
```

## 🎮 How to Play

### For Students
1. **Registration**: Enter your full name and registration number
2. **Tournament**: Complete 5 challenging levels within 10 minutes
3. **Scoring**: Earn points based on performance and speed
4. **Results**: View your final score and rank on the leaderboard

### For Administrators
1. **Monitor**: Real-time leaderboard shows live participant data
2. **Statistics**: View overall tournament statistics
3. **Export**: Database contains all participant data for analysis
4. **Management**: Built-in rate limiting and session management

## 📊 API Endpoints

### Score Management
- `POST /api/submit-score` - Submit tournament results
- `GET /api/leaderboard?limit=100` - Get leaderboard data
- `GET /api/rank/:registrationNumber` - Get individual student rank
- `GET /api/stats` - Get tournament statistics

### Health & Monitoring
- `GET /api/health` - Server health check
- `GET /leaderboard` - Beautiful leaderboard interface

## 🗄️ Database Schema

```sql
CREATE TABLE tournament_scores (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  registration_number TEXT UNIQUE NOT NULL,
  student_name TEXT,
  final_score INTEGER NOT NULL,
  levels_completed INTEGER NOT NULL,
  accuracy_rate REAL NOT NULL,
  time_remaining INTEGER NOT NULL,
  level_breakdown TEXT, -- JSON string
  completion_time DATETIME DEFAULT CURRENT_TIMESTAMP,
  ip_address TEXT,
  session_id TEXT
);
```

## 🔧 Configuration

### Environment Variables
- `PORT` - Server port (default: 3000)
- `NODE_ENV` - Environment (development/production)

### For High Load (600+ Users)
```javascript
// Consider these optimizations:
1. Use PM2 for process management
2. Set up load balancing with nginx
3. Upgrade to PostgreSQL or MySQL
4. Implement Redis for session storage
5. Use CDN for static assets
```

## 📱 Mobile Optimization

The game is fully optimized for mobile devices:
- **Touch-friendly**: Large buttons and touch targets
- **Responsive Layout**: Adapts to all screen sizes
- **Performance**: Optimized for mobile browsers
- **Gesture Support**: Drag-and-drop with touch fallbacks

## 🛡️ Security Features

- **Rate Limiting**: Prevents spam and abuse
- **Input Validation**: Sanitized user inputs
- **Session Tracking**: Unique session identifiers
- **IP Logging**: Track participant locations
- **SQL Injection Protection**: Parameterized queries

## 📈 Scaling for Large Events

### For 600+ Concurrent Users:

1. **Server Specifications**:
   - CPU: 4+ cores
   - RAM: 8GB+
   - Storage: SSD recommended

2. **Database Optimization**:
   ```bash
   # Upgrade to PostgreSQL
   npm install pg
   # Configure connection pooling
   ```

3. **Load Balancing**:
   ```nginx
   upstream tournament_app {
     server 127.0.0.1:3000;
     server 127.0.0.1:3001;
     server 127.0.0.1:3002;
   }
   ```

4. **Monitoring**:
   - Use PM2 for process management
   - Monitor server resources
   - Set up alerting for high load

## 🎯 Tournament Levels

1. **Binary Memory Pattern** (Level 1)
   - Memorize and reproduce 4x4 binary patterns
   - 3 attempts allowed
   - Points: Up to 400

2. **Algorithm Pathfinding** (Level 2)
   - Program robot navigation through maze
   - Drag-and-drop or click to add commands
   - Points: Up to 600

3. **Cybersecurity Firewall** (Level 3)
   - Block threats, allow safe packets
   - Real-time packet filtering
   - Points: Up to 500

4. **AI Training Challenge** (Level 4)
   - Train AI with correct responses
   - Multiple scenarios to solve
   - Points: Up to 700

5. **Real-time Coding Duel** (Level 5)
   - Complete algorithms with code blocks
   - Multiple algorithm challenges
   - Points: Up to 800

## 📞 Support & Troubleshooting

### Common Issues

**Port Already in Use**:
```bash
# Kill process on port 3000
npx kill-port 3000
# Or use different port
PORT=3001 npm start
```

**Database Locked**:
```bash
# Restart the server
npm start
```

**High Memory Usage**:
```bash
# Use PM2 for better process management
npm install -g pm2
pm2 start server.js --name tournament
```

### Performance Monitoring
```bash
# Check server status
curl http://localhost:3000/api/health

# Monitor real-time logs
pm2 logs tournament

# View participant statistics
curl http://localhost:3000/api/stats
```

## 🏆 Success Metrics

Track these key metrics during your tournament:
- Total participants
- Completion rate per level
- Average score and time
- Peak concurrent users
- Server response time

## 📝 License

MIT License - Feel free to modify and use for your IEEE events!

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

**Ready to host an amazing tournament for 600+ students!** 🎮🏆

For questions or support, contact your IEEE Computer Society technical team.
