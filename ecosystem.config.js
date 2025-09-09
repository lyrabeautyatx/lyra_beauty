const path = require('path');

module.exports = {
  apps: [{
    name: 'lyra-beauty',
    script: './server.js',
    instances: 1,
    exec_mode: 'fork',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: './logs/app-error.log',
    out_file: './logs/app-out.log',
    log_file: './logs/app-combined.log',
    time: true,
    max_memory_restart: '200M',
    node_args: '--max_old_space_size=200'
  }]
};
