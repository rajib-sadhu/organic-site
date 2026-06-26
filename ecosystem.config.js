// PM2 process config for the Node.js shared server.
// Deploy flow:
//   npm ci && npm run build && npx prisma migrate deploy
//   pm2 start ecosystem.config.js   (first time)
//   pm2 reload organic-site         (subsequent deploys, zero-downtime)
module.exports = {
  apps: [
    {
      name: "organic-site",
      script: "node_modules/next/dist/bin/next",
      args: "start",
      cwd: __dirname,
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      max_memory_restart: "512M",
      env: {
        NODE_ENV: "production",
        PORT: 3000,
      },
      error_file: "logs/pm2-error.log",
      out_file: "logs/pm2-out.log",
      time: true,
    },
  ],
};
