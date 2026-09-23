// Arreglo Content Script - CBP I-94 import

const ARREGLO_CBP_RECENT_RESULT_URL = '/search/recent-search/results';
const ARREGLO_CBP_HISTORY_RESULT_URL = '/search/history-search/results';

function normalizeText(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function normalizeKey(value) {
  return normalizeText(value).toLowerCase().replace(/[^a-z0-9]/g, '');
}

function normalizeDate(value) {
  const raw = normalizeText(value);
  if (!raw) return '';
  let m = raw.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (m) return `${m[3]}-${m[1].padStart(2, '0')}-${m[2].padStart(2, '0')}`;
  m = raw.match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})$/);
  if (m) return `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`;
  m = raw.match(/^(\d{4})\s+([A-Za-z]+)\s+(\d{1,2})$/);
  if (m) {
    const month = {
      january: '01', february: '02', march: '03', april: '04',
      may: '05', june: '06', july: '07', august: '08',
      september: '09', october: '10', november: '11', december: '12',
    }[m[2].toLowerCase()];
    if (month) return `${m[1]}-${month}-${m[3].padStart(2, '0')}`;
  }
  const parsed = Date.parse(raw);
  if (!Number.isNaN(parsed)) return new Date(parsed).toISOString().slice(0, 10);
  return raw;
}

const LABEL_MAP = {
  i94number: 'i94Number',
  i94recordnumber: 'i94Number',
  admissioni94recordnumber: 'i94Number',
  mostrecentdateofentry: 'lastEntryDate',
  arrivalissueddate: 'lastEntryDate',
  dateofentry: 'lastEntryDate',
  entrydate: 'lastEntryDate',
  arrivaldate: 'lastEntryDate',
  admituntildate: 'i94StatusExpiry',
  admituntil: 'i94StatusExpiry',
  admituntilthisdate: 'i94StatusExpiry',
  classofadmission: 'lastEntryStatus',
  status: 'lastEntryStatus',
  portofentry: 'entryPort',
  placeofentry: 'entryPort',
  firstgivenname: 'givenName',
  firstgivennamefirst: 'givenName',
  firstname: 'givenName',
  givenname: 'givenName',
  lastfamilyname: 'familyName',
  lastsurname: 'familyName',
  lastname: 'familyName',
  familyname: 'familyName',
  surname: 'familyName',
  dateofbirth: 'dob',
  birthdate: 'dob',
  passportnumber: 'passportNumber',
  documentnumber: 'passportNumber',
  countryofissuance: 'passportCountry',
  passportcountryofissuance: 'passportCountry',
  countryofcitizenship: 'nationality',
  citizenship: 'nationality',
};

const DATE_FIELDS = new Set(['lastEntryDate', 'i94StatusExpiry', 'dob']);

function assignField(record, label, value) {
  const key = LABEL_MAP[normalizeKey(label)];
  const cleanValue = normalizeText(value);
  if (!key || !cleanValue) return;
  record[key] = DATE_FIELDS.has(key) ? normalizeDate(cleanValue) : cleanValue;
}

function extractFromTables(root, record) {
  for (const row of root.querySelectorAll('tr')) {
    const cells = [...row.querySelectorAll('th,td')].map(cell => normalizeText(cell.textContent));
    if (cells.length < 2) continue;

    if (cells.length === 2) {
      assignField(record, cells[0], cells[1]);
      continue;
    }

    for (let i = 0; i < cells.length - 1; i += 2) {
      assignField(record, cells[i], cells[i + 1]);
    }
  }
}

function getCellText(row) {
  return [...row.querySelectorAll('th,td')].map(cell => normalizeText(cell.textContent));
}

function extractTravelHistory(root = document) {
  const trips = [];

  for (const table of root.querySelectorAll('table')) {
    const rows = [...table.querySelectorAll('tr')].map(getCellText).filter(cells => cells.length);
    const headerIndex = rows.findIndex(cells => {
      const keys = cells.map(normalizeKey);
      return keys.includes('date') && keys.includes('type') && keys.includes('location');
    });
    if (headerIndex === -1) continue;

    const headers = rows[headerIndex].map(normalizeKey);
    const dateIndex = headers.indexOf('date');
    const typeIndex = headers.indexOf('type');
    const locationIndex = headers.indexOf('location');

    for (const cells of rows.slice(headerIndex + 1)) {
      const date = normalizeDate(cells[dateIndex]);
      const type = normalizeText(cells[typeIndex]);
      const location = normalizeText(cells[locationIndex]);
      if (!date || !type || !location) continue;
      trips.push({ date, type, location });
    }
  }

  return trips;
}

function extractFromDefinitionLists(root, record) {
  const terms = [...root.querySelectorAll('dt')];
  for (const term of terms) {
    const valueEl = term.nextElementSibling;
    if (valueEl?.tagName === 'DD') assignField(record, term.textContent, valueEl.textContent);
  }
}

function extractFromNearbyText(root, record) {
  const candidates = [...root.querySelectorAll('label, strong, b, span, div, p')];
  for (const el of candidates) {
    const text = normalizeText(el.textContent);
    if (!text || text.length > 100) continue;

    const colon = text.match(/^([^:]{3,60}):\s*(.+)$/);
    if (colon) {
      assignField(record, colon[1], colon[2]);
      continue;
    }

    const mapped = LABEL_MAP[normalizeKey(text)];
    if (!mapped) continue;

    const ariaFor = el.getAttribute('for');
    const forValue = ariaFor ? root.getElementById?.(ariaFor)?.value : '';
    const siblingValue = normalizeText(el.nextElementSibling?.textContent || el.parentElement?.nextElementSibling?.textContent);
    assignField(record, text, forValue || siblingValue);
  }
}

