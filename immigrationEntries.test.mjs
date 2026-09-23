import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const targets = [
  ["arreglo-extension", new URL("./content.js", import.meta.url)],
  ["chrome-extension", new URL("../chrome-extension/content.js", import.meta.url)],
];

for (const [label, url] of targets) {
  const content = readFileSync(url, "utf8");

  assert.match(
    content,
    /function getApplicantUsEntries\(/,
    `${label}: Arreglo must normalize CRM usEntryHistory before filling USCIS immigration information`
  );

  assert.match(
    content,
    /function fillPreviousUsEntry\(idx, entry, results\)[\s\S]*previousEntries\.\$\{idx\}[\s\S]*\.dateOfEntry/,
    `${label}: Arreglo must fill USCIS previousEntries date fields from CRM entry history`
  );

  assert.match(
    content,
    /function fillPreviousUsEntry\(idx, entry, results\)[\s\S]*fillByName\(`\$\{p\}\.dateOfEntry`[\s\S]*fillAutocomplete\(`\$\{p\}\.placeOfEntry\.referenceSelectOption`/,
    `${label}: previous-entry helper must use globally available fillByName/fillAutocomplete, not fillPage-local helpers`
  );

  const previousHelper = content.match(/function fillPreviousUsEntry\(idx, entry, results\) \{[\s\S]*?\n\}/)?.[0] || "";
  assert.doesNotMatch(
    previousHelper,
    /\b(?:fill|auto)\(`/,
    `${label}: previous-entry helper must not call fill()/auto() because those are local to fillPage`
  );

  assert.match(
    content,
    /ensurePreviousEntryRows\(previousUsEntries\.length\)/,
    `${label}: Arreglo must add enough previous-entry rows before filling travel history`
  );

  assert.match(
    content,
    /fillPage\(detectPage\(\), msg\.data, msg\.opts \|\| \{\}\)[\s\S]*\.catch\(error => \{[\s\S]*sendResponse\(\{[\s\S]*page: detectPage\(\),[\s\S]*results: \[\{ name: 'error'/,
    `${label}: content listener must always sendResponse on async fill errors so Chrome message channels do not close silently`
  );
}

console.log("arreglo immigration entry-history guards passed");
