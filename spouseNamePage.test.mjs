import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const content = readFileSync(new URL("./content.js", import.meta.url), "utf8");

assert.match(
  content,
  /url\.includes\('\/your-family\/your-spouse\/your-spouse'\)[\s\S]*return 'spouse_1'/,
  "Arreglo must recognize the USCIS spouse full-name page instead of showing page unknown"
);

assert.match(
  content,
  /url\.includes\('\/your-family\/your-spouse\/your-spouse-page-2'\)[\s\S]*return 'spouse_2'/,
  "Arreglo must recognize the USCIS spouse page 2 instead of showing page unknown"
);

assert.match(
  content,
  /case 'spouse_1':[\s\S]*applicant\.spouse\.spouse1\.name\.firstName[\s\S]*spouseGivenName[\s\S]*applicant\.spouse\.spouse1\.name\.middleName[\s\S]*spouseMiddleName[\s\S]*applicant\.spouse\.spouse1\.name\.lastName[\s\S]*spouseFamilyName/,
  "Arreglo must fill spouse first/middle/last name from CRM split spouse fields"
);

assert.match(
  content,
  /formikFactoryUIMeta\.applicant\.spouse\.spouse1\.hasAdditionalNames[\s\S]*false/,
  "Arreglo should default spouse additional names to No when CRM has no spouse alias workflow"
);

assert.match(
  content,
  /case 'spouse_2':[\s\S]*applicant\.spouse\.spouse2\.dateOfBirth[\s\S]*spouseDob[\s\S]*applicant\.spouse\.spouse2\.gender[\s\S]*spouseGender[\s\S]*applicant\.spouse\.spouse2\.cityOfBirth[\s\S]*spouseBirthCity[\s\S]*applicant\.spouse\.spouse2\.countryOfBirth[\s\S]*spouseCountry[\s\S]*applicant\.spouse\.spouse2\.presentNationality[\s\S]*spouseNationality/,
  "Arreglo must fill spouse page 2 DOB/gender/birth/nationality fields from CRM"
);

assert.match(
  content,
  /spouseANumberNone[\s\S]*formikFactoryUIMeta\.applicant\.spouse\.spouse2\.alienNumber\.none[\s\S]*spousePassportNumberNone[\s\S]*formikFactoryUIMeta\.applicant\.spouse\.spouse2\.passportNumber\.none[\s\S]*spouseSsnNone[\s\S]*formikFactoryUIMeta\.applicant\.spouse\.spouse2\.socialSecurityNumber\.none/,
  "Arreglo must handle spouse A-number/passport/SSN None checkboxes on spouse page 2"
);

console.log("arreglo spouse name page guards passed");
