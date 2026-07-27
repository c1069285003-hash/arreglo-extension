const MONTHS = {
  january: "01", february: "02", march: "03", april: "04",
  may: "05", june: "06", july: "07", august: "08",
  september: "09", october: "10", november: "11", december: "12",
};

function visibleText(value) {
  return String(value || "")
    .replace(/\r/g, "")
    .split("\n")
    .map((line) => line.trim().replace(/\s+/g, " "))
    .filter(Boolean)
    .join("\n");
}

function labeledValue(text, label) {
  const match = text.match(new RegExp(`(?:^|\\n|\\|\\s*)${label}\\s*:\\s*([^\\n|]+)`, "i"));
  return match ? match[1].trim() : "";
}

function isCalendarDate(year, month, day) {
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year
    && date.getUTCMonth() === month - 1
    && date.getUTCDate() === day;
}

function formatEnglishDate(value) {
  const match = String(value || "").trim().match(/^([A-Za-z]+)\s+(\d{1,2}),\s+(\d{4})$/);
  if (!match || !MONTHS[match[1].toLowerCase()]) return "";
  const month = Number(MONTHS[match[1].toLowerCase()]);
  const day = Number(match[2]);
  const year = Number(match[3]);
  if (!isCalendarDate(year, month, day)) return "";
  return `${String(month).padStart(2, "0")}/${String(day).padStart(2, "0")}/${year}`;
}

function formatNumericDate(value) {
  const match = String(value || "").trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!match) return "";
  const month = Number(match[1]);
  const day = Number(match[2]);
  const year = Number(match[3]);
  if (!isCalendarDate(year, month, day)) return "";
  return `${String(month).padStart(2, "0")}/${String(day).padStart(2, "0")}/${year}`;
}

function error(message) {
  return { ok: false, error: message };
}

export function normalizeAlienNumber(value) {
  const digits = String(value || "").replace(/\D/g, "");
  return digits.length === 9 ? digits : "";
}

export function parseEoirAcisText(text, sourceUrl = "") {
  const visible = visibleText(text);
  if (!visible) return error("EOIR ACIS did not show any visible result text.");

  const headerMatch = visible.match(/^([^\n()]+?)\s*\(\s*(?:A-?)?\d[\d -]*\)/m);
  const namedValue = labeledValue(visible, "Name");
  const subjectName = (namedValue || (headerMatch && headerMatch[1]) || "").trim();
  const nameParts = subjectName.match(/^([^,]+),\s*(.+)$/);
  const labeledAlienNumber = labeledValue(visible, "A-?Number");
  const headerAlienNumber = headerMatch && headerMatch[0].match(/\(([^)]+)\)/);
  const rawAlienNumber = labeledAlienNumber || (headerAlienNumber && headerAlienNumber[1]) || "";
  const alienNumber = normalizeAlienNumber(rawAlienNumber);
  const hasCompleteResultIdentity = Boolean(
    nameParts
    && nameParts[1].trim()
    && nameParts[2].trim()
    && alienNumber,
  );

  // ACIS includes hCaptcha branding in the shared footer even after a valid
  // result renders. Treat challenge/search text as blocking only when the
  // page does not also expose a complete visible result identity.
  if (!hasCompleteResultIdentity
      && /captcha|verify you are human|i acknowledge and agree|case information search/i.test(visible)) {
    return error("EOIR ACIS is not displaying a case result.");
  }
  if (!nameParts || !nameParts[1].trim() || !nameParts[2].trim()) {
    return error("EOIR ACIS result is missing a full name.");
  }
  if (!alienNumber) return error("EOIR ACIS result is missing a valid A-Number.");

  const hearingMatch = visible.match(
    /Your upcoming\s+(.+?)\s+hearing\s+is\s+(.+?)\s+on\s+([A-Za-z]+\s+\d{1,2},\s+\d{4})\s+at\s+([0-9]{1,2}:\d{2}\s*[AP]M)\.?/i,
  );
  const judgeMatch = visible.match(/(?:^|\n)Judge\s+([^\n]+)/i);
  const caseStatusMatch = visible.match(/(?:^|\n)(This case is [^\n]+\.)/i);
  const biaStatusMatch = visible.match(/(?:^|\n)(No appeal was received for this case\.)/i);
  const phoneMatch = visible.match(/Phone Number\s*([^\n]+)/i);
  const docketRaw = labeledValue(visible, "Docket Date");
  const addressMatch = visible.match(/(?:^|\n)Court Address\n([\s\S]*?)(?=\n(?:This case is|No appeal was|Phone Number|Judge\b)|$)/i);
  const rawAddress = addressMatch ? addressMatch[1].trim() : "";
  const address = rawAddress
    ? rawAddress.split("\n").map((line) => line.trim()).filter(Boolean).join(", ")
    : "";

  const rawVisibleFields = {
    subjectName,
    alienNumber: rawAlienNumber,
    docketDate: docketRaw,
    hearing: hearingMatch ? hearingMatch[0] : "",
    judge: judgeMatch ? judgeMatch[1].trim() : "",
    courtAddress: rawAddress,
    courtPhone: phoneMatch ? phoneMatch[1].trim() : "",
    caseStatus: caseStatusMatch ? caseStatusMatch[1].trim() : "",
    biaStatus: biaStatusMatch ? biaStatusMatch[1].trim() : "",
  };

  return {
    ok: true,
    fields: {
      subjectName,
      familyName: nameParts[1].trim(),
      givenName: nameParts[2].trim(),
      alienNumber,
      docketDate: formatNumericDate(docketRaw),
      hearingDate: hearingMatch ? formatEnglishDate(hearingMatch[3]) : "",
      hearingTime: hearingMatch ? hearingMatch[4].replace(/\s+/g, " ").trim() : "",
      hearingType: hearingMatch ? hearingMatch[1].trim() : "",
      appearanceMode: hearingMatch ? hearingMatch[2].trim() : "",
      judge: judgeMatch ? judgeMatch[1].trim() : "",
      courtAddress: address,
      courtPhone: phoneMatch ? phoneMatch[1].trim() : "",
      caseStatus: caseStatusMatch ? caseStatusMatch[1].trim() : "",
      biaStatus: biaStatusMatch ? biaStatusMatch[1].trim() : "",
      sourceUrl: String(sourceUrl || ""),
      rawVisibleFields,
    },
  };
}

export function parseEoirAcisResult(root) {
  if (!root) return error("EOIR ACIS result root is unavailable.");
  const renderedRoot = typeof root.innerText === "string" ? root : root.body;
  if (!renderedRoot || typeof renderedRoot.innerText !== "string") {
    return error("EOIR ACIS result root does not expose rendered visible text.");
  }
  const text = renderedRoot.innerText;
  const sourceUrl = root.baseURI
    || renderedRoot.baseURI
    || (renderedRoot.ownerDocument && renderedRoot.ownerDocument.location && renderedRoot.ownerDocument.location.href)
    || "";
  return parseEoirAcisText(text, sourceUrl);
}
