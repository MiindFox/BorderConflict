const { Client } = require("ssh2");
const conn = new Client();

conn
  .on("ready", () => {
    console.log("Connected to VPS! Modifying accounts.json directly...");
    conn.sftp((err, sftp) => {
      if (err) throw err;
      const dbPath = "/home/ubuntu/BorderConflict/data/accounts.json";

      sftp.readFile(dbPath, "utf8", (err, raw) => {
        if (err) throw err;
        const db = JSON.parse(raw);
        const email = "darkgdooo@gmail.com";

        if (!db[email]) {
          console.error("Account not found in DB!");
          conn.end();
          return;
        }

        const acc = db[email];
        acc.profile = acc.profile || {};

        // Credit 50 000 Plutonium & 1 000 000 Caps
        acc.profile.plutonium = 50000;
        acc.profile.caps = 1000000;

        // Permanent VIP status (Year 2100)
        acc.profile.isVip = true;
        acc.profile.vipUntil = 4102444800000;

        // Battle Pass & Custom Skin Studio unlock
        acc.profile.hasBattlePass = true;
        acc.profile.battlePassSeason = 1;
        acc.profile.hasCustomSkinUnlocked = true;

        // Bonus cosmetics & flares
        const bonusFlares = [
          "skin:*",
          "crown:supernova_royale",
          "crown:cyber_emperor",
          "crown:atomic_conqueror",
          "boat_trail:electric_plasma",
          "nuke_impact:mirv_custom",
        ];
        acc.profile.ownedFlares = Array.from(
          new Set([...(acc.profile.ownedFlares || []), ...bonusFlares]),
        );
        acc.updatedAt = Date.now();

        const updatedJson = JSON.stringify(db, null, 2);
        sftp.writeFile(dbPath, updatedJson, "utf8", (err) => {
          if (err) throw err;
          console.log("accounts.json successfully updated over SFTP!");
          console.log(
            "darkgdooo profile is now:",
            JSON.stringify(acc.profile, null, 2),
          );

          // Restart PM2 to reload in-memory DB
          conn.exec("pm2 restart borderconflict", (err, stream) => {
            if (err) throw err;
            stream.on("data", (d) => process.stdout.write(d));
            stream.on("close", () => {
              console.log("PM2 restarted successfully!");
              conn.end();
            });
          });
        });
      });
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
