const { Client } = require("ssh2");
const conn = new Client();

const scriptContent = `
const fs = require('fs');
const path = '/home/ubuntu/BorderConflict/data/accounts.json';

try {
  const raw = fs.readFileSync(path, 'utf8');
  const db = JSON.parse(raw);
  const email = 'darkgdooo@gmail.com';
  
  if (!db[email]) {
    console.error('Account darkgdooo@gmail.com not found in DB!');
    process.exit(1);
  }
  
  const acc = db[email];
  acc.profile = acc.profile || {};
  
  // Set immense currency reserves
  acc.profile.plutonium = 50000;
  acc.profile.caps = 1000000;
  
  // Grant permanent VIP (Year 2100)
  acc.profile.isVip = true;
  acc.profile.vipUntil = 4102444800000;
  
  // Unlock Season Pass & Custom Skin Studio
  acc.profile.hasBattlePass = true;
  acc.profile.battlePassSeason = 1;
  acc.profile.hasCustomSkinUnlocked = true;
  
  // Ensure exclusive cosmetic flares are owned
  const existingFlares = acc.profile.ownedFlares || [];
  const bonusFlares = [
    'skin:*',
    'crown:supernova_royale',
    'crown:cyber_emperor',
    'crown:atomic_conqueror',
    'boat_trail:electric_plasma',
    'nuke_impact:mirv_custom'
  ];
  acc.profile.ownedFlares = Array.from(new Set([...existingFlares, ...bonusFlares]));
  
  acc.updatedAt = Date.now();
  
  fs.writeFileSync(path, JSON.stringify(db, null, 2), 'utf8');
  console.log('SUCCESS: Player darkgdooo account updated in DB:');
  console.log(JSON.stringify(acc.profile, null, 2));
} catch (e) {
  console.error('Error updating player account:', e);
  process.exit(1);
}
`;

const commands = [
  'echo "=== PULLING LATEST CODE ON VPS ==="',
  "cd /home/ubuntu/BorderConflict",
  "git pull origin main",
  'echo "=== UPDATING PLAYER ACCOUNT IN DB ==="',
  `node -e "${scriptContent.replace(/"/g, '\\"').replace(/\n/g, " ")}"`,
  'echo "=== REBUILDING ASSETS ==="',
  "npm run build-prod",
  'echo "=== RESTARTING PM2 ==="',
  "pm2 restart borderconflict",
  "sleep 3",
  "pm2 status",
  'echo "=== ALL DONE ==="',
].join("\n");

conn
  .on("ready", () => {
    console.log("Connected to VPS! Updating account and rebuilding...");
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
