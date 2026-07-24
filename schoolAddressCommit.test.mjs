import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const content = readFileSync(new URL("./content.js", import.meta.url), "utf8");

assert.match(
  content,
  /async function commitSchoolText\(name, value\) \{[\s\S]*typeIntoField\(name, str\)/,
  "School city/province/postal fields are plain USCIS text inputs and must use typed commit, not masked commit"
);

assert.match(
  content,
  /if \(edu\.city\)\s+push\('city', edu\.city, await commitSchoolText\(`\$\{p\}\.address\.city`, edu\.city\)\);/,
  "School city must use commitSchoolText so USCIS Save school persists it"
);

assert.match(
  content,
  /if \(edu\.province\)\s+push\('province', edu\.province, await commitSchoolText\(`\$\{p\}\.address\.province`, edu\.province\)\);/,
  "School province must be filled from CRM eduList[].province"
);

assert.doesNotMatch(
  content,
  /fillMasked\(`\$\{p\}\.address\.city`/,
  "School city must not use fillMasked; it displays without committing on the USCIS school editor"
);

console.log("arreglo school address commit guards passed");
