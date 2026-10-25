const { Client } = require("ssh2");
const conn = new Client();

const commands = [
  "echo '=== 1. PM2 STATUS & UPTIME ==='",
  "pm2 status",
  "echo '=== 2. MASTER & WORKER PORTS LISTENING ==='",
  "ss -tulpn | grep -E '3000|3001|3002|80|443' || true",
  "echo '=== 3. NGINX STATUS ==='",
  "sudo systemctl is-active nginx",
  "echo '=== 4. TEST MASTER ROUTE (/) ==='",
  "curl -I http://127.0.0.1:3000 || true",
  "echo '=== 5. TEST WORKER ROUTES (/w0/api/game, /w1/api/game) ==='",
  "curl -s http://127.0.0.1:3001/health || curl -I http://127.0.0.1:3001 || true",
  "curl -s http://127.0.0.1:3002/health || curl -I http://127.0.0.1:3002 || true",
  "echo '=== 6. DATABASE INTEGRITY ==='",
  "ls -lh /home/ubuntu/BorderConflict/data/ || true",
  "wc -l /home/ubuntu/BorderConflict/data/accounts.json || true",
  "echo '=== 7. SSL CERTIFICATE STATUS ==='",
  "sudo certbot certificates || true",
  "echo '=== 8. CHECK RECENT PM2 LOGS FOR ERRORS ==='",
  "pm2 logs borderconflict --lines 30 --nostream || true",
  "echo '=== INTEGRITY CHECK COMPLETE ==='",
].join("\n");

conn
  .on("ready", () => {
    console.log("Connected to VPS! Running deep system integrity check...");
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
