import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const content = readFileSync(new URL("./content.js", import.meta.url), "utf8");

assert.match(
  content,
  /async function fillCountry\(name, value\)[\s\S]*fillAutocomplete\(name, country\)[\s\S]*fillMuiSelect\(name, country\)/,
  "Country fields must fall back from USCIS autocomplete to the MUI select control"
);

assert.match(
  content,
  /case 'mother':[\s\S]*fillCountry\('applicant\.mother\.countryOfBirth', country\)[\s\S]*motherCountryOfBirth/,
  "Mother country of birth must use the resilient country picker and report its result"
);

assert.match(
  content,
  /case 'father':[\s\S]*fillCountry\('applicant\.father\.countryOfBirth', country\)[\s\S]*fatherCountryOfBirth/,
  "Father country of birth must follow the same rule"
);

console.log("arreglo parent country fill guards passed");
