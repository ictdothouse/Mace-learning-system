module.exports = {
  apps: [
    {
      name: 'sukmalearning-system',
      script: './app.js',
      
      // Menggunakan Mod Kluster PM2 untuk membahagikan beban kerja ke atas 2 vCPU
      instances: 2,
      exec_mode: 'cluster',
      
      // Auto-restart jika aplikasi crash
      watch: false,
      max_memory_restart: '500M', // Menghalang kebocoran memori (memory leaks)
      
      // Environment variables
      env: {
        NODE_ENV: 'development',
        PORT: 3000
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3000
      },
      
      // Log files configuration
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      error_file: './logs/pm2-error.log',
      out_file: './logs/pm2-out.log',
      merge_logs: true, // Gabungkan log dari semua kluster
      
      // Strategi restart
      autorestart: true,
      restart_delay: 4000, // Tunggu 4 saat sebelum restart semula jika crash berkelanjutan
      max_restarts: 10
    }
  ]
};
