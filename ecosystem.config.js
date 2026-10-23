// PM2 process config for the Node.js shared server.
// Deploy flow:
//   npm ci && npm run build && npx prisma migrate deploy
//   pm2 start ecosystem.config.js   (first time)
//   pm2 reload organic-site         (subsequent deploys, zero-downtime)
//   curl -fsS localhost:3000/api/health   (smoke test: 200 = DB, worker, outbox OK; 503 otherwise)
// Point an uptime monitor at https://<site>/api/health and alert on non-200.
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
