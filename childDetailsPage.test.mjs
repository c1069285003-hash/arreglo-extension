import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const targets = [
  ["arreglo-extension", new URL("./content.js", import.meta.url)],
  ["chrome-extension", new URL("../chrome-extension/content.js", import.meta.url)],
];

for (const [label, url] of targets) {
  const content = readFileSync(url, "utf8");
  const childInfoCase = content.match(/case 'child_0_info': \{[\s\S]*?case 'child_0_us':/)?.[0] || "";
  const fillMasked = content.match(/async function fillMasked\(name, value\) \{[\s\S]*?\n\}/)?.[0] || "";

  assert.match(
    childInfoCase,
    /c\.passportNumber[\s\S]*setCheckbox\(`\$\{meta\}\.passportNumber\.none`, false\)[\s\S]*fillByName\(.*passportNumber/,
    `${label}: child details page must fill child passport number when CRM has one, not only check None`
  );

  assert.match(
    childInfoCase,
    /c\.ssn[\s\S]*setCheckbox\(`\$\{meta\}\.socialSecurityNumber\.none`, false\)[\s\S]*childFieldName\(formIdx, 'socialSecurityNumber\.number', 'socialSecurityNumber'\)[\s\S]*typeMaskedValue\(ssnName/,
    `${label}: child details page must type child SSN through the USCIS input pipeline when CRM has one`
  );

  assert.match(
    content,
    /async function typeMaskedValue\(name, value\)[\s\S]*SET_USCIS_TYPED_VALUE[\s\S]*norm\(cur\?\.value\) === norm\(str\)/,
    `${label}: SSN-like masked fields must use typed input and treat USCIS formatted values like 191-93-7857 as successful`
  );
}

console.log("arreglo child details passport/SSN guards passed");
