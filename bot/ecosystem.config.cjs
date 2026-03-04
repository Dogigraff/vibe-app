/**
 * PM2 config для VIBE бота (Timeweb, VPS и т.п.)
 * Запуск: pm2 start ecosystem.config.cjs
 */
module.exports = {
  apps: [
    {
      name: "vibe-bot",
      script: "index.js",
      cwd: __dirname,
      interpreter: "node",
      env: {
        NODE_ENV: "production",
      },
      autorestart: true,
      watch: false,
    },
  ],
};
