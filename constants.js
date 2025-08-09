// Configuration constants for the IEEE Tournament application
const CONFIG = {
    // Backend API server URL
    API_BASE_URL: 'https://ieee-cs-game-backend.612151820.xyz',
    
    // API endpoints
    ENDPOINTS: {
        HEALTH: '/api/health',
        STATS: '/api/stats',
        LEADERBOARD: '/api/leaderboard',
        REGISTER_USER: '/api/register-user',
        START_GAME: '/api/start-game',
        UPDATE_LEVEL_PROGRESS: '/api/update-level-progress',
        SUBMIT_SCORE: '/api/submit-score',
        GET_PROGRESS: '/api/get-progress',
        CHECK_REGISTRATION: '/api/check-registration',
        RANK: '/api/rank',
        ADMIN: {
            BACKUP: '/api/admin/backup',
            CLEAR_STUDENT: '/api/admin/clear-student',
            CLEAR_ALL: '/api/admin/clear-all'
        }
    },
    
    // Admin settings
    ADMIN_KEY: 'IEEE2025ADMIN'
};

// Helper function to build full API URLs
function getApiUrl(endpoint) {
    return CONFIG.API_BASE_URL + endpoint;
}

// Export for both browser and Node.js environments
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CONFIG;
} else if (typeof window !== 'undefined') {
    window.CONFIG = CONFIG;
    window.getApiUrl = getApiUrl;
}
