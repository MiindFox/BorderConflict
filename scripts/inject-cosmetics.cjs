const fs = require("fs");

console.log("Injecting cosmetics into HexaFrontCosmeticsCatalog.ts...");

const catalogPath = "src/client/HexaFrontCosmeticsCatalog.ts";
let code = fs.readFileSync(catalogPath, "utf8");

const generated = JSON.parse(
  fs.readFileSync("scripts/cosmetics_generated.json", "utf8"),
);

// 1. Inject extra patterns before the end of HUNDRED_PATTERN_SPECS
const patternEntries = generated.extraPatterns
  .map(
    (p) => `  {
    name: "${p.name}",
    label: "${p.label}",
    rarity: "${p.rarity}",
    fn: ${p.fn},
  },`,
  )
  .join("\n");

const crownEntries = generated.extraCrowns
  .map(
    (c) => `  {
    name: "${c.name}",
    label: "${c.label}",
    rarity: "${c.rarity}",
    svg: \`${c.svg}\`,
  },`,
  )
  .join("\n");

const flagEntries = generated.extraFlags
  .map(
    (f) =>
      `  { name: "${f.name}", label: "${f.label}", rarity: "${f.rarity}", bg: "${f.bg}", accent: "${f.accent}", emblemColor: "${f.emblemColor}", shape: "${f.shape}" },`,
  )
  .join("\n");

const effectEntries = generated.extraEffects
  .map(
    (e) => `  addEffect("${e.label}", {
    name: "${e.name}",
    effectType: "${e.effectType}",
    rarity: "${e.rarity}",
    priceHard: ${e.priceHard},
    priceSoft: ${e.priceSoft},
    product: null,
    attributes: ${JSON.stringify(e.attrs, null, 6)},
  });`,
  )
  .join("\n\n");

// Replace insertion points
// Pattern marker: find end of HUNDRED_PATTERN_SPECS
const patternEndIdx = code.indexOf("const TWENTY_CROWN_SPECS");
if (patternEndIdx === -1) throw new Error("Could not find TWENTY_CROWN_SPECS");

const beforeCrowns = code.slice(0, patternEndIdx);
const afterCrowns = code.slice(patternEndIdx);

// Look backwards in beforeCrowns for the last '];'
const lastBracketPattern = beforeCrowns.lastIndexOf("];");
if (lastBracketPattern === -1)
  throw new Error("Could not find end of HUNDRED_PATTERN_SPECS");

code =
  beforeCrowns.slice(0, lastBracketPattern) +
  ",\n" +
  patternEntries +
  "\n];\n\n" +
  afterCrowns;

// Crown marker: find end of TWENTY_CROWN_SPECS (before const TWENTY_FLAG_SPECS or interface FlagSpec)
const flagSpecIdx = code.indexOf("interface FlagSpec");
if (flagSpecIdx === -1) throw new Error("Could not find interface FlagSpec");

const beforeFlagSpec = code.slice(0, flagSpecIdx);
const afterFlagSpec = code.slice(flagSpecIdx);

const lastBracketCrown = beforeFlagSpec.lastIndexOf("];");
code =
  beforeFlagSpec.slice(0, lastBracketCrown) +
  ",\n" +
  crownEntries +
  "\n];\n\n" +
  afterFlagSpec;

// Flag marker: find end of TWENTY_FLAG_SPECS
const renderFactionFlagIdx = code.indexOf("function renderFactionFlagSvg");
if (renderFactionFlagIdx === -1)
  throw new Error("Could not find renderFactionFlagSvg");

const beforeRender = code.slice(0, renderFactionFlagIdx);
const afterRender = code.slice(renderFactionFlagIdx);

const lastBracketFlag = beforeRender.lastIndexOf("];");
code =
  beforeRender.slice(0, lastBracketFlag) +
  ",\n" +
  flagEntries +
  "\n];\n\n" +
  afterRender;

// Effect marker: find end of addEffect calls in getHexaFrontCosmeticsCatalog
const returnCatalogIdx = code.indexOf("cachedCatalog = {");
if (returnCatalogIdx === -1)
  throw new Error("Could not find cachedCatalog = {");

const beforeReturn = code.slice(0, returnCatalogIdx);
const afterReturn = code.slice(returnCatalogIdx);

code =
  beforeReturn +
  "\n  // ==========================================================================\n  // 25 EXPANDED NEW EFFECTS\n  // ==========================================================================\n" +
  effectEntries +
  "\n\n  " +
  afterReturn;

fs.writeFileSync(catalogPath, code, "utf8");
console.log(
  "Successfully injected 105 new cosmetics into HexaFrontCosmeticsCatalog.ts!",
);
