const { Client } = require("ssh2");

const conn = new Client();
conn
  .on("ready", () => {
    const payload = JSON.stringify({
      bundleId: "bundle_recrue",
      email: "test@borderconflict.cloud",
    });
    const cmd = `curl -s -X POST http://127.0.0.1:3000/api/stripe/create-checkout-session -H "Content-Type: application/json" -d '${payload}'`;
    conn.exec(cmd, (err, stream) => {
      if (err) throw err;
      stream.on("data", (d) => process.stdout.write(d));
      stream.on("close", () => conn.end());
    });
  })
  .connect({
    host: "46.105.28.146",
    port: 22,
    username: "ubuntu",
    password: "Loic898696+8",
  });
