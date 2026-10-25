const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const { Client } = require("ssh2");

const VPS_HOST = "46.105.28.146";
const VPS_USER = "ubuntu";
const VPS_PASS = "Loic898696+8";
const VPS_DIR = "/home/ubuntu/BorderConflict";

const skipBuild = process.argv.includes("--no-build");

async function main() {
  const startTime = Date.now();
  console.log("==========================================");
  console.log("🚀 FAST DEPLOY: BorderConflict (Build local -> Sync)");
  console.log("==========================================");

  // 1. Build locally
  if (!skipBuild) {
    console.log("\n📦 1. Compilation locale (npm run build-prod)...");
    try {
      execSync("npm run build-prod", { stdio: "inherit" });
    } catch (err) {
      console.error("❌ Échec de la compilation locale. Déploiement annulé.");
      process.exit(1);
    }
  } else {
    console.log("\n⏩ 1. Étape de compilation passée (--no-build)");
  }

  // 2. Vérifier et pousser les commits git
  console.log("\n🌿 2. Synchronisation Git (push origin main)...");
  try {
    const status = execSync("git status --porcelain").toString().trim();
    if (status) {
      console.log("ℹ️ Modifications locales détectées, commit et push...");
      execSync("git add -A");
      try {
        execSync('git commit -m "chore: automatic deploy sync"');
      } catch {}
    }
    execSync("git push origin main", { stdio: "inherit" });
  } catch (err) {
    console.warn("⚠️ Attention lors du git push:", err.message);
  }

  // 3. Compression des assets compilés
  console.log("\n🗜️ 3. Compression du bundle d'assets...");
  const archivePath = path.resolve("build-assets.tar.gz");
  if (fs.existsSync(archivePath)) {
    fs.unlinkSync(archivePath);
  }

  try {
    // On compresse tout le contenu de static (assets, _assets, manifestes, etc.)
    execSync(
      "tar -czf build-assets.tar.gz -C static .",
      { stdio: "inherit" }
    );
    const archiveSize = (fs.statSync(archivePath).size / (1024 * 1024)).toFixed(2);
    console.log(`✅ Archive créée avec succès: ${archiveSize} MB`);
  } catch (err) {
    console.error("❌ Erreur lors de la création de l'archive tar:", err.message);
    process.exit(1);
  }

  // 4. Connexion VPS + SFTP + Déploiement instantané
  console.log("\n⚡ 4. Envoi SFTP et application sur le VPS...");
  const conn = new Client();

  conn
    .on("ready", () => {
      conn.sftp((err, sftp) => {
        if (err) {
          console.error("❌ Erreur SFTP:", err);
          conn.end();
          process.exit(1);
        }

        const remoteArchive = `${VPS_DIR}/build-assets.tar.gz`;
        console.log(`📤 Upload SFTP en cours vers ${VPS_HOST}...`);

        sftp.fastPut(archivePath, remoteArchive, (uploadErr) => {
          if (uploadErr) {
            console.error("❌ Erreur upload SFTP:", uploadErr);
            conn.end();
            process.exit(1);
          }

          console.log("✅ Upload terminé ! Extraction et rechargement de PM2...");

          const remoteCommands = [
            `cd ${VPS_DIR}`,
            "git pull origin main",
            "tar -xzf build-assets.tar.gz -C static",
            "rm -f build-assets.tar.gz",
            "pm2 restart borderconflict",
            "sleep 3",
            "pm2 status",
            "curl --retry 5 --retry-connrefused --retry-delay 1 -s -o /dev/null -w 'HTTP Status: %{http_code}\n' http://127.0.0.1:3000/cosmetics.json",
          ].join(" && ");

          conn.exec(remoteCommands, (execErr, stream) => {
            if (execErr) {
              console.error("❌ Erreur exécution distante:", execErr);
              conn.end();
              process.exit(1);
            }

            stream.on("data", (data) => process.stdout.write(data));
            stream.on("close", (code) => {
              conn.end();
              try {
                fs.unlinkSync(archivePath);
              } catch {}

              const duration = ((Date.now() - startTime) / 1000).toFixed(1);
              console.log("\n==========================================");
              console.log(`✨ Déploiement instantané terminé en ${duration}s (Code: ${code}) !`);
              console.log("Le VPS n'a subi aucune charge CPU de compilation.");
              console.log("==========================================");
              process.exit(code || 0);
            });
          });
        });
      });
    })
    .on("error", (err) => {
      console.error("❌ Erreur de connexion SSH:", err);
      process.exit(1);
    })
    .connect({
      host: VPS_HOST,
      port: 22,
      username: VPS_USER,
      password: VPS_PASS,
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
}

main();
