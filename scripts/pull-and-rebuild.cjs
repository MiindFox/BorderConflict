const { Client } = require("ssh2");
const conn = new Client();

const commands = [
  'echo "=== PULLING LATEST CODE ON VPS ==="',
  "cd /home/ubuntu/BorderConflict",
  "git pull origin main",
  'echo "=== REBUILDING ASSETS ==="',
  "npm run build-prod",
  'echo "=== RESTARTING PM2 ==="',
  "pm2 restart borderconflict",
  "sleep 3",
  "pm2 status",
  'echo "=== DEPLOY COMPLETE ==="',
].join("\n");

conn
  .on("ready", () => {
    console.log("Connected to VPS! Pulling updates and rebuilding...");
    conn.shell((err, stream) => {
      if (err) throw err;
      stream.on("close", (code) => {
        console.log("Update finished with code:", code);
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
