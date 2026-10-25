const { Client } = require("ssh2");
const conn = new Client();

const commands = [
  "echo '=== UPDATING .ENV DOMAIN TO borderconflict.cloud ==='",
  "sed -i 's/DOMAIN=.*/DOMAIN=borderconflict.cloud/' /home/ubuntu/BorderConflict/.env || echo 'DOMAIN=borderconflict.cloud' >> /home/ubuntu/BorderConflict/.env",
  'sed -i \'s/"DOMAIN": ".*"/"DOMAIN": "borderconflict.cloud"/\' /home/ubuntu/BorderConflict/ecosystem.config.cjs',
  "pm2 restart borderconflict --update-env",
  "sleep 2",
  "pm2 status",
  "echo '=== ENV UPDATED ==='",
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
