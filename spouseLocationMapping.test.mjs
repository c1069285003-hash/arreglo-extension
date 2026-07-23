import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const content = readFileSync(new URL("./content.js", import.meta.url), "utf8");

const helperMatch = content.match(
  /\/\/ ── Spouse current-location formatter[\s\S]*?function formatSpouseCurrentLocation\(d\) \{[\s\S]*?\n\}/
);

assert.ok(helperMatch, "Arreglo must define formatSpouseCurrentLocation for USCIS spouse page 3");

const formatSpouseCurrentLocation = Function(
  `${helperMatch[0]}; return formatSpouseCurrentLocation;`
)();

assert.equal(
  formatSpouseCurrentLocation({
    spouseLocation: "In China",
    spouseLocationDetail: "Chongqing",
  }),
  "Chongqing, China",
  "CRM spouseLocation=In China + Spouse City=Chongqing must fill USCIS as Chongqing, China"
);

assert.equal(
  formatSpouseCurrentLocation({
    spouseLocation: "In another country",
    spouseLocationDetail: "Toronto, Canada",
  }),
  "Toronto, Canada",
  "When CRM already has a country-bearing spouse location, Arreglo should not append China"
);

assert.equal(
  formatSpouseCurrentLocation({
    spouseLocation: "In China",
    spouseLocationDetail: "Chongqing, China",
  }),
  "Chongqing, China",
  "Arreglo should not duplicate China when CRM already contains the country"
);

console.log("arreglo spouse location mapping guards passed");
