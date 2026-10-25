const { Client } = require("ssh2");
const conn = new Client();

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
      GIT_COMMIT: "prod-deploy",
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
  `cat << 'EOF' > /home/ubuntu/BorderConflict/ecosystem.config.cjs\n${ecosystemConfig.trim()}\nEOF`,
  "cd /home/ubuntu/BorderConflict",
  "pm2 restart borderconflict --update-env",
  "sleep 3",
  "curl -I http://127.0.0.1:3000 || true",
  "curl -I http://46.105.28.146/ || true",
].join("\n");

conn
  .on("ready", () => {
    console.log("Connected! Updating PM2 ecosystem config with GIT_COMMIT...");
    conn.shell((err, stream) => {
      if (err) throw err;
      stream.on("close", (code) => {
        console.log("Finished with code:", code);
        conn.end();
      });
      stream.on("data", (d) => process.stdout.write(d));
      stream.write(commands + "\nexit\n");
    });
  })
  .on("error", (err) => console.error(err))
  .connect({
    host: "46.105.28.146",
    port: 22,
    username: "ubuntu",
    password: "Loic898696+8",
    algorithms: {
      kex: [
        "curve25519-sha256",
        "curve25519-sha256@libssh.org",
        "diffie-hellman-group14-sha256",
      ],
    },
  });
