import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const manifestPath = new URL("./manifest.json", import.meta.url);
const contentPath = new URL("./content.js", import.meta.url);
const popupHtmlPath = new URL("./popup.html", import.meta.url);
const popupJsPath = new URL("./popup.js", import.meta.url);

test("ACIS permission is narrow and capture is explicit", () => {
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  assert.ok(manifest.host_permissions.includes("https://acis.eoir.justice.gov/*"));
  assert.ok(manifest.content_scripts.some(s =>
    s.matches.includes("https://acis.eoir.justice.gov/*") &&
    s.js.includes("content.js") &&
    !s.js.includes("eoirAcisCapture.js")
  ));
  assert.ok(manifest.web_accessible_resources.some(resource =>
    resource.resources.includes("eoirAcisCapture.js") &&
    resource.matches.includes("https://acis.eoir.justice.gov/*")
  ));
  const content = readFileSync(contentPath, "utf8");
  assert.match(content, /ARREGLO_CAPTURE_EOIR_RESULT/);
  assert.match(content, /import\(chrome\.runtime\.getURL\(['"]eoirAcisCapture\.js['"]\)\)/);
  assert.match(content, /parseEoirAcisResult\(document\)/);
  assert.doesNotMatch(content, /setInterval\([^)]*captureEoir/i);
});

test("popup exposes every EOIR review state and field", () => {
  const popupHtml = readFileSync(popupHtmlPath, "utf8");
  const popupJs = readFileSync(popupJsPath, "utf8");

  for (const state of [
    "idle",
    "reading",
    "preview",
    "matching",
    "ready-to-confirm",
    "saving",
    "linked",
    "unlinked",
    "conflict",
    "pending-offline",
  ]) {
    assert.match(popupJs, new RegExp(`['"]${state}['"]`));
  }

  assert.match(popupHtml, /id="eoir-card"/);
  assert.match(popupHtml, /id="btn-eoir-capture"/);
  assert.match(popupHtml, /id="btn-eoir-confirm"/);

  for (const field of [
    "subjectName",
    "alienNumber",
    "docketDate",
    "hearingDate",
    "hearingTime",
    "hearingType",
    "appearanceMode",
    "judge",
    "courtAddress",
    "courtPhone",
    "caseStatus",
    "biaStatus",
    "sourceUrl",
    "capturedAt",
  ]) {
    assert.match(popupJs, new RegExp(`\\b${field}\\b`));
  }
});

test("preview and confirmed save use one persisted capture ID", () => {
  const popup = readFileSync(popupJsPath, "utf8");

  assert.match(popup, /crypto\.randomUUID\(\)/);
  assert.match(popup, /\/eoir-captures\/preview-match/);
  assert.match(popup, /\/eoir-captures['"`]/);
  assert.match(popup, /staffConfirmed:\s*true/);
  assert.match(popup, /chrome\.storage\.local\.set\([^)]*EOIR_PENDING_KEY/s);
  assert.match(popup, /chrome\.storage\.local\.remove\(\[EOIR_PENDING_KEY\]\)/);
  assert.match(popup, /captureButton\.disabled = busy \|\| Boolean\(eoirPending\)/);
});

test("one explicit capture action routes only the active EOIR or CBP result", () => {
  const popup = readFileSync(popupJsPath, "utf8");

  assert.match(popup, /async function captureGovernmentResult/);
  assert.match(popup, /isEoirAcisUrl\(tab\.url\)[\s\S]*captureEoirResult\(tab\)/);
  assert.match(popup, /isCbpI94Url\(tab\.url\)[\s\S]*captureCbpResult/);
  assert.match(popup, /sendToTabContent\(tab,\s*\{\s*type:\s*['"]ARREGLO_CAPTURE_EOIR_RESULT['"]/);
  assert.match(popup, /sendToTabContent\(tab,\s*\{\s*type:\s*['"]EXTRACT_CBP['"]/);
  assert.match(popup, /ARREGLO_CAPTURE_EOIR_RESULT/);
  assert.match(popup, /EXTRACT_CBP/);
});

test("save conflict keeps the pending ID retryable", () => {
  const popup = readFileSync(popupJsPath, "utf8");

  assert.match(
    popup,
    /const canRetry = state === EOIR_STATES\.PENDING_OFFLINE\s*\|\| \(state === EOIR_STATES\.CONFLICT && Boolean\(eoirPending\)\)/,
  );
  assert.match(popup, /if \(eoirPending\) \{\s*await saveEoirPending\(\);/);
});

test("EOIR UI source contains no ACIS automation", () => {
  const content = readFileSync(contentPath, "utf8");
  const popup = readFileSync(popupJsPath, "utf8");
  const eoirSources = `${content}\n${popup}`;

  assert.doesNotMatch(eoirSources, /acis[\s\S]{0,120}\.click\(/i);
  assert.doesNotMatch(eoirSources, /acis[\s\S]{0,120}\.submit\(/i);
  assert.doesNotMatch(eoirSources, /acis[\s\S]{0,120}(location|navigate|href)\s*=/i);
  assert.doesNotMatch(eoirSources, /captcha[\s\S]{0,120}(solve|bypass|click)/i);
});

test("loading content.js on ACIS cannot start the USCIS address watcher", () => {
  const content = readFileSync(contentPath, "utf8");

  assert.match(
    content,
    /function startUspsAddressWatcher\(\) \{\s*if \(location\.hostname !== ['"]my\.uscis\.gov['"]\) return;/,
  );
});
