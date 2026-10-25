const { Client } = require("ssh2");

const conn = new Client();
conn
  .on("ready", () => {
    console.log("SSH connection established");
    const backupScript = `#!/bin/bash
BACKUP_DIR="/home/ubuntu/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
mkdir -p "$BACKUP_DIR"

# Backup accounts and clans data
if [ -d "/home/ubuntu/BorderConflict/data" ]; then
  tar -czf "$BACKUP_DIR/backup_$TIMESTAMP.tar.gz" -C /home/ubuntu/BorderConflict/data accounts.json clans.json 2>/dev/null || tar -czf "$BACKUP_DIR/backup_$TIMESTAMP.tar.gz" -C /home/ubuntu/BorderConflict/data .
  echo "[$(date)] Backup completed: backup_$TIMESTAMP.tar.gz" >> "$BACKUP_DIR/backup.log"
fi

# Retain backups for 14 days
find "$BACKUP_DIR" -type f -name "backup_*.tar.gz" -mtime +14 -delete
`;

    const remoteCommands = `
cd /home/ubuntu/BorderConflict
git pull origin main
npm run build:client

# Setup backup script
cat << 'EOF' > /home/ubuntu/backup-database.sh
${backupScript}
EOF

chmod +x /home/ubuntu/backup-database.sh
mkdir -p /home/ubuntu/backups

# Test run backup immediately
/bin/bash /home/ubuntu/backup-database.sh

# Install cron job for 3:00 AM every night if not already present
crontab -l 2>/dev/null | grep -v "backup-database.sh" > /tmp/mycron || true
echo "0 3 * * * /bin/bash /home/ubuntu/backup-database.sh" >> /tmp/mycron
crontab /tmp/mycron
rm /tmp/mycron

echo "--- CRON JOBS ---"
crontab -l

echo "--- BACKUP FOLDER CONTENTS ---"
ls -la /home/ubuntu/backups
`;

    conn.exec(remoteCommands, (err, stream) => {
      if (err) throw err;
      stream
        .on("close", (code, signal) => {
          console.log("Finished with code " + code);
          conn.end();
        })
        .on("data", (data) => {
          process.stdout.write(data);
        })
        .stderr.on("data", (data) => {
          process.stderr.write(data);
        });
    });
  })
  .connect({
    host: "46.105.28.146",
    port: 22,
    username: "ubuntu",
    password: "Loic898696+8",
  });
