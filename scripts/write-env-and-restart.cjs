const { Client } = require("ssh2");
const conn = new Client();

const envContent = `GAME_ENV=dev
PORT=3000
NUM_WORKERS=2
DOMAIN=localhost
GIT_COMMIT=prod-deploy
TURNSTILE_SITE_KEY=1x00000000000000000000AA
API_KEY=WARNING_DEV_API_KEY_DO_NOT_USE_IN_PRODUCTION
ADMIN_BOT_API_KEY=WARNING_DEV_ADMIN_BOT_KEY_DO_NOT_USE_IN_PRODUCTION
`;

const commands = [
  `cat << 'EOF' > /home/ubuntu/BorderConflict/.env\n${envContent}EOF`,
  "cd /home/ubuntu/BorderConflict",
  "pm2 restart borderconflict",
  "sleep 3",
  "curl -I http://127.0.0.1:3000",
  "curl -I http://46.105.28.146/",
].join("\n");

conn
  .on("ready", () => {
    conn.shell((err, stream) => {
      if (err) throw err;
      stream.on("close", () => conn.end());
      stream.on("data", (d) => process.stdout.write(d));
      stream.write(commands + "\nexit\n");
    });
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
        "diffie-hellman-group14-sha256",
      ],
    },
  });
