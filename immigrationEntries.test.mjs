import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const content = readFileSync(new URL("./content.js", import.meta.url), "utf8");

assert.match(
  content,
  /function getApplicantUsEntries\(/,
  "Arreglo must normalize CRM usEntryHistory before filling USCIS immigration information"
);

assert.match(
  content,
  /function fillPreviousUsEntry\(idx, entry, results\)[\s\S]*previousEntries\.\$\{idx\}[\s\S]*\.dateOfEntry/,
  "Arreglo must fill USCIS previousEntries date fields from CRM entry history"
);

assert.match(
  content,
  /ensurePreviousEntryRows\(previousUsEntries\.length\)/,
  "Arreglo must add enough previous-entry rows before filling travel history"
);

console.log("arreglo immigration entry-history guards passed");