function extractFromBodyText(root, record) {
  const bodyText = normalizeText(root.body?.innerText || root.innerText || '');
  if (!bodyText) return;

  const labels = [
    'Admission I-94 Record Number',
    'Arrival/Issued Date',
    'Class of Admission',
    'Admit Until Date',
    'Last/Surname',
    'First \\(Given\\) Name',
    'Birth Date',
    'Document Number',
    'Country of Citizenship',
  ];

  const stop = labels.join('|');
  for (const label of labels) {
    const re = new RegExp(`\\b(${label}):\\s*(.+?)(?=\\s+(?:${stop}):|$)`, 'i');
    const m = bodyText.match(re);
    if (m) assignField(record, m[1].replace(/\\/g, ''), m[2]);
  }
}

function extractI94Record(root = document) {
  const record = {};
  extractFromTables(root, record);
  extractFromDefinitionLists(root, record);
  extractFromNearbyText(root, record);
  extractFromBodyText(root, record);
  return record;
}

function extractCbpRecord(root = document) {
  const record = extractI94Record(root);
  if (record.nationality && !record.passportCountry) {
    record.passportCountry = record.nationality;
  }
  const travelHistory = extractTravelHistory(root);
  if (travelHistory.length) {
    const latestArrival = travelHistory.find(trip => normalizeKey(trip.type) === 'arrival');
    record.travelHistory = travelHistory;
    if (latestArrival) {
      record.lastEntryDate = record.lastEntryDate || latestArrival.date;
      record.entryPort = record.entryPort || latestArrival.location;
      record.travelHistoryLastType = latestArrival.type;
    }
  }
  return record;
}

let lastSyncedSignature = '';

function buildOverlay() {
  const existing = document.getElementById('arreglo-cbp-sync');
  if (existing) return existing;

  const box = document.createElement('div');
  box.id = 'arreglo-cbp-sync';
  box.style.cssText = [
    'position:fixed',
    'right:18px',
    'top:18px',
    'z-index:2147483647',
    'width:310px',
    'font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif',
    'background:#ffffff',
    'border:1px solid #cbd5e1',
    'border-radius:8px',
    'box-shadow:0 16px 40px rgba(15,23,42,.22)',
    'color:#0f172a',
    'overflow:hidden',
  ].join(';');
  box.innerHTML = `
    <div style="background:#1e3a5f;color:#fff;padding:10px 12px;font-size:13px;font-weight:700">Arreglo I-94 Import</div>
    <div id="arreglo-cbp-sync-body" style="padding:12px;font-size:12px;line-height:1.45;color:#334155">Reading CBP result...</div>
  `;
  document.documentElement.appendChild(box);
  return box;
}

function setOverlay(message, type = 'info') {
  const box = buildOverlay();
  const body = box.querySelector('#arreglo-cbp-sync-body');
  const colors = {
    info: '#334155',
    ok: '#166534',
    warn: '#92400e',
    err: '#991b1b',
  };
  body.style.color = colors[type] || colors.info;
  body.textContent = message;
}

async function syncCurrentI94() {
  const isRecentResult = window.location.pathname.includes(ARREGLO_CBP_RECENT_RESULT_URL);
  const isHistoryResult = window.location.pathname.includes(ARREGLO_CBP_HISTORY_RESULT_URL);
  if (!isRecentResult && !isHistoryResult) return;

  setOverlay(isHistoryResult ? 'Reading CBP travel history...' : 'Reading CBP I-94 result...');
  const record = extractCbpRecord();
  if (!record.i94Number && !record.lastEntryDate && !record.passportNumber) {
    setOverlay('I could not find CBP travel details on this page yet. Refresh after the result finishes loading.', 'warn');
    return;
  }

  const signature = JSON.stringify(record);
  if (signature === lastSyncedSignature) return;
  lastSyncedSignature = signature;

  try {
    const response = await chrome.runtime.sendMessage({
      type: 'CBP_I94_FOUND',
      record,
      sourceUrl: window.location.href,
    });
    if (response?.ok) {
      const label = record.i94Number || record.lastEntryDate || 'record found';
      setOverlay(`Found CBP data: ${label}. Confirm save in Arreglo side panel.`, 'ok');
    } else {
      setOverlay(response?.message || 'Found CBP data. Open Arreglo side panel to choose the client.', 'warn');
    }
  } catch (error) {
    setOverlay(`Could not save I-94: ${error.message}`, 'err');
  }
}

if (!globalThis.__ARREGLO_TEST_MODE__) {
  syncCurrentI94();
  let lastTextLength = 0;
  const observer = new MutationObserver(() => {
    const nextLength = document.body?.innerText?.length || 0;
    if (Math.abs(nextLength - lastTextLength) < 20) return;
    lastTextLength = nextLength;
    clearTimeout(observer._timer);
    observer._timer = setTimeout(syncCurrentI94, 600);
  });
  observer.observe(document.documentElement, { childList: true, subtree: true, characterData: true });
}

if (typeof globalThis !== 'undefined' && globalThis.__ARREGLO_TEST_MODE__) {
  globalThis.__ARREGLO_CBP_TEST__ = {
    assignField,
    extractCbpRecord,
    extractI94Record,
    extractTravelHistory,
    normalizeDate,
    normalizeKey,
  };
}
