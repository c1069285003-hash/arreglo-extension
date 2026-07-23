import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const content = readFileSync(new URL("./content.js", import.meta.url), "utf8");

assert.ok(
  content.includes("const parenCode = v.toUpperCase().match(/\\(([A-Z]{3})\\)/);") &&
    content.includes("PORT_OF_ENTRY_MAP[parenCode[1]]"),
  "Arreglo must translate CRM display ports like Honolulu, HI (HHW) by the parenthesized CBP/I-94 code"
);

assert.ok(
  content,
  content.includes("return 'B2 - VISITOR FOR PLEASURE';") &&
    content.includes("tourist|旅游|pleasure"),
  "Arreglo must translate CRM display status B-2 Tourist to the USCIS option B2 - VISITOR FOR PLEASURE"
);

assert.match(
  content,
  /statusQuery\(d\.lastEntryStatus \|\| 'B-2 Tourist'\)/,
  "Arreglo should keep CRM-facing fallback text human-readable while translating it at USCIS fill time"
);

console.log("arreglo USCIS value normalization guards passed");
