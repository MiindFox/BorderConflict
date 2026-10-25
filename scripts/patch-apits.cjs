const fs = require("fs");
let content = fs.readFileSync("src/client/Api.ts", "utf8");

const targetImport = 'import { UserSettings } from "./UserSettings";';
const replacementImport =
  'import { UserSettings } from "./UserSettings";\nimport { commanderStore } from "./CommanderStore";';

const targetGetUserMe = `export async function getUserMe(): Promise<UserMeResponse | false> {
  if (__userMe !== null) {
    return __userMe;
  }
  // A holder rather than a plain local so the body below can recognise its
  // own promise as the cached one. Filled in immediately after, which is
  // always before any await inside can resume.
  const attempt: { request?: Promise<UserMeResponse | false> } = {};
  attempt.request = (async () => {
    const { profile, aborted } = await requestUserMe();
    // Un-cache a timeout, and ONLY a timeout. Every other falsy answer is
    // a conclusion about the account — signed out, a 401, a rejected token
    // — and stays remembered; re-deriving those would put an /auth/refresh
    // behind every getUserMe() call for every logged-out player, which is
    // the storm, not the fix. A deadline we imposed ourselves concluded
    // nothing, so leaving it cached would strand a merely-slow connection
    // as "signed out" for the rest of the session: no player-scoped
    // settings, no cosmetics, no verified badge, recoverable only by
    // reloading. Same shape as fetchCosmetics, for the same reason.
    // Remembering an unreachable backend so the retry is not paid at full
    // price is OPE-403.
    //
    // Cleared here rather than from a .then on the request: this runs
    // before the promise resolves, so a caller awaiting it cannot observe
    // the timed-out answer still cached. attempt.request is always set by
    // now — this line can only be reached after an await.
    if (aborted && __userMe === attempt.request) {
      __userMe = null;
    }
    return profile;
  })();`;

const replacementGetUserMe = `export async function getUserMe(): Promise<UserMeResponse | false> {
  if (__userMe !== null) {
    return __userMe;
  }
  const attempt: { request?: Promise<UserMeResponse | false> } = {};
  attempt.request = (async () => {
    const { profile, aborted } = await requestUserMe();
    if (aborted && __userMe === attempt.request) {
      __userMe = null;
    }
    if (profile !== false) {
      return profile;
    }
    const local = commanderStore.getLocalUserMeResponse();
    if (local.user.email) {
      return local;
    }
    return false;
  })();`;

if (!content.includes(targetImport)) throw new Error("targetImport not found");
if (!content.includes(targetGetUserMe))
  throw new Error("targetGetUserMe not found");

content = content.replace(targetImport, replacementImport);
content = content.replace(targetGetUserMe, replacementGetUserMe);
fs.writeFileSync("src/client/Api.ts", content, "utf8");
console.log("Successfully updated Api.ts getUserMe fallback!");
