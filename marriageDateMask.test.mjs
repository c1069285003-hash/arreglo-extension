import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const content = readFileSync(new URL("./content.js", import.meta.url), "utf8");

const fmtDateMatch = content.match(/function fmtDate\(d\) \{[\s\S]*?\n\}/);
assert.ok(fmtDateMatch, "Arreglo must define fmtDate");

const fmtDate = Function(`${fmtDateMatch[0]}; return fmtDate;`)();

assert.equal(
  fmtDate("11/7/2023"),
  "11/07/2023",
  "USCIS date masks need M/D/YYYY CRM dates padded to MM/DD/YYYY before filling"
);

assert.match(
  content,
  /await fillMasked\('applicant\.maritalStatus\.marriageDate',\s*fmtDate\(d\.marriageDate\)\);/,
  "USCIS marriageDate must use the Inputmask-aware filler, not the plain text filler"
);

assert.doesNotMatch(
  content,
  /await fill\('applicant\.maritalStatus\.marriageDate'/,
  "Plain text fill corrupts USCIS masked marriageDate fields"
);

console.log("arreglo marriage date mask guards passed");
