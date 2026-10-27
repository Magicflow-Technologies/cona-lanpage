module.exports = {
  apps: [
    {
      name: 'cona-campana',
      script: 'dist/server.js',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
      env: {
        PORT: 3095,
        NODE_ENV: 'production'
      }
    }
  ]
};
