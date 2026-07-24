import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const content = readFileSync(new URL("./content.js", import.meta.url), "utf8");
const popup = readFileSync(new URL("./popup.js", import.meta.url), "utf8");

assert.match(
  content,
  /function detectOpenEmploymentEditorIndex\(\) \{[\s\S]*applicant\.employmentHistory\.[\s\S]*return max;/,
  "Arreglo must detect the currently open employment editor index instead of hardcoding index 0"
);

assert.match(
  content,
  /function employmentFieldName\(idx,[\s\S]*suffixes[\s\S]*applicant\.employmentHistory\.\$\{idx\}/,
  "Arreglo must resolve employment field names from the mounted USCIS DOM"
);

assert.match(
  content,
  /async function commitEmploymentText\(name, value\) \{[\s\S]*SET_USCIS_TYPED_VALUE[\s\S]*chrome\.runtime\.sendMessage/,
  "Employment text fields must use USCIS-accepted real typing, but only one direct typed message"
);

assert.match(
  content,
  /function fitUscisTextToMax\(value, maxLength\) \{[\s\S]*Management[\s\S]*Mgmt[\s\S]*Building[\s\S]*Bldg[\s\S]*Street[\s\S]*St[\s\S]*slice\(0, limit\)/,
  "Arreglo must abbreviate common terms and respect USCIS maxlength before typing long employment/address text"
);

assert.match(
  content,
  /const maxLength = Number\(el\.maxLength\);[\s\S]*const fitted = fitUscisTextToMax\(str, maxLength\);[\s\S]*SET_USCIS_TYPED_VALUE[\s\S]*value: fitted/,
  "Employment text commit must read the field maxlength and type the fitted value, not the over-limit CRM value"
);

assert.doesNotMatch(
  content.match(/async function commitEmploymentText\(name, value\) \{[\s\S]*?\n\}/)?.[0] || "",
  /typeIntoField\(/,
  "Employment company/occupation must not use the retrying typeIntoField wrapper, which can visibly repeat long company names"
);

assert.match(
  content,
  /function employmentFieldName\(idx,[\s\S]*toLowerCase\(\)[\s\S]*endsWith\(`\.\$\{sfx\}`\)[\s\S]*norm\(n\)\.endsWith\(norm\(suffix\)\)/,
  "Employment field resolver must match USCIS name variants case-insensitively instead of only strict .name"
);

assert.match(
  content,
  /async function fillOneEmployment\(idx, work, results\) \{[\s\S]*const field = \(\.\.\.suffixes\) => employmentFieldName\(idx, \.\.\.suffixes\);[\s\S]*commitEmploymentText\(field\('name', 'employerName', 'nameOfEmployer'\)[\s\S]*commitEmploymentText\(field\('occupation', 'occupationTitle', 'position', 'jobTitle'\)[\s\S]*fillAutocomplete\(field\('address\.country'\)/,
  "Employment name and occupation must try USCIS employer/job-title field variants before falling back"
);

assert.doesNotMatch(
  content,
  /applicant\.employmentHistory\.0\.name/,
  "Employment fill must not hardcode applicant.employmentHistory.0.name"
);

assert.match(
  popup,
  /let selectedWorkIndex = 0;/,
  "Popup must track which CRM work history entry staff selected"
);

assert.match(
  popup,
  /function renderWorkSelector\(page\) \{[\s\S]*page !== 'employment'[\s\S]*data-work-index="\$\{i\}"[\s\S]*selectedWorkIndex = Number\(btn\.dataset\.workIndex\);/,
  "Employment page must show clickable CRM work history rows so staff can choose Yinqingdaobo instead of defaulting to Deran"
);

assert.match(
  popup,
  /if \(currentPage === 'employment'\) \{[\s\S]*opts = \{ selectedWorkIndex \};/,
  "Generic Fill This Page on employment pages must send selectedWorkIndex to content.js"
);

console.log("arreglo employment history guards passed");
