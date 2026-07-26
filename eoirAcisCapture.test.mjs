import test from "node:test";
import assert from "node:assert/strict";
import {
  normalizeAlienNumber,
  parseEoirAcisResult,
  parseEoirAcisText,
} from "./eoirAcisCapture.js";

const approvedResult = `
  QIN, HAIXIA (236-333-728)
  Name: QIN, HAIXIA | A-Number: 236-333-728 | Docket Date: 4/24/2026
  Next Hearing Information
  Your upcoming Individual hearing is in person on August 13, 2029 at 8:30 AM.
  Judge Miller, Nancy E.
  Court Address
  300 N. LOS ANGELES ST. RM 4330
  LOS ANGELES, CA 90012
  This case is pending.
  No appeal was received for this case.
  Phone Number (213) 576-4701
`;

test("parses the approved QIN HAIXIA ACIS result", () => {
  const result = parseEoirAcisText(
    approvedResult,
    "https://acis.eoir.justice.gov/en/caseInformation",
  );

  assert.equal(result.ok, true);
  const { rawVisibleFields, ...fields } = result.fields;
  assert.deepEqual(fields, {
    subjectName: "QIN, HAIXIA",
    familyName: "QIN",
    givenName: "HAIXIA",
    alienNumber: "236333728",
    docketDate: "04/24/2026",
    hearingDate: "08/13/2029",
    hearingTime: "8:30 AM",
    hearingType: "Individual",
    appearanceMode: "in person",
    judge: "Miller, Nancy E.",
    courtAddress: "300 N. LOS ANGELES ST. RM 4330, LOS ANGELES, CA 90012",
    courtPhone: "(213) 576-4701",
    caseStatus: "This case is pending.",
    biaStatus: "No appeal was received for this case.",
    sourceUrl: "https://acis.eoir.justice.gov/en/caseInformation",
  });
  assert.equal(rawVisibleFields.alienNumber, "236-333-728");
  assert.equal(rawVisibleFields.docketDate, "4/24/2026");
});

test("normalizes only a complete nine-digit A-Number", () => {
  assert.equal(normalizeAlienNumber("A-236-333-728"), "236333728");
  assert.equal(normalizeAlienNumber("236-333-72"), "");
  assert.equal(normalizeAlienNumber("not an A-Number"), "");
});

for (const [screen, text] of [
  ["search", "Case Information Search\nEnter your A-Number to search"],
  ["acknowledgement", "I Acknowledge and Agree\nContinue"],
  ["CAPTCHA", "Verify you are human\nCAPTCHA required"],
  ["missing full name", "A-Number: 236-333-728\nThis case is pending."],
  ["missing A-Number", "Name: QIN, HAIXIA\nThis case is pending."],
]) {
  test(`fails closed on the ${screen} page`, () => {
    const result = parseEoirAcisText(text, "https://acis.eoir.justice.gov/en/caseInformation");

    assert.deepEqual(result.ok, false);
    assert.equal(typeof result.error, "string");
    assert.equal(result.fields, undefined);
  });
}

test("reads rendered visible text from a page root", () => {
  const root = {
    innerText: approvedResult,
    baseURI: "https://acis.eoir.justice.gov/en/caseInformation",
  };

  const result = parseEoirAcisResult(root);

  assert.equal(result.ok, true);
  assert.equal(result.fields.subjectName, "QIN, HAIXIA");
  assert.equal(result.fields.sourceUrl, "https://acis.eoir.justice.gov/en/caseInformation");
});
