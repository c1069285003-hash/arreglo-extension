import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const popup = readFileSync(new URL("./popup.js", import.meta.url), "utf8");
const content = readFileSync(new URL("./content.js", import.meta.url), "utf8").replace(/\u0000/g, "");

assert.match(
  popup,
  /data-school-index="\$\{i\}"[\s\S]*selectedSchoolIndex = Number\(btn\.dataset\.schoolIndex\);[\s\S]*renderSchoolSelector\(page\);/,
  "Arreglo school rows must be directly clickable so staff can choose high school/middle school/etc. before Fill This Page"
);

assert.match(
  popup,
  /if \(currentPage === 'school'\) \{[\s\S]*fillAllSchools:\s*false[\s\S]*selectedSchoolIndex[\s\S]*sortedSchools: getSortedSchools\(\)/,
  "Generic Fill This Page on school pages must explicitly stay in single selected-school mode"
);

const fillAllCallSites = [...popup.matchAll(/fillSchools\(true\)/g)].map((m) => m.index);
assert.equal(fillAllCallSites.length, 1, "Only the explicit Fill ALL Schools button may request all-school automation");
assert.match(
  popup,
  /document\.getElementById\('btn-fill-all-schools'\)\.onclick = \(\) => fillSchools\(true\);/,
  "Fill ALL Schools must remain an explicit separate button"
);

assert.match(
  content,
  /if \(opts\.fillAllSchools === true\) \{/,
  "Content script must only run the add/fill/save loop when fillAllSchools is exactly true"
);

assert.match(
  content,
  /const pick = Number\.isInteger\(opts\.selectedSchoolIndex\)[\s\S]*sorted\[opts\.selectedSchoolIndex\][\s\S]*sorted\[idx\]/,
  "Single school mode must honor the selected sidebar school before falling back to editor position"
);

console.log("arreglo school selection-mode guards passed");
