const fs = require("fs");
let content = fs.readFileSync("src/client/Api.ts", "utf8");

const targetLeaderboard = `export async function fetchPlayerLeaderboard(
  page: number,
): Promise<RankedLeaderboardResponse | "reached_limit" | false> {
  try {
    const url = new URL(\`\${getApiBase()}/leaderboard/ranked\`);
    url.searchParams.set("page", String(page));
    const res = await fetch(url.toString(), {
      headers: { Accept: "application/json" },
    });`;

const replacementLeaderboard = `export async function fetchPlayerLeaderboard(
  page: number,
): Promise<RankedLeaderboardResponse | "reached_limit" | false> {
  try {
    try {
      const local = await fetch('/api/leaderboard/ranked');
      if (local.ok) {
        const parsed = RankedLeaderboardResponseSchema.safeParse(await local.json());
        if (parsed.success) return parsed.data;
      }
    } catch {
      // Fall through to remote
    }

    const url = new URL(\`\${getApiBase()}/leaderboard/ranked\`);
    url.searchParams.set("page", String(page));
    const res = await fetch(url.toString(), {
      headers: { Accept: "application/json" },
    });`;

if (!content.includes(targetLeaderboard))
  throw new Error("Target leaderboard not found");
content = content.replace(targetLeaderboard, replacementLeaderboard);
fs.writeFileSync("src/client/Api.ts", content, "utf8");
console.log("Successfully patched fetchPlayerLeaderboard in Api.ts!");
