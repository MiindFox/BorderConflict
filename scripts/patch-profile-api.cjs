const fs = require("fs");
let content = fs.readFileSync("src/client/Api.ts", "utf8");

const target = `export async function fetchPublicPlayerProfile(
  publicId: string,
): Promise<PlayerProfile | false> {
  try {
    const url = \`\${getApiBase()}/public/player/\${encodeURIComponent(publicId)}\`;

    const res = await fetch(url, {
      headers: { Accept: "application/json" },
    });`;

const replacement = `export async function fetchPublicPlayerProfile(
  publicId: string,
): Promise<PlayerProfile | false> {
  try {
    try {
      const localRes = await fetch(\`/api/public/player/\${encodeURIComponent(publicId)}\`);
      if (localRes.ok) {
        const localJson = await localRes.json();
        const parsed = PlayerProfileSchema.safeParse(localJson);
        if (parsed.success) return parsed.data;
      }
    } catch {
      // Fall through
    }

    const url = \`\${getApiBase()}/public/player/\${encodeURIComponent(publicId)}\`;

    const res = await fetch(url, {
      headers: { Accept: "application/json" },
    });`;

if (!content.includes(target)) throw new Error("Target not found in Api.ts");
content = content.replace(target, replacement);
fs.writeFileSync("src/client/Api.ts", content, "utf8");
console.log("Successfully added local player profile fallback!");
