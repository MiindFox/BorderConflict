const { Client } = require("ssh2");
const conn = new Client();

const commands = [
  "echo '=== CHECKING DNS RESOLUTION ON VPS ==='",
  "dig +short borderconflict.cloud @dns103.ovh.net || true",
  "dig +short borderconflict.cloud || true",
  "echo '=== INSTALLING CERTBOT IF MISSING ==='",
  "echo 'Loic898696+8' | sudo -S apt-get update -qq",
  "echo 'Loic898696+8' | sudo -S apt-get install -y -qq certbot python3-certbot-nginx",
  "certbot --version",
  "echo '=== DONE CHECK ==='",
].join("\n");

conn
  .on("ready", () => {
    console.log("Connected to VPS! Preparing Certbot...");
    conn.shell((err, stream) => {
      if (err) throw err;
      stream.on("close", () => {
        console.log("Setup finished");
        conn.end();
      });
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
