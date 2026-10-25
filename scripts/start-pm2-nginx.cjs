const { Client } = require("ssh2");
const conn = new Client();

const nginxConfig = `
server {
    listen 80 default_server;
    listen [::]:80 default_server;
    server_name _;

    client_max_body_size 50M;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
`;

const ecosystemConfig = `
module.exports = {
  apps: [{
    name: "borderconflict",
    cwd: "/home/ubuntu/BorderConflict",
    script: "npx",
    args: "tsx src/server/Server.ts",
    env: {
      NODE_ENV: "production",
      GAME_ENV: "dev",
      PORT: "3000",
      NUM_WORKERS: "2",
      DOMAIN: "localhost",
      TURNSTILE_SITE_KEY: "1x00000000000000000000AA",
      API_KEY: "WARNING_DEV_API_KEY_DO_NOT_USE_IN_PRODUCTION",
      ADMIN_BOT_API_KEY: "WARNING_DEV_ADMIN_BOT_KEY_DO_NOT_USE_IN_PRODUCTION"
    },
    autorestart: true,
    max_restarts: 10,
    restart_delay: 2000
  }]
};
`;

const commands = [
  "echo '=== Configuring Nginx ==='",
  `echo '${nginxConfig.trim()}' | sudo tee /etc/nginx/sites-available/default > /dev/null`,
  "echo 'Loic898696+8' | sudo -S nginx -t",
  "echo 'Loic898696+8' | sudo -S systemctl restart nginx",
  "echo '=== Configuring PM2 ==='",
  `cat << 'EOF' > /home/ubuntu/BorderConflict/ecosystem.config.cjs\n${ecosystemConfig.trim()}\nEOF`,
  "cd /home/ubuntu/BorderConflict",
  "pm2 delete borderconflict || true",
  "pm2 start ecosystem.config.cjs",
  "pm2 save",
  "echo 'Loic898696+8' | sudo -S env PATH=$PATH:/usr/bin pm2 startup systemd -u ubuntu --hp /home/ubuntu || true",
  "sleep 3",
  "pm2 status",
  "echo '=== Testing curl http://127.0.0.1:3000 ==='",
  "curl -I http://127.0.0.1:3000 || true",
  "echo '=== FINISHED CONFIGURING SERVICES ==='",
].join("\n");

conn
  .on("ready", () => {
    console.log("Connected to VPS! Configuring Nginx and PM2...");
    conn.shell((err, stream) => {
      if (err) throw err;
      stream.on("close", (code) => {
        console.log("Session finished with code:", code);
        conn.end();
      });
      stream.on("data", (d) => process.stdout.write(d));
      stream.write(commands + "\nexit\n");
    });
  })
  .on("error", (err) => {
    console.error("SSH Error:", err);
  })
  .connect({
    host: "46.105.28.146",
    port: 22,
    username: "ubuntu",
    password: "Loic898696+8",
    algorithms: {
      kex: [
        "curve25519-sha256",
        "curve25519-sha256@libssh.org",
        "ecdh-sha2-nistp256",
        "ecdh-sha2-nistp384",
        "ecdh-sha2-nistp521",
        "diffie-hellman-group-exchange-sha256",
        "diffie-hellman-group14-sha256",
      ],
    },
  });
