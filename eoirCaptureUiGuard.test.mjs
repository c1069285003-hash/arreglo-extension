import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";

const manifestPath = new URL("./manifest.json", import.meta.url);
const contentPath = new URL("./content.js", import.meta.url);
const popupHtmlPath = new URL("./popup.html", import.meta.url);
const popupJsPath = new URL("./popup.js", import.meta.url);
const pendingStatePath = new URL("./eoirPendingState.js", import.meta.url);

function makePopupElement(id) {
  const listeners = {};
  return {
    id,
    listeners,
    style: {},
    dataset: {},
    classList: {
      add() {},
      toggle() {},
    },
    addEventListener(type, listener) {
      listeners[type] = listener;
    },
    innerHTML: "",
    textContent: "",
    value: "",
    disabled: false,
  };
}

function loadPopupWithTabsQuery(tabsQuery) {
  const popupHtml = readFileSync(popupHtmlPath, "utf8");
  const ids = [...popupHtml.matchAll(/id="([^"]+)"/g)].map((match) => match[1]);
  const elements = Object.fromEntries(ids.map((id) => [id, makePopupElement(id)]));
  const local = {
    get(keys, callback) {
      if (typeof callback === "function") {
        callback({});
        return undefined;
      }
      return Promise.resolve({});
    },
    set() {
      return Promise.resolve();
    },
    remove() {
      return Promise.resolve();
    },
  };
  const context = {
    URL,
    chrome: {
      runtime: {},
      scripting: {
        executeScript() {
          return Promise.resolve();
        },
      },
      storage: { local },
      tabs: {
        query: tabsQuery,
        sendMessage() {
          return Promise.resolve({});
        },
      },
    },
    clearInterval() {},
    clearTimeout() {},
    console,
    crypto: {
      randomUUID() {
        return "capture-test-id";
      },
    },
    document: {
      getElementById(id) {
        return elements[id] || null;
      },
      querySelector() {
        return null;
      },
      querySelectorAll() {
        return [];
      },
    },
    fetch() {
      return Promise.reject(new Error("fetch should not run"));
    },
    setInterval() {
      return 1;
    },
    setTimeout() {
      return 1;
    },
  };

  runInNewContext(readFileSync(pendingStatePath, "utf8"), context);
  runInNewContext(readFileSync(popupJsPath, "utf8"), context);
  return { elements, context };
}

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

test("popup exposes every EOIR review state and keeps the full capture payload", () => {
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

  assert.match(popupJs, /fields:\s*\{\s*\.\.\.response\.fields,\s*capturedAt:/s);
  assert.match(popupJs, /fields:\s*eoirDraft\.fields/);
  assert.match(popupJs, /JSON\.stringify\(eoirPending\)/);
});

test("EOIR preview separates and normalizes hearing type while hiding audit metadata", () => {
  const { elements, context } = loadPopupWithTabsQuery(async () => []);
  const fields = {
    subjectName: "DOE, JANE",
    alienNumber: "123456789",
    docketDate: "July 1, 2026",
    hearingDate: "August 2, 2026",
    hearingTime: "1:00 PM",
    hearingType: "Individual Hearing",
    appearanceMode: "Internet-based",
    judge: "Jane Judge",
    courtAddress: "123 Court St",
    courtPhone: "555-0100",
    caseStatus: "This case is pending.",
    biaStatus: "No appeal was received for this case.",
    sourceUrl: "https://acis.eoir.justice.gov/en/caseInformation",
    capturedAt: "2026-07-27T00:52:35.839Z",
  };

  context.renderEoirPreview(fields);

  const html = elements["eoir-preview"].innerHTML;
  assert.match(html, /<dt>Hearing<\/dt><dd>August 2, 2026 · 1:00 PM<\/dd>/);
  assert.match(html, /<dt>Hearing type<\/dt><dd>Individual<\/dd>/);
  assert.match(html, /<dt>Appearance<\/dt><dd>Internet-based<\/dd>/);
  assert.doesNotMatch(html, /Individual Hearing/);
  assert.doesNotMatch(html, /Case status|This case is pending\./);
  assert.doesNotMatch(html, /BIA status|No appeal was received/);
  assert.doesNotMatch(html, /Source|acis\.eoir\.justice\.gov/);
  assert.doesNotMatch(html, /Capture time|2026-07-27/);

  fields.hearingType = "Master Calendar Hearing";
  context.renderEoirPreview(fields);
  assert.match(elements["eoir-preview"].innerHTML, /<dt>Hearing type<\/dt><dd>Master<\/dd>/);
});

test("preview and confirmed save use one persisted capture ID", () => {
  const popup = readFileSync(popupJsPath, "utf8");
  const pendingState = readFileSync(pendingStatePath, "utf8");

  assert.match(popup, /crypto\.randomUUID\(\)/);
  assert.match(popup, /\/eoir-captures\/preview-match/);
  assert.match(popup, /\/eoir-captures['"`]/);
  assert.match(pendingState, /staffConfirmed:\s*true/);
  assert.match(pendingState, /storage\.set\(\{ \[pendingKey\]: target \}\)/);
  assert.match(pendingState, /storage\.remove\(\[pendingKey\]\)/);
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

test("a tabs.query failure is shown after Capture EOIR instead of becoming an unhandled rejection", async () => {
  const { elements } = loadPopupWithTabsQuery(async () => {
    throw new Error("tab access failed after extension reload");
  });
  const captureButton = elements["btn-eoir-capture"];

  await captureButton.listeners.click();

  assert.equal(elements["eoir-card"].dataset.state, "idle");
  assert.match(elements["eoir-state"].textContent, /tab access failed after extension reload/);
});

test("save conflict keeps the pending ID retryable", () => {
  const popup = readFileSync(popupJsPath, "utf8");

  assert.match(
    popup,
    /const canRetry = state === EOIR_STATES\.PENDING_OFFLINE\s*\|\| \(state === EOIR_STATES\.CONFLICT && Boolean\(eoirPending\)\)/,
  );
  assert.match(popup, /if \(eoirPendingState\.getPending\(\)\) \{\s*await saveEoirPending\(\);/);
});

test("popup delegates the confirmed pending lifecycle to the runtime state guard", () => {
  const popupHtml = readFileSync(popupHtmlPath, "utf8");
  const popup = readFileSync(popupJsPath, "utf8");

  assert.ok(
    popupHtml.indexOf('src="eoirPendingState.js"') < popupHtml.indexOf('src="popup.js"'),
    "pending state runtime must load before popup orchestration",
  );
  assert.match(popup, /createEoirPendingState\(\{\s*storage:\s*chrome\.storage\.local,\s*pendingKey:\s*EOIR_PENDING_KEY/s);
  assert.match(popup, /if \(!eoirPendingState\.tryBeginCapture\(\)\)/);
  assert.match(popup, /eoirPendingState\.beginConfirmation\(eoirDraft\)/);
  assert.match(popup, /await eoirPendingState\.ensurePersisted\(\)/);
  assert.match(popup, /await eoirPendingState\.finishSave\(/);
  assert.doesNotMatch(popup, /chrome\.storage\.local\.(?:set|remove)\([^)]*EOIR_PENDING_KEY/s);
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
