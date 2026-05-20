// ============================================================================
// PM2 ECOSYSTEM CONFIGURATION
// Configuration for PM2 process manager
// ============================================================================

module.exports = {
  apps: [{
    // Application name
    name: 'magnific-kling',
    
    // Script to run
    script: './server.js',
    
    // Execution mode
    instances: 1,
    exec_mode: 'fork',
    
    // Auto restart configuration
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    
    // Environment variables for production
    env: {
      NODE_ENV: 'production',
      SOCKET_PATH: '/tmp/magnific-kling.sock',
      // PORT is not needed when using Unix socket, but kept for fallback
      PORT: 3001
    },
    
    // Environment variables for development (optional)
    env_development: {
      NODE_ENV: 'development',
      PORT: 3001
    },
    
    // Logging configuration
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    
    // Advanced PM2 features
    min_uptime: '10s',
    max_restarts: 10,
    restart_delay: 4000,
    
    // Kill timeout
    kill_timeout: 5000,
    
    // Listen timeout
    listen_timeout: 10000,
    
    // Graceful shutdown
    shutdown_with_message: true
  }]
};