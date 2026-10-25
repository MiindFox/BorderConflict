const { Client } = require("ssh2");
const conn = new Client();

const commands = [
  "echo '=== RUNNING CERTBOT FOR BORDERCONFLICT.CLOUD ==='",
  "echo 'Loic898696+8' | sudo -S certbot --nginx -d borderconflict.cloud -d www.borderconflict.cloud --non-interactive --agree-tos --register-unsafely-without-email --redirect || true",
  "echo '=== CERTBOT FINISHED ==='",
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
