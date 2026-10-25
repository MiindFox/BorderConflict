const fs = require("fs");
let content = fs.readFileSync("src/client/ClanApi.ts", "utf8");

const targetClanLeaderboard = `export async function fetchClanLeaderboard(): Promise<
  ClanLeaderboardResponse | false
> {
  try {
    const res = await fetch(\`\${getApiBase()}/public/clans/leaderboard\`, {
      headers: { Accept: "application/json" },
    });`;

const replacementClanLeaderboard = `export async function fetchClanLeaderboard(): Promise<
  ClanLeaderboardResponse | false
> {
  try {
    try {
      const local = await fetch('/api/public/clans/leaderboard');
      if (local.ok) {
        const parsed = ClanLeaderboardResponseSchema.safeParse(await local.json());
        if (parsed.success) return parsed.data;
      }
    } catch {
      // Fall through
    }

    const res = await fetch(\`\${getApiBase()}/public/clans/leaderboard\`, {
      headers: { Accept: "application/json" },
    });`;

const targetClanFetch = `async function clanFetch(
  path: string,
  options?: RequestInit,
): Promise<Response> {
  const url = \`\${getApiBase()}\${path}\`;
  return fetch(url, {
    ...options,
    headers: {
      Accept: "application/json",
      ...options?.headers,
      Authorization: await getAuthHeader(),
    },
  });
}`;

const replacementClanFetch = `async function clanFetch(
  path: string,
  options?: RequestInit,
): Promise<Response> {
  // If the path starts with /clans, route directly to local server master
  if (path.startsWith('/clans')) {
    try {
      const localUrl = \`/api\${path}\`;
      const res = await fetch(localUrl, {
        ...options,
        headers: {
          Accept: "application/json",
          ...options?.headers,
        },
      });
      if (res.ok) return res;
    } catch {
      // Fall through
    }
  }

  const url = \`\${getApiBase()}\${path}\`;
  return fetch(url, {
    ...options,
    headers: {
      Accept: "application/json",
      ...options?.headers,
      Authorization: await getAuthHeader(),
    },
  });
}`;

if (!content.includes(targetClanLeaderboard))
  throw new Error("Target clan leaderboard not found");
if (!content.includes(targetClanFetch))
  throw new Error("Target clanFetch not found");

content = content.replace(targetClanLeaderboard, replacementClanLeaderboard);
content = content.replace(targetClanFetch, replacementClanFetch);
fs.writeFileSync("src/client/ClanApi.ts", content, "utf8");
console.log("Successfully patched ClanApi.ts!");
