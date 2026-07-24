import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const content = readFileSync(new URL("./content.js", import.meta.url), "utf8");

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
  /async function commitEmploymentText\(name, value\) \{[\s\S]*typeIntoField\(name, str\)/,
  "Employment plain text fields must use real typing so USCIS/Formik keeps the values"
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

console.log("arreglo employment history guards passed");
