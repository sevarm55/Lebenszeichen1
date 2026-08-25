module.exports = {
  apps: [
    {
      name: 'lebenszeichen',
      script: 'node_modules/.bin/next',
      args: 'start -p 3003',
      cwd: '/var/www/lebenszeichen',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      max_memory_restart: '600M',
      env: {
        NODE_ENV: 'production',
      },
      error_file: '/home/promax/.pm2/logs/lebenszeichen-error.log',
      out_file: '/home/promax/.pm2/logs/lebenszeichen-out.log',
      merge_logs: true,
      time: true,
    },
  ],
}
