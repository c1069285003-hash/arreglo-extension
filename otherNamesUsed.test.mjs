import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const content = readFileSync(new URL("./content.js", import.meta.url), "utf8");

assert.match(
  content,
  /case 'your_name': \{[\s\S]*aliasFirstName[\s\S]*aliasLastName[\s\S]*hasAlias/,
  "Arreglo must read Other Names Used from the Info Sheet"
);

assert.match(
  content,
  /if \(hasAlias\) \{[\s\S]*clickRadio\(aliasRadioName, 'Yes'\)[\s\S]*await sleep\(400\)/,
  "Arreglo must select Yes and wait for USCIS to render the dynamic alias fields"
);

assert.match(
  content,
  /additionalNameInputs[\s\S]*endsWith\(`\.\$\{part\}`\)[\s\S]*fillName\(firstInput\.name, aliasFirstName\)[\s\S]*fillName\(lastInput\.name, aliasLastName\)/,
  "Arreglo must discover and fill the dynamically named alias first and last name inputs"
);

assert.match(
  content,
  /if \(hasAlias\)[\s\S]*else if \(d\.aliasNone\)/,
  "A populated alias must win over a stale aliasNone flag"
);

console.log("arreglo Other Names Used guards passed");
