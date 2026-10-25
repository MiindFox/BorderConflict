const { Client } = require("ssh2");
const conn = new Client();

const commands = [
  "echo '=== 1. APT Update & Install Tools ==='",
  "echo 'Loic898696+8' | sudo -S apt-get update -y",
  "echo 'Loic898696+8' | sudo -S apt-get install -y curl git ufw nginx",
  "echo '=== 2. Node.js 22 LTS ==='",
  "curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -",
  "echo 'Loic898696+8' | sudo -S apt-get install -y nodejs",
  "node -v && npm -v",
  "echo '=== 3. PM2 ==='",
  "echo 'Loic898696+8' | sudo -S npm install -g pm2",
  "echo '=== 4. Firewall ==='",
  "echo 'Loic898696+8' | sudo -S ufw allow 22/tcp",
  "echo 'Loic898696+8' | sudo -S ufw allow 80/tcp",
  "echo 'Loic898696+8' | sudo -S ufw allow 443/tcp",
  "echo 'Loic898696+8' | sudo -S ufw --force enable",
  "echo '=== 5. Clone Repo ==='",
  "cd /home/ubuntu && rm -rf BorderConflict && git clone https://github.com/MiindFox/BorderConflict.git",
  "echo '=== 6. Install & Build ==='",
  "cd /home/ubuntu/BorderConflict && npm install && npm run build-prod",
  "echo '=== ALL DONE ==='",
].join("\n");

conn
  .on("ready", () => {
    console.log("Connected to VPS! Running installation and build...");
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
