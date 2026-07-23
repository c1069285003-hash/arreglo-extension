import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const popup = readFileSync(new URL("./popup.js", import.meta.url), "utf8");

assert.match(popup, /async function loadClientFromCloudflare\(caseNum,\s*\{ silent = false,\s*requireInfoSheet = false,\s*resetAddressIndex = false \} = \{\}\)/, "popup must centralize Cloudflare client loading");
assert.match(popup, /const refreshed = await loadClientFromCloudflare\(caseNum,\s*\{ silent: true,\s*requireInfoSheet: true \}\);[\s\S]*if \(refreshed\) clientData = refreshed;/, "Fill must refresh Cloudflare data before sending fields to USCIS");
assert.match(popup, /chrome\.storage\.local\.set\(\{[\s\S]*arreglo_data: saved,[\s\S]*arreglo_case: caseNum,[\s\S]*arreglo_synced_at:/, "Cloudflare refresh must update cached data and synced timestamp");
assert.match(popup, /requireInfoSheet\) \{[\s\S]*staff 保存版[\s\S]*return null;/, "USCIS Fill must require a staff-saved English info sheet");
assert.match(popup, /loadClientFromCloudflare\(result\.arreglo_case,\s*\{ silent: true \}\)/, "Restored popup session must refresh stale cache from Cloudflare");

console.log("arreglo popup sync guards passed");
