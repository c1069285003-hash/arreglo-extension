import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const content = readFileSync(new URL("./content.js", import.meta.url), "utf8");

for (const [crmKey, uscisName] of [
  ["spouseEntryPort", "applicant.spouse.spouse3.placeOfEntry.referenceSelectOption"],
  ["spouseLastEntryDate", "applicant.spouse.spouse3.dateOfEntry"],
  ["spouseI94Number", "applicant.spouse.spouse3.currentI94Number.i94Number"],
  ["spouseLastEntryStatus", "applicant.spouse.spouse3.statusOnAdmission"],
  ["spouseCurrentStatus", "applicant.spouse.spouse3.statusCurrent"],
  ["spouseStatusExpiry", "applicant.spouse.spouse3.dateOfExpiration"],
  ["spousePrevArrivalDate", "applicant.spouse.spouse3.dateOfPrevArrival"],
]) {
  assert.match(
    content,
    new RegExp(`${crmKey}[\\s\\S]*${uscisName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`),
    `Arreglo must map CRM ${crmKey} to USCIS ${uscisName}`
  );
}

assert.match(
  content,
  /spouseInImmigrationProceedings[\s\S]*applicant\.spouse\.spouse3\.isYourSpouseInImmigration/,
  "Arreglo must fill spouse immigration-court proceedings radio from CRM"
);

assert.match(
  content,
  /spouseInPetition[\s\S]*applicant\.spouse\.spouse3\.includedOnApplication/,
  "Arreglo must fill included-on-application radio from CRM spouseInPetition"
);

console.log("arreglo spouse in-US page 3 guards passed");
