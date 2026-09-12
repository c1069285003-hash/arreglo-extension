const WORKER = 'https://xinyuan.angie-li-business.workers.dev';
const EOIR_PENDING_KEY = 'arreglo_eoir_pending_capture';
const EOIR_PREVIEW_ENDPOINT = '/eoir-captures/preview-match';
const EOIR_SAVE_ENDPOINT = '/eoir-captures';
const EOIR_CRM_CREATE_URL = 'https://xinyuan-crm.pages.dev/';
const EOIR_STATES = Object.freeze({
  IDLE: 'idle',
  READING: 'reading',
  PREVIEW: 'preview',
  MATCHING: 'matching',
  READY: 'ready-to-confirm',
  SAVING: 'saving',
  LINKED: 'linked',
  UNLINKED: 'unlinked',
  UNLINKED_CREATE_CHOICE: 'unlinked-create-choice',
  CONFLICT: 'conflict',
  PENDING_OFFLINE: 'pending-offline',
});
const eoirPendingState = createEoirPendingState({
  storage: chrome.storage.local,
  pendingKey: EOIR_PENDING_KEY,
});
const PAGE_LABELS = {
  cbp_i94: 'CBP I-94 记录页',
  legal_assistance: 'Legal Assistance',
  preparer_family: 'Preparer — Family Member?',
  preparer_info: 'Preparer Information',
  your_name: 'Your Name',
  contact: 'Contact Information',
  birth: 'When & Where You Were Born',
  describe_yourself: 'Describe Yourself',
  residence_history_1: 'Where You Have Lived (Last Outside US)',
  residence_history_3: 'Where You Have Lived (Additional)',
  school: 'Your School History',
  employment: 'Your Employment History',
  immigration_info_1: 'Your Immigration Information',
  immigration_info_2: 'Other Information',
  marital_status: 'Your Marital Status',
  children_yn: 'Your Children (Yes/No)',
  children_count: 'Number of Children',
  child_0_name: 'Child 1 — Name',
  child_0_info: 'Child 1 — Details',
  mother: 'Your Mother',
  father: 'Your Father',
  siblings: 'Your Siblings',
  eligibility_reason: 'Reason for Asylum or Withholding',
};

// Fields to preview per page — shown in sidebar as contextual info
const PAGE_PREVIEW_FIELDS = {
  legal_assistance:   [],
  preparer_family:    [],
  preparer_info: [
    { label: 'First Name', key: '_preparer_firstName' },
    { label: 'Last Name',  key: '_preparer_lastName' },
    { label: 'Phone',      key: '_preparer_phone' },
    { label: 'Address',    key: '_preparer_address' },
    { label: 'City',       key: '_preparer_city' },
    { label: 'State',      key: '_preparer_state' },
    { label: 'ZIP',        key: '_preparer_zip' },
  ],
  your_name: [
    { label: 'First Name',   key: 'givenName' },
    { label: 'Middle Name',  key: 'middleName' },
    { label: 'Last Name',    key: 'familyName' },
  ],
  contact: [
    { label: 'Address',  key: 'usAddressLine1' },
    { label: 'City',     key: 'usCity' },
    { label: 'State',    key: 'usState' },
    { label: 'ZIP',      key: 'usZip' },
    { label: 'Phone',    key: 'phone' },
  ],
  birth: [
    { label: 'DOB',         key: 'dob' },
    { label: 'City of Birth', key: 'cityOfBirth' },
    { label: 'Country of Birth', key: 'countryOfBirth' },
    { label: 'Nationality', key: 'nationality' },
  ],
  describe_yourself: [
    { label: 'Gender',    key: 'sex' },
    { label: 'Ethnicity', key: 'ethnicity' },
    { label: 'Religion',  key: 'religion' },
    { label: 'Language',  key: 'nativeLanguage' },
  ],
  residence_history_1: null,   // address-driven — handled separately
  residence_history_3: null,
  immigration_info_1: [
    { label: 'Nationality',     key: 'nationality' },
    { label: 'I-94 Number',     key: 'i94Number' },
    { label: 'Date of Entry',   key: 'lastEntryDate' },
    { label: 'Port of Entry',   key: 'entryPort' },
    { label: 'Entry Status',    key: 'lastEntryStatus' },
    { label: 'Status Expires',  key: 'i94StatusExpiry' },
  ],
  immigration_info_2: [
    { label: 'Court History',   key: 'courtHistory' },
    { label: 'A-Number',        key: 'alienNumber' },
    { label: 'SSN',             key: 'ssn' },
  ],
  marital_status: [
    { label: 'Marital Status',    key: 'maritalStatus' },
    { label: 'Marriage Date',     key: 'marriageDate' },
    { label: 'Marriage Location', key: 'marriagePlace' },
  ],
  mother: [
    { label: 'First Name',  key: 'motherFirstName' },
    { label: 'Last Name',   key: 'motherLastName' },
    { label: 'Birth City',  key: 'motherBirthCity' },
    { label: 'Birth Country', key: 'motherBirthCountry' },
    { label: 'Location',    key: 'motherCurrentCity' },
  ],
  father: [
    { label: 'First Name',  key: 'fatherFirstName' },
    { label: 'Last Name',   key: 'fatherLastName' },
    { label: 'Birth City',  key: 'fatherBirthCity' },
    { label: 'Birth Country', key: 'fatherBirthCountry' },
    { label: 'Location',    key: 'fatherCurrentCity' },
  ],
  siblings: [
    { label: 'Count',       key: 'siblingsCount' },
    { label: 'Sib 1 Last',  key: '_sib0_lastName' },
    { label: 'Sib 1 First', key: '_sib0_firstName' },
    { label: 'Birth City',  key: '_sib0_birthCity' },
    { label: 'Country',     key: '_sib0_birthCountry' },
  ],
  eligibility_reason: [
    { label: 'Convention Against Torture', key: '_cat' },
    { label: 'Selected basis', key: '_basis' },
    { label: 'Past mistreatment', key: '_past' },
    { label: 'Fear upon return', key: '_fear' },
    { label: 'Fear of torture', key: '_torture' },
    { label: 'Explanation', key: '_explanation' },
  ],
};

const PREPARER = {
  firstName: 'Lauren',
  lastName:  'Zhou',
  phone:     '(626) 613-7634',
  address:   '3380 Flair Dr.',
  city:      'El Monte',
  state:     'CA',
  zip:       '91731',
};

let clientData = null;
let selectedAddressIndex = 0;
let selectedSchoolIndex = 0;   // index into the SORTED (highest-first) school list
let selectedWorkIndex = 0;     // which CRM work history entry to fill into the open employment editor
let selectedChildIndex = 0;    // which child's data to fill into the open "Add child" editor
let currentPage = 'unknown';
let eoirDraft = null;
let eoirMatchState = '';
let eoirUnlinkedCaptureId = '';
let eoirCreateOpening = false;

// ── School helpers (must match content.js sorting exactly) ────────────────────
const EDU_LEVEL_RANK = [
  { rank: 7, match: /博士|doctor|phd|ph\.d/i },
  { rank: 6, match: /硕士|master|研究生|graduate school/i },
  { rank: 5, match: /本科|大学|bachelor|university|undergrad/i },
  { rank: 4, match: /大专|专科|associate|college/i },
  { rank: 3, match: /高中|职高|中专|技校|high school|vocational|technical/i },
  { rank: 2, match: /初中|middle school|junior/i },
  { rank: 1, match: /小学|elementary|primary/i },
];
function eduRank(edu) {
  const s = `${edu.level || ''} ${edu.school || ''}`;
  for (const { rank, match } of EDU_LEVEL_RANK) if (match.test(s)) return rank;
  return 0;
}
function getSortedSchools() {
  return [...(clientData?.eduList || [])]
    .filter(e => e && (e.school || e.level))
    .sort((a, b) => {
      const r = eduRank(b) - eduRank(a);
      if (r !== 0) return r;
      return (parseInt(b.endYear || b.endDate || 0) || 0) - (parseInt(a.endYear || a.endDate || 0) || 0);
    });
}

function setStatus(el, msg, type) {
  el.className = `status-box status-${type}`;
  el.textContent = msg;
  el.style.display = 'block';
  el.style.marginTop = '10px';
}

function renderLoadedClient(caseNum, saved) {
  document.getElementById('step-login').style.display = 'none';
  document.getElementById('step-fill').style.display = 'block';
  document.getElementById('case-number').value = caseNum;
  document.getElementById('client-card').innerHTML = `
    <div class="client-card">
      <div class="client-name">${saved.familyName || ''}, ${saved.givenName || ''}</div>
      <div class="client-meta">Case: ${caseNum} · DOB: ${saved.dob || '—'}</div>
      <div class="client-meta">Nationality: ${saved.nationality || saved.countryOfBirth || '—'}</div>
      <div class="client-meta">Synced: ${new Date().toLocaleTimeString()}</div>
    </div>
  `;
}

async function loadClientFromCloudflare(caseNum, { silent = false, requireInfoSheet = false, resetAddressIndex = false } = {}) {
  if (!caseNum) return null;
  const statusEl = document.getElementById(silent ? 'fill-status' : 'load-status');
  const res = await fetch(`${WORKER}/case/${encodeURIComponent(caseNum)}`);
  if (!res.ok) {
    if (!silent) setStatus(statusEl, `❌ Cloudflare HTTP ${res.status} — /case/${caseNum} 不可达（Worker/网络问题，非插件问题）`, 'err');
    return null;
  }

  let json;
  try { json = await res.json(); }
  catch (e) {
    if (!silent) setStatus(statusEl, '❌ Worker 返回的不是 JSON — 检查 Worker 部署', 'err');
    return null;
  }
  console.log('[arreglo] /case response:', json);

  // v1.32+: accept multiple worker response shapes
  const client = json.client || json.case || json.data || (json.caseNumber ? json : null);
  if ((json.success === false) || !client) {
    if (!silent) setStatus(statusEl, `❌ Case ${caseNum} not found — Worker 返回: ${JSON.stringify(json).slice(0,120)}`, 'err');
    return null;
  }

  const saved = { ...(client.infoFormData || {}) };
  if (!saved.familyName && !saved.givenName) {
    if (requireInfoSheet) {
      setStatus(statusEl, '❌ Cloudflare 英文信息表还没有 staff 保存版；先在 CRM → Info Form → Save 成功后再 Fill USCIS。', 'err');
      return null;
    }
    // Soft warning for CBP capture only. USCIS fill calls this function with
    // requireInfoSheet=true so draft mini-program data cannot become filing data.
    if (!silent) setStatus(statusEl, '⚠️ 英文信息表未保存（CRM → Info Form → Save）— 已用小程序数据加载，可先做 CBP 捕获', 'warn');
    const f = client.formData || {};
    saved.familyName = saved.familyName || f.lastNamePinyin || '';
    saved.givenName  = saved.givenName  || f.firstNamePinyin || '';
    saved.dob        = saved.dob        || f.dob || '';
    saved.passportNumber = saved.passportNumber || f.passportNumber || '';
  }

  clientData = saved;
  if (resetAddressIndex) selectedAddressIndex = 0;
  await chrome.storage.local.set({
    arreglo_data: saved,
    arreglo_case: caseNum,
    arreglo_address_index: selectedAddressIndex,
    arreglo_synced_at: new Date().toISOString(),
  });

  renderLoadedClient(caseNum, saved);
  renderAddressSelector(currentPage);
  renderSchoolSelector(currentPage);
  renderWorkSelector(currentPage);
  renderChildSelector(currentPage);
  renderFieldPreview(currentPage);
  return saved;
}

async function getUscisTab() {
  const tabs = await chrome.tabs.query({ url: 'https://my.uscis.gov/*' });
  return tabs[0] || null;
}

async function getActiveTab() {
  const uscisTab = await getUscisTab();
  if (uscisTab) return uscisTab;
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

const SUPPORTED_HOSTS = /(^|\.)my\.uscis\.gov$|(^|\.)i94\.cbp\.dhs\.gov$/;
async function sendToTabContent(tab, msg, retries = 3) {
  if (!tab?.id) throw new Error('No supported government tab is open.');
  let fallbackScript = 'content.js';
  try {
    if (new URL(tab.url || '').hostname === 'acis.eoir.justice.gov') {
      fallbackScript = 'eoirContent.js';
    }
  } catch (e) {}
  for (let i = 0; i < retries; i++) {
    try {
      return await chrome.tabs.sendMessage(tab.id, msg);
    } catch(e) {
      const isConnErr = e.message && (
        e.message.includes('Receiving end does not exist') ||
        e.message.includes('Could not establish connection')
      );
      if (!isConnErr || i === retries - 1) throw e;
      // Content script not ready yet — inject it and retry
      try {
        await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          files: [fallbackScript]
        });
      } catch(_) {}
      await new Promise(r => setTimeout(r, 600));
    }
  }
}

async function sendToContent(msg, retries = 3) {
  // v1.32: prefer the ACTIVE tab when it's a supported site — previously a
  // background USCIS tab hijacked messages while staff worked on CBP.
  const active = await getActiveTab();
  let tab = null;
  try { if (active && SUPPORTED_HOSTS.test(new URL(active.url || '').hostname)) tab = active; } catch (e) {}
  if (!tab) tab = await getUscisTab() || active;
  if (!tab) throw new Error('No USCIS tab found. Please open my.uscis.gov first.');
  return sendToTabContent(tab, msg, retries);
}


// ── Smart address classification (mirror of content.js v1.28) ─────────────────
function _parseYM(ym) {
  if (!ym) return { month: '', year: '' };
  let m = String(ym).match(/^(\d{4})[\/\-](\d{1,2})$/);
  if (m) return { year: m[1], month: m[2].padStart(2, '0') };
  m = String(ym).match(/^(\d{1,2})\/(\d{4})$/);
  if (m) return { year: m[2], month: m[1].padStart(2, '0') };
  m = String(ym).match(/^(\d{4})$/);
  if (m) return { year: m[1], month: '' };
  return { month: '', year: '' };
}
function _ymToNum(ym) {
  const { year, month } = _parseYM(ym);
  if (!year) return null;
  return parseInt(year) * 12 + (parseInt(month || '1') - 1);
}
function _aFrom(a) { return a.fromDate || (a.fromYear ? `${a.fromYear}/${String(a.fromMonth||'01').padStart(2,'0')}` : ''); }
function _aTo(a)   { return a.toDate   || (a.toYear   ? `${a.toYear}/${String(a.toMonth||'01').padStart(2,'0')}`   : ''); }
function _normCountry(c) { return (c || '').trim().toLowerCase().replace(/^people'?s republic of\s+/, '').replace(/^pr\s+/, ''); }

function classifyAddresses(d) {
  const warnings = [];
  const persecutionCountry = _normCountry(d.nationality || d.countryOfBirth || 'China');
  const now = new Date();
  const nowNum = now.getFullYear() * 12 + now.getMonth();
  const fiveYearsAgo = nowNum - 60;

  let usCurrent = null;
  if (d.usAddressLine1 || d.usCity) {
    let fromDate = '';
    const m = (d.lastEntryDate || '').match(/^(\d{2})\/\d{2}\/(\d{4})$/);
    if (m) fromDate = `${m[2]}/${m[1]}`;
    usCurrent = {
      addressLine1: d.usAddressLine1 || '', addressLine2: d.usAddressLine2 || '',
      city: d.usCity || '', province: d.usState || '', country: 'United States',
      postalCode: d.usZip || '', fromDate, toDate: '', _isUS: true, _role: 'US_CURRENT',
    };
  } else warnings.push('缺少美国现住址');

  const hist = (d.addressHistory || []).map(a => ({ ...a }));
  const nonUS = hist.filter(a => _normCountry(a.country || 'china') !== 'united states');
  // Recency: real toDate wins; blank toDate but a fromDate = ongoing→present (latest);
  // no dates at all = unknown → oldest. (Keeps display order in sync with content.js
  // so an undated address no longer jumps to "last outside US".)
  const _recencyKey = a => { const t = _ymToNum(_aTo(a)); if (t != null) return t; return (_ymToNum(_aFrom(a)) != null) ? Infinity : -Infinity; };
  nonUS.sort((a, b) => _recencyKey(b) - _recencyKey(a));
  const lastOutsideUs = nonUS[0] || null;
  if (lastOutsideUs) {
    lastOutsideUs._role = 'LAST_OUTSIDE_US';
    const c = _normCountry(lastOutsideUs.country || 'china');
    lastOutsideUs._fromPersecutionCountry = (c === persecutionCountry || c === '');
    if (!lastOutsideUs._fromPersecutionCountry) {
      warnings.push(`来美前最后地址在 ${lastOutsideUs.country}，非受迫害国`);
    }
  } else warnings.push('没有非美国地址');

  const last5 = [];
  for (const a of hist) {
    const from = _ymToNum(_aFrom(a));
    const to = _ymToNum(_aTo(a));
    const intersects = (to === null || to >= fiveYearsAgo) && (from === null || from <= nowNum);
    if (from === null && to === null) { warnings.push(`地址缺日期: ${a.addressLine1 || a.city || ''}`); last5.push(a); }
    else if (intersects) last5.push(a);
  }
  last5.sort((a, b) => ((_ymToNum(_aTo(b)) ?? -Infinity) - (_ymToNum(_aTo(a)) ?? -Infinity)));
  const fiveYearList = usCurrent ? [usCurrent, ...last5] : last5;
  fiveYearList.forEach(a => { if (!a._role) a._role = 'LAST_5_YEARS'; });
  return { usCurrent, lastOutsideUs, fiveYearList, warnings, persecutionCountry };
}

const ROLE_BADGE = {
  US_CURRENT:      { txt: '🇺🇸 现住址 Current',           color: '#0369a1' },
  LAST_OUTSIDE_US: { txt: '🎯 来美前最后地址 Last outside US', color: '#b45309' },
  LAST_5_YEARS:    { txt: '📅 近5年 Within 5 yrs',        color: '#166534' },
};

// ── Address helpers ───────────────────────────────────────────────────────────
function getAddressLabel(addr) {
  if (!addr) return '—';
  const parts = [addr.addressLine1, addr.city];
  if (addr.province) parts.push(addr.province);
  parts.push(addr.country || '');
  return parts.filter(Boolean).join(', ');
}

function getAddressDateRange(addr) {
  const from = (addr.fromDate || addr.fromYear || '').toString().slice(0, 7);
  const to   = (addr.toDate || '').toString().slice(0, 7) || 'present';
  return `${from} → ${to}`;
}

// ALL addresses including US — US address is always prepended as index 0
function getAllAddresses() {
  const addresses = [];
  // US current address from top-level fields (stored separately from addressHistory)
  if (clientData?.usAddressLine1 || clientData?.usCity) {
    addresses.push({
      addressLine1: clientData.usAddressLine1 || '',
      addressLine2: clientData.usAddressLine2 || '',
      city:         clientData.usCity         || '',
      province:     clientData.usState        || '',
      country:      'United States',
      postalCode:   clientData.usZip          || '',
      fromDate:     '',
      toDate:       '',
      _isUS:        true,
    });
  }
  // Address history (China addresses etc.) from _mini
  const hist = clientData?.addressHistory || [];
  addresses.push(...hist);
  return addresses;
}

function getAddressesForPage(page) {
  const addresses = getAllAddresses();
  // "Last address outside the US" must never default to the current US address.
  if (page === 'residence_history_1') {
    return addresses.filter(addr => !addr._isUS);
  }
  return addresses;
}

// ── Render contextual field preview ──────────────────────────────────────────
function renderFieldPreview(page) {
  const el = document.getElementById('fill-results');
  if (!el || !clientData) return;

  const isAddrPage = page === 'residence_history_1' || page === 'residence_history_3';
  if (isAddrPage) {
    // For address pages, show the smart-assigned address as preview
    const cls = classifyAddresses(clientData);
    const addr = page === 'residence_history_1'
      ? cls.lastOutsideUs
      : cls.fiveYearList[selectedAddressIndex];
    if (addr) {
      const fields = [
        { label: 'Country',   val: addr.country || (addr._isUS ? 'United States' : '') },
        { label: 'Address 1', val: addr.addressLine1 || '' },
        { label: 'Address 2', val: addr.addressLine2 || '' },
        { label: 'City',      val: addr.city || '' },
        { label: 'Province',  val: addr.province || '' },
        { label: 'ZIP',       val: addr.postalCode || addr.zip || '' },
        { label: 'From',      val: addr.fromDate || (addr.fromYear ? `${addr.fromYear}/${addr.fromMonth||''}` : '') },
        { label: 'To',        val: addr.toDate || (addr.toYear ? `${addr.toYear}/${addr.toMonth||''}` : 'present') },
      ];
      el.innerHTML = fields.map(f => f.val ? `
        <div class="result-row">
          <div class="dot dot-ok"></div>
          <div class="result-name">${f.label}</div>
          <div class="result-val">${f.val}</div>
        </div>` : '').join('');
    }
    return;
  }

  const fields = PAGE_PREVIEW_FIELDS[page];
  if (!fields) { el.innerHTML = ''; return; }

  // Preparer page uses static values
  // Build extended data source with computed fields
  const sib0 = (clientData?.siblings || [])[0] || {};
  const edu0 = (clientData?.eduList || [])[0] || {};
  const hasChinese = (s) => s && /[一-龥]/.test(s);
  const dataSource = page === 'preparer_info'
    ? {
        _preparer_firstName: PREPARER.firstName,
        _preparer_lastName:  PREPARER.lastName,
        _preparer_phone:     PREPARER.phone,
        _preparer_address:   PREPARER.address,
        _preparer_city:      PREPARER.city,
        _preparer_state:     PREPARER.state,
        _preparer_zip:       PREPARER.zip,
      }
    : page === 'eligibility_reason'
    ? {
        _cat: 'Yes',
        _basis: 'Torture Convention only',
        _past: 'Yes',
        _fear: 'Yes',
        _torture: 'Yes',
        _explanation: 'Please refer to my statement.',
      }
    : page === 'siblings'
    ? {
        siblingsCount:    clientData?.siblingsCount || '0',
        _sib0_lastName:   sib0.lastName   || '—',
        _sib0_firstName:  sib0.firstName  || '—',
        _sib0_birthCity:  sib0.birthCity  || '—',
        _sib0_birthCountry: sib0.birthCountry || '—',
      }
    : clientData;

  const rows = fields.map(f => {
    const val = dataSource[f.key];
    const hasVal = val !== undefined && val !== null && val !== '';
    const isChinese = hasVal && hasChinese(String(val));
    const dot = !hasVal ? 'dot-fail' : isChinese ? 'dot-skip' : 'dot-ok';
    const displayVal = isChinese ? `⚠️ ${String(val)}` : hasVal ? String(val) : '—';
    return `
      <div class="result-row">
        <div class="dot ${dot}"></div>
        <div class="result-name">${f.label}</div>
        <div class="result-val" title="${hasVal ? String(val) : ''}">${displayVal}</div>
      </div>
    `;
  }).join('');

  el.innerHTML = rows || '<div style="color:#94a3b8;font-size:11px;padding:4px 0">No preview for this page</div>';
}

// ── Render smart address card (v1.28 — replaces manual prev/next selection) ──
// residence_history_1: shows the auto-picked "last address outside US" +
//   persecution-country determination. One button, zero selection.
// residence_history_3: shows the computed 5-year list in fill order +
//   "Fill ALL" button. Manual prev/next kept only as a small fallback link.
function renderAddressSelector(page) {
  const el = document.getElementById('addr-selector');
  if (!el) return;
  if (!clientData) { el.innerHTML = ''; return; }
  const isAddrPage = page === 'residence_history_1' || page === 'residence_history_3';
  if (!isAddrPage) { el.innerHTML = ''; return; }

  const cls = classifyAddresses(clientData);
  const warnHtml = cls.warnings.length
    ? `<div style="margin-top:6px;padding:6px 8px;background:#fffbeb;border:1px solid #fde68a;border-radius:6px;color:#92400e;font-size:10px">
         ${cls.warnings.map(w => `⚠️ ${w}`).join('<br>')}</div>`
    : '';

  if (page === 'residence_history_1') {
    const a = cls.lastOutsideUs;
    if (!a) {
      el.innerHTML = `<div style="color:#991b1b;font-size:11px;margin-bottom:8px">❌ 没有非美国地址记录，无法填写此页</div>${warnHtml}`;
      return;
    }
    const persec = a._fromPersecutionCountry;
    el.innerHTML = `
      <div style="background:#f1f5f9;border-radius:8px;padding:8px 10px;margin-bottom:8px;font-size:11px;">
        <div style="font-weight:700;color:#1e3a5f;margin-bottom:4px">🎯 自动识别：来美前最后地址</div>
        <div style="color:#1e293b;font-weight:700;font-size:12px">${getAddressLabel(a)}</div>
        <div style="color:#64748b">${getAddressDateRange(a)}</div>
        <div style="margin-top:4px;font-size:10px;font-weight:600;color:${persec ? '#166534' : '#b45309'}">
          ${persec
            ? `✓ 位于受迫害国 (${cls.persecutionCountry}) — 自动勾选 Yes`
            : `✗ 不在受迫害国 — 自动勾选 No，需在下一页补受迫害国地址`}
        </div>
        ${warnHtml}
        <div style="color:#94a3b8;margin-top:5px;font-size:10px">直接点 Fill This Page，无需选择</div>
      </div>`;
    return;
  }

  // residence_history_3
  const list = cls.fiveYearList;
  if (!list.length) {
    el.innerHTML = `<div style="color:#991b1b;font-size:11px;margin-bottom:8px">❌ 近5年地址列表为空</div>${warnHtml}`;
    return;
  }
  if (selectedAddressIndex >= list.length) selectedAddressIndex = 0;
  const rows = list.map((a, i) => {
    const badge = ROLE_BADGE[a._role] || ROLE_BADGE.LAST_5_YEARS;
    return `
      <div style="padding:3px 0;border-bottom:1px solid #e2e8f0;
                  ${i === selectedAddressIndex ? 'font-weight:700' : ''}">
        <div style="display:flex;gap:6px;align-items:center">
          <span style="width:14px;text-align:right;color:#64748b">${i + 1}.</span>
          <span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:#1e293b">${getAddressLabel(a)}</span>
        </div>
        <div style="display:flex;gap:6px;margin-left:20px;font-size:10px">
          <span style="color:${badge.color};font-weight:600">${badge.txt}</span>
          <span style="color:#94a3b8">${getAddressDateRange(a)}</span>
        </div>
      </div>`;
  }).join('');

  el.innerHTML = `
    <div style="background:#f1f5f9;border-radius:8px;padding:8px 10px;margin-bottom:8px;font-size:11px;">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px;">
        <span style="font-weight:700;color:#1e3a5f">近5年地址（自动计算 · 按时间倒序）</span>
        <span style="color:#64748b">${list.length} 条</span>
      </div>
      ${rows}
      <button id="btn-fill-all-addresses" style="width:100%;margin-top:8px;padding:7px;border:none;border-radius:7px;
              background:#1e3a5f;color:#fff;font-weight:600;font-size:12px;cursor:pointer">
        ⚡ Fill ALL Addresses 一键填写全部地址
      </button>
      <div style="display:flex;gap:6px;margin-top:6px;">
        <button id="addr-prev" style="flex:1;padding:4px;border-radius:6px;border:1px solid #cbd5e1;background:#fff;cursor:pointer;font-size:12px">◀ Prev</button>
        <button id="addr-next" style="flex:1;padding:4px;border-radius:6px;border:1px solid #cbd5e1;background:#fff;cursor:pointer;font-size:12px">Next ▶</button>
      </div>
      ${warnHtml}
      <div style="color:#94a3b8;margin-top:4px;font-size:10px">
        一键 = 自动逐条填写并保存 · Prev/Next + Fill This Page 只填选中一条（兜底）
      </div>
    </div>`;

  document.getElementById('addr-prev').onclick = () => {
    selectedAddressIndex = (selectedAddressIndex - 1 + list.length) % list.length;
    chrome.storage.local.set({ arreglo_address_index: selectedAddressIndex });
    renderAddressSelector(page);
    renderFieldPreview(page);
  };
  document.getElementById('addr-next').onclick = () => {
    selectedAddressIndex = (selectedAddressIndex + 1) % list.length;
    chrome.storage.local.set({ arreglo_address_index: selectedAddressIndex });
    renderAddressSelector(page);
    renderFieldPreview(page);
  };
  document.getElementById('btn-fill-all-addresses').onclick = () => fillAllAddresses();
}

// ── Render child picker (shown on child_0_name / child_0_info pages) ──────────
// USCIS "Add child" edits one child at a time. When the client has more than one
// child, staff pick which child's data goes into the open editor here. Writes
// into the same #addr-selector container (address & child pages never coincide).
function renderChildSelector(page) {
  const el = document.getElementById('addr-selector');
  if (!el) return;
  const isChildPage = page === 'child_0_name' || page === 'child_0_info';
  if (!isChildPage || !clientData) return;   // leave addr-selector as-is for other pages

  const kids = clientData.children || [];
  if (kids.length === 0) {
    el.innerHTML = `<div style="color:#991b1b;font-size:11px;margin-bottom:8px">❌ 该客户没有子女数据</div>`;
    return;
  }
  if (selectedChildIndex >= kids.length) selectedChildIndex = 0;
  const c = kids[selectedChildIndex];
  const nameStr = [c.firstName, c.lastName].filter(Boolean).join(' ') || '(未命名)';
  const detail = [c.dob, c.birthCountry].filter(Boolean).join(' · ');
  const needSex = !c.sex;

  const picker = kids.length > 1 ? `
      <div style="display:flex;gap:6px;margin-top:8px;">
        <button id="child-prev" style="flex:1;padding:4px;border-radius:6px;border:1px solid #cbd5e1;background:#fff;cursor:pointer;font-size:12px">◀ Prev</button>
        <button id="child-next" style="flex:1;padding:4px;border-radius:6px;border:1px solid #cbd5e1;background:#fff;cursor:pointer;font-size:12px">Next ▶</button>
      </div>` : '';

  el.innerHTML = `
    <div style="background:#f1f5f9;border-radius:8px;padding:8px 10px;margin-bottom:8px;font-size:11px;">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px;">
        <span style="font-weight:700;color:#1e3a5f">选择要填的孩子 Child</span>
        <span style="color:#64748b">${selectedChildIndex + 1} / ${kids.length}</span>
      </div>
      <div style="color:#1e293b;font-weight:700;font-size:12px">👶 ${nameStr}</div>
      ${detail ? `<div style="color:#64748b">${detail}</div>` : ''}
      ${needSex ? `<div style="margin-top:6px;padding:6px 8px;background:#fffbeb;border:1px solid #fde68a;border-radius:6px;color:#92400e;font-size:10px">⚠️ CRM 未录入该孩子性别，Details 页请手动选择 Male/Female</div>` : ''}
      ${picker}
      <div style="color:#94a3b8;margin-top:5px;font-size:10px">选好孩子后点 Fill This Page 填入当前编辑器</div>
    </div>`;

  if (kids.length > 1) {
    document.getElementById('child-prev').onclick = () => {
      selectedChildIndex = (selectedChildIndex - 1 + kids.length) % kids.length;
      renderChildSelector(page);
    };
    document.getElementById('child-next').onclick = () => {
      selectedChildIndex = (selectedChildIndex + 1) % kids.length;
      renderChildSelector(page);
    };
  }
}

// ── Render work picker (shown on Your Employment History page) ───────────────
// USCIS employment edits one employer at a time. Staff must be able to select
// the exact CRM work row (e.g. Yinqingdaobo instead of Deran) before Fill This Page.
function renderWorkSelector(page) {
  const el = document.getElementById('addr-selector');
  if (!el) return;
  if (page !== 'employment' || !clientData) return;

  const works = clientData.workList || [];
  if (!works.length) {
    el.innerHTML = `<div style="color:#991b1b;font-size:11px;margin-bottom:8px">❌ 该客户没有工作记录</div>`;
    return;
  }
  if (selectedWorkIndex >= works.length) selectedWorkIndex = 0;

  const rows = works.map((w, i) => `
    <div class="work-row" data-work-index="${i}"
         title="Click to select this employer before Fill This Page"
         style="padding:5px 6px;border-radius:6px;cursor:pointer;border-bottom:1px solid #e2e8f0;
                ${i === selectedWorkIndex ? 'font-weight:700;color:#1e3a5f;background:#dbeafe' : 'color:#64748b'}">
      <div style="display:flex;gap:6px;align-items:center">
        <span style="width:14px;text-align:right">${i + 1}.</span>
        <span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${w.company || '—'}</span>
      </div>
      <div style="display:flex;gap:6px;margin-left:20px;font-size:10px">
        <span style="color:#64748b">${w.position || '—'}</span>
        <span style="color:#94a3b8">${w.startDate || ''}${w.endDate ? `–${w.endDate}` : ''}</span>
      </div>
    </div>`).join('');

  el.innerHTML = `
    <div style="background:#f1f5f9;border-radius:8px;padding:8px 10px;margin-bottom:8px;font-size:11px;">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px;">
        <span style="font-weight:700;color:#1e3a5f">选择要填的工作 Employer</span>
        <span style="color:#64748b">${selectedWorkIndex + 1} / ${works.length}</span>
      </div>
      ${rows}
      <div style="display:flex;gap:6px;margin-top:6px;">
        <button id="work-prev" style="flex:1;padding:4px;border-radius:6px;border:1px solid #cbd5e1;background:#fff;cursor:pointer;font-size:12px">◀ Prev</button>
        <button id="work-next" style="flex:1;padding:4px;border-radius:6px;border:1px solid #cbd5e1;background:#fff;cursor:pointer;font-size:12px">Next ▶</button>
      </div>
      <div style="color:#94a3b8;margin-top:5px;font-size:10px">选好公司后点 Fill This Page 填入当前 employment editor</div>
    </div>`;

  document.getElementById('work-prev').onclick = () => {
    selectedWorkIndex = (selectedWorkIndex - 1 + works.length) % works.length;
    renderWorkSelector(page);
  };
  document.getElementById('work-next').onclick = () => {
    selectedWorkIndex = (selectedWorkIndex + 1) % works.length;
    renderWorkSelector(page);
  };
  document.querySelectorAll('[data-work-index]').forEach(btn => {
    btn.onclick = () => {
      selectedWorkIndex = Number(btn.dataset.workIndex);
      renderWorkSelector(page);
    };
  });
}

async function fillAllAddresses() {
  const statusEl = document.getElementById('fill-status');
  setStatus(statusEl, '正在自动填写全部近5年地址…', 'info');
  try {
    const resp = await sendToContent({
      type: 'FILL_PAGE',
      data: clientData,
      opts: { fillAllAddresses: true },
    });
    const results = resp?.results || [];
    const ok = results.filter(r => r.ok).length;
    const fail = results.filter(r => !r.ok).length;
    setStatus(statusEl, `${fail === 0 ? '✅' : '⚠️'} Addresses: ${ok} ok, ${fail} flagged`, fail === 0 ? 'ok' : 'warn');
    document.getElementById('fill-results').innerHTML = results.map(r => `
      <div class="result-row">
        <div class="dot ${r.ok ? 'dot-ok' : 'dot-fail'}"></div>
        <div class="result-name">${String(r.name).split('.').pop()}</div>
        <div class="result-val">${r.val || '—'}</div>
      </div>`).join('');
  } catch (e) {
    setStatus(statusEl, `❌ ${e.message}`, 'err');
  }
}

// ── Render school selector (shown only on Your School History page) ──────────
// Fill This Page is single-entry mode: staff chooses the exact school row, then
// fills that one into the currently open USCIS editor. The all-school automation
// is intentionally isolated behind the explicit Fill ALL button.
function renderSchoolSelector(page) {
  const el = document.getElementById('school-selector');
  if (!el) return;
  if (!clientData || page !== 'school') { el.innerHTML = ''; return; }

  const schools = getSortedSchools();
  if (!schools.length) {
    el.innerHTML = '<div style="color:#94a3b8;font-size:11px;margin-bottom:8px">No education history found 无学历记录</div>';
    return;
  }
  if (selectedSchoolIndex >= schools.length) selectedSchoolIndex = 0;

  const listHtml = schools.map((s, i) => `
    <div class="school-row" data-school-index="${i}"
         title="Click to select this school before Fill This Page"
         style="display:flex;gap:6px;align-items:center;padding:4px 6px;border-radius:6px;cursor:pointer;
                ${i === selectedSchoolIndex ? 'font-weight:700;color:#1e3a5f;background:#dbeafe' : 'color:#64748b'}">
      <span style="width:14px;text-align:right">${i + 1}.</span>
      <span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">
        ${s.level || '—'} · ${s.school || '—'}
      </span>
      <span>${s.startYear || ''}–${s.endYear || ''}</span>
    </div>`).join('');

  el.innerHTML = `
    <div style="background:#f1f5f9;border-radius:8px;padding:8px 10px;margin-bottom:8px;font-size:11px;">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px;">
        <span style="font-weight:700;color:#1e3a5f">Schools 学历（已按最高学历排序）</span>
        <span style="color:#64748b">${schools.length} total</span>
      </div>
      ${listHtml}
      <button id="btn-fill-all-schools" style="width:100%;margin-top:8px;padding:7px;border:none;border-radius:7px;
              background:#1e3a5f;color:#fff;font-weight:600;font-size:12px;cursor:pointer">
        ⚡ Fill ALL Schools 一键填写全部学校
      </button>
      <div style="display:flex;gap:6px;margin-top:6px;">
        <button id="school-prev" style="flex:1;padding:4px;border-radius:6px;border:1px solid #cbd5e1;background:#fff;cursor:pointer;font-size:12px">◀ Prev</button>
        <button id="school-next" style="flex:1;padding:4px;border-radius:6px;border:1px solid #cbd5e1;background:#fff;cursor:pointer;font-size:12px">Next ▶</button>
      </div>
      <div style="color:#94a3b8;margin-top:4px;font-size:10px">
        Fill This Page 只填当前选中的一所（手动兜底）· Fill ALL 自动全部填写
      </div>
    </div>
  `;

  document.getElementById('school-prev').onclick = () => {
    selectedSchoolIndex = (selectedSchoolIndex - 1 + schools.length) % schools.length;
    renderSchoolSelector(page);
  };
  document.getElementById('school-next').onclick = () => {
    selectedSchoolIndex = (selectedSchoolIndex + 1) % schools.length;
    renderSchoolSelector(page);
  };
  document.querySelectorAll('[data-school-index]').forEach(btn => {
    btn.onclick = () => {
      selectedSchoolIndex = Number(btn.dataset.schoolIndex);
      renderSchoolSelector(page);
    };
  });
  document.getElementById('btn-fill-all-schools').onclick = () => fillSchools(true);
}

// Send a school fill request (all = auto loop, single = current selection)
async function fillSchools(all) {
  const statusEl = document.getElementById('fill-status');
  setStatus(statusEl, all ? 'Filling all schools… 正在自动填写全部学校' : 'Filling selected school…', 'info');
  try {
    const resp = await sendToContent({
      type: 'FILL_PAGE',
      data: clientData,
      opts: {
        fillAllSchools: !!all,
        selectedSchoolIndex,
        sortedSchools: getSortedSchools(),
      },
    });
    const results = resp?.results || [];
    const ok = results.filter(r => r.ok).length;
    const fail = results.filter(r => !r.ok).length;
    setStatus(statusEl, `${fail === 0 ? '✅' : '⚠️'} Schools: ${ok} ok, ${fail} failed`, fail === 0 ? 'ok' : 'warn');
    document.getElementById('fill-results').innerHTML = results.map(r => `
      <div class="result-row">
        <div class="dot ${r.ok ? 'dot-ok' : 'dot-fail'}"></div>
        <div class="result-name">${String(r.name).split('.').pop()}</div>
        <div class="result-val">${r.val || '—'}</div>
      </div>`).join('');
  } catch (e) {
    setStatus(statusEl, `❌ ${e.message}`, 'err');
  }
}

// ── EOIR ACIS capture (explicit staff action only) ────────────────────────────
function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function isEoirAcisUrl(value) {
  try {
    return new URL(value || '').hostname === 'acis.eoir.justice.gov';
  } catch (e) {
    return false;
  }
}

function isCbpI94Url(value) {
  try {
    return new URL(value || '').hostname === 'i94.cbp.dhs.gov';
  } catch (e) {
    return false;
  }
}

async function getActiveBrowserTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab || null;
}

function eoirStateMessage(state, detail = '') {
  const eoirPending = eoirPendingState.getPending();
  const messages = {
    [EOIR_STATES.IDLE]: 'Open an EOIR ACIS result, then click Capture EOIR.',
    [EOIR_STATES.READING]: 'Reading the visible EOIR result…',
    [EOIR_STATES.PREVIEW]: 'Review the machine-produced draft below.',
    [EOIR_STATES.MATCHING]: 'Checking Cloudflare for a strong client match…',
    [EOIR_STATES.READY]: eoirMatchState === EOIR_STATES.LINKED
      ? 'Strong client match found. Review every field before confirming.'
      : 'No strong client match. Confirmation will save Case Status only as unlinked.',
    [EOIR_STATES.SAVING]: 'Saving the staff-confirmed capture to Cloudflare…',
    [EOIR_STATES.LINKED]: 'Saved and linked to the matching CRM client.',
    [EOIR_STATES.UNLINKED]: 'Saved as Case Status only / unlinked.',
    [EOIR_STATES.UNLINKED_CREATE_CHOICE]: 'Saved as Case Status only / unlinked.',
    [EOIR_STATES.CONFLICT]: 'Identity conflict. Nothing was attached; review the preview.',
    [EOIR_STATES.PENDING_OFFLINE]: eoirPending
      ? 'Save is pending. Retry will use the same capture ID.'
      : 'Cloudflare preview is unavailable. Retry matching when online.',
  };
  return detail ? `${messages[state] || state} ${detail}` : (messages[state] || state);
}

function normalizeEoirHearingType(value) {
  const normalized = String(value || '').trim().toLowerCase();
  if (normalized.includes('individual')) return 'Individual';
  if (normalized.includes('master')) return 'Master';
  return '';
}

function renderEoirPreview(fields) {
  const preview = document.getElementById('eoir-preview');
  if (!preview) return;
  if (!fields) {
    preview.innerHTML = '';
    preview.style.display = 'none';
    return;
  }

  const hearing = [
    fields.hearingDate,
    fields.hearingTime,
  ].filter(Boolean).join(' · ');
  const rows = [
    ['Name', fields.subjectName],
    ['A-Number', fields.alienNumber],
    ['Docket date', fields.docketDate],
    ['Hearing', hearing],
    ['Hearing type', normalizeEoirHearingType(fields.hearingType)],
    ['Appearance', fields.appearanceMode],
    ['Judge', fields.judge],
    ['Court', fields.courtAddress],
    ['Court phone', fields.courtPhone],
  ];
  preview.innerHTML = rows.map(([label, value]) =>
    `<dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value || '—')}</dd>`
  ).join('');
  preview.style.display = 'grid';
}

function setEoirState(state, detail = '') {
  const card = document.getElementById('eoir-card');
  const status = document.getElementById('eoir-state');
  const captureButton = document.getElementById('btn-eoir-capture');
  const confirmButton = document.getElementById('btn-eoir-confirm');
  const unlinkedChoice = document.getElementById('eoir-unlinked-choice');
  const keepUnlinkedButton = document.getElementById('btn-eoir-keep-unlinked');
  const createClientButton = document.getElementById('btn-eoir-create-client');
  if (!card || !status || !captureButton || !confirmButton) return;
  const eoirPending = eoirPendingState.getPending();

  card.dataset.state = state;
  card.classList.add('is-visible');
  status.textContent = eoirStateMessage(state, detail);
  renderEoirPreview(eoirDraft?.fields || eoirPending?.fields || null);

  const busy = state === EOIR_STATES.READING
    || state === EOIR_STATES.MATCHING
    || state === EOIR_STATES.SAVING;
  captureButton.disabled = busy || Boolean(eoirPending);
  captureButton.textContent = eoirPending
    ? 'Confirmed Save Pending'
    : (eoirDraft ? 'Capture Again' : 'Capture EOIR');

  const canConfirm = state === EOIR_STATES.READY;
  const canRetry = state === EOIR_STATES.PENDING_OFFLINE
    || (state === EOIR_STATES.CONFLICT && Boolean(eoirPending));
  confirmButton.style.display = canConfirm || canRetry ? '' : 'none';
  confirmButton.disabled = busy;
  confirmButton.textContent = canConfirm
    ? 'Confirm Save to Case Status'
    : (eoirPending ? 'Retry Confirmed Save' : 'Retry Match');

  if (unlinkedChoice) {
    unlinkedChoice.style.display = state === EOIR_STATES.UNLINKED_CREATE_CHOICE ? '' : 'none';
  }
  if (keepUnlinkedButton) keepUnlinkedButton.disabled = eoirCreateOpening;
  if (createClientButton) createClientButton.disabled = eoirCreateOpening;
}

function getEoirResultState(payload) {
  const state = payload?.state
    || payload?.matchState
    || payload?.linkState
    || payload?.match?.state
    || payload?.capture?.linkState
    || '';
  if (state === EOIR_STATES.LINKED || state === 'strong-match') return EOIR_STATES.LINKED;
  if (state === EOIR_STATES.UNLINKED || state === 'no-match') return EOIR_STATES.UNLINKED;
  if (state === EOIR_STATES.CONFLICT) return EOIR_STATES.CONFLICT;
  return '';
}

async function parseJsonResponse(response) {
  try {
    return await response.json();
  } catch (e) {
    return {};
  }
}

function isServerFinalUnlinkedCapture(response, result) {
  const resultOk = result?.success === true || result?.ok === true;
  return response?.ok === true
    && resultOk
    && result?.capture?.linkState === EOIR_STATES.UNLINKED;
}

function showEoirUnlinkedDecision(captureId) {
  eoirUnlinkedCaptureId = String(captureId || '').trim();
  eoirCreateOpening = false;
  if (!eoirUnlinkedCaptureId) {
    setEoirState(EOIR_STATES.UNLINKED, 'The saved capture ID is unavailable.');
    return;
  }
  const question = document.getElementById('eoir-unlinked-question');
  const keepButton = document.getElementById('btn-eoir-keep-unlinked');
  const createButton = document.getElementById('btn-eoir-create-client');
  if (question) question.textContent = 'No existing client profile was found. Create one?';
  if (keepButton) keepButton.textContent = 'No — Keep Case Status Only';
  if (createButton) createButton.textContent = 'Yes — Create XY Client';
  setEoirState(EOIR_STATES.UNLINKED_CREATE_CHOICE);
}

function keepEoirCaseStatusOnly() {
  if (!eoirUnlinkedCaptureId) return;
  eoirUnlinkedCaptureId = '';
  eoirCreateOpening = false;
  setEoirState(EOIR_STATES.UNLINKED);
}

async function openEoirClientCreation() {
  if (!eoirUnlinkedCaptureId || eoirCreateOpening) return;
  const captureId = eoirUnlinkedCaptureId;
  const createUrl = `${EOIR_CRM_CREATE_URL}?view=caseStatus`
    + `&eoirCaptureId=${encodeURIComponent(captureId)}&action=create`;

  eoirCreateOpening = true;
  setEoirState(EOIR_STATES.UNLINKED_CREATE_CHOICE, 'Opening XY CRM…');
  try {
    const openedTab = await chrome.tabs.create({ url: createUrl });
    if (!openedTab) throw new Error('Chrome did not open the CRM tab.');
    eoirUnlinkedCaptureId = '';
    eoirCreateOpening = false;
    setEoirState(EOIR_STATES.UNLINKED, 'XY CRM opened to create the client.');
  } catch (error) {
    eoirCreateOpening = false;
    setEoirState(
      EOIR_STATES.UNLINKED_CREATE_CHOICE,
      `Could not open XY CRM: ${error?.message || String(error)} Please try again.`,
    );
  }
}

async function previewEoirMatch() {
  if (!eoirDraft) return;
  setEoirState(EOIR_STATES.MATCHING);
  try {
    const response = await fetch(`${WORKER}${EOIR_PREVIEW_ENDPOINT}`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        captureId: eoirDraft.captureId,
        fields: eoirDraft.fields,
      }),
    });
    const result = await parseJsonResponse(response);
    const matchState = getEoirResultState(result);
    if (!response.ok || result.success === false || result.ok === false) {
      if (response.status === 409 || matchState === EOIR_STATES.CONFLICT) {
        setEoirState(EOIR_STATES.CONFLICT, result.error || result.reason || '');
        return;
      }
      throw new Error(result.error || `HTTP ${response.status}`);
    }
    if (!matchState) throw new Error('Worker returned no match state.');
    if (matchState === EOIR_STATES.CONFLICT) {
      setEoirState(EOIR_STATES.CONFLICT, result.error || result.reason || '');
      return;
    }
    eoirMatchState = matchState;
    setEoirState(EOIR_STATES.READY);
  } catch (error) {
    setEoirState(EOIR_STATES.PENDING_OFFLINE, error.message);
  }
}

async function captureEoirResult(activeTab) {
  if (!eoirPendingState.tryBeginCapture()) {
    setEoirState(EOIR_STATES.PENDING_OFFLINE, 'A confirmed save is already pending.');
    return;
  }
  eoirDraft = null;
  eoirMatchState = '';
  setEoirState(EOIR_STATES.READING);

  try {
    const tab = activeTab || await getActiveBrowserTab();
    if (!tab || !isEoirAcisUrl(tab.url)) {
      throw new Error('The active tab is not acis.eoir.justice.gov.');
    }
    const response = await sendToTabContent(tab, {
      type: 'ARREGLO_CAPTURE_EOIR_RESULT',
    });
    if (!response?.ok || !response.fields) {
      throw new Error(response?.error || 'Unable to read this page.');
    }

    eoirDraft = {
      captureId: crypto.randomUUID(),
      fields: {
        ...response.fields,
        capturedAt: new Date().toISOString(),
      },
    };
    setEoirState(EOIR_STATES.PREVIEW);
    await previewEoirMatch();
  } catch (error) {
    setEoirState(EOIR_STATES.IDLE, error.message);
  }
}

async function captureCbpResult(activeTab) {
  const statusEl = document.getElementById('fill-status');
  try {
    const tab = activeTab || await getActiveBrowserTab();
    if (!tab || !isCbpI94Url(tab.url)) {
      throw new Error('The active tab is not i94.cbp.dhs.gov.');
    }
    const response = await sendToTabContent(tab, { type: 'EXTRACT_CBP' });
    if (!response?.success) {
      throw new Error(response?.error || 'Unable to capture this CBP result.');
    }
    lastCbp = response.data;
    renderCbpCard('cbp_i94');
  } catch (error) {
    if (statusEl) setStatus(statusEl, `❌ 抓取失败: ${error.message}`, 'err');
  }
}

async function captureGovernmentResult() {
  try {
    const tab = await getActiveBrowserTab();
    if (tab && isEoirAcisUrl(tab.url)) {
      await captureEoirResult(tab);
      return;
    }
    if (tab && isCbpI94Url(tab.url)) {
      await captureCbpResult(tab);
      return;
    }
    setEoirState(EOIR_STATES.IDLE, 'Open an EOIR ACIS or CBP I-94 result first.');
  } catch (error) {
    setEoirState(
      EOIR_STATES.IDLE,
      `Unable to read the active browser tab. ${error?.message || String(error)}`,
    );
  }
}

async function saveEoirPending() {
  let eoirPending = eoirPendingState.getPending();
  if (!eoirPending) return;
  setEoirState(EOIR_STATES.SAVING);
  try {
    await eoirPendingState.ensurePersisted();
    eoirPending = eoirPendingState.getPending();
    const response = await fetch(`${WORKER}${EOIR_SAVE_ENDPOINT}`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(eoirPending),
    });
    const result = await parseJsonResponse(response);
    const savedState = getEoirResultState(result);
    if (response.status === 409 || savedState === EOIR_STATES.CONFLICT) {
      setEoirState(EOIR_STATES.CONFLICT, result.error || result.reason || '');
      return;
    }
    const serverFinalUnlinked = isServerFinalUnlinkedCapture(response, result);
    const savedCaptureId = eoirPending.captureId;
    const cleared = await eoirPendingState.finishSave({
      httpOk: response.ok,
      resultOk: result.success === true || result.ok === true,
      linkState: savedState,
    });
    if (!cleared) {
      throw new Error(result.error || `Cloudflare did not confirm save (HTTP ${response.status}).`);
    }

    if (serverFinalUnlinked) {
      showEoirUnlinkedDecision(savedCaptureId);
    } else {
      setEoirState(savedState);
    }
  } catch (error) {
    setEoirState(EOIR_STATES.PENDING_OFFLINE, error.message);
  }
}

async function confirmEoirSave() {
  if (!eoirDraft) return;
  const persistence = eoirPendingState.beginConfirmation(eoirDraft);
  setEoirState(EOIR_STATES.SAVING);
  try {
    await persistence;
  } catch (error) {
    setEoirState(EOIR_STATES.PENDING_OFFLINE, error.message);
    return;
  }
  await saveEoirPending();
}

async function handleEoirConfirm() {
  if (eoirPendingState.getPending()) {
    await saveEoirPending();
  } else if (eoirDraft && document.getElementById('eoir-card')?.dataset.state === EOIR_STATES.READY) {
    await confirmEoirSave();
  } else if (eoirDraft) {
    await previewEoirMatch();
  }
}

async function refreshEoirVisibility() {
  const card = document.getElementById('eoir-card');
  if (!card || eoirPendingState.getPending()) return;
  const tab = await getActiveBrowserTab();
  const visible = Boolean(tab && isEoirAcisUrl(tab.url));
  card.classList.toggle('is-visible', visible);
  if (visible && !eoirDraft) setEoirState(EOIR_STATES.IDLE);
}

async function initializeEoirCapture() {
  document.getElementById('btn-eoir-capture')?.addEventListener('click', captureGovernmentResult);
  document.getElementById('btn-eoir-confirm')?.addEventListener('click', handleEoirConfirm);
  document.getElementById('btn-eoir-keep-unlinked')?.addEventListener(
    'click',
    keepEoirCaseStatusOnly,
  );
  document.getElementById('btn-eoir-create-client')?.addEventListener(
    'click',
    openEoirClientCreation,
  );

  const stored = await chrome.storage.local.get([EOIR_PENDING_KEY]);
  const pending = stored?.[EOIR_PENDING_KEY];
  if (pending
      && typeof pending.captureId === 'string'
      && pending.fields
      && pending.staffConfirmed === true) {
    eoirPendingState.restore(pending);
    eoirDraft = { captureId: pending.captureId, fields: pending.fields };
    setEoirState(EOIR_STATES.PENDING_OFFLINE);
    return;
  }
  await refreshEoirVisibility();
}

// ── CBP I-94 capture card (v1.31) ─────────────────────────────────────────────
// Workflow: staff loads the client (case #) → opens i94.cbp.dhs.gov and runs
// the passport search → this card captures the results, verifies they belong
// to the loaded client (name / DOB / passport), and saves to Cloudflare.
// Saving IS the staff confirmation step required by the field-level data rules.
let lastCbp = null;

function fmtName(d) { return `${(d.familyName||'').toUpperCase()}, ${(d.givenName||'').toUpperCase()}`; }

function cbpMatchClient(cbp, d) {
  if (!d) return { ok: false, checks: [], reason: 'no client loaded' };
  const checks = [];
  const norm = s => String(s||'').toUpperCase().replace(/[^A-Z0-9]/g,'');
  if (cbp.docNumber && d.passportNumber) checks.push({ label: 'Passport', ok: norm(cbp.docNumber) === norm(d.passportNumber), a: cbp.docNumber, b: d.passportNumber });
  if (cbp.lastName && d.familyName)      checks.push({ label: 'Name', ok: norm(cbp.lastName) === norm(d.familyName) && (!cbp.firstName || norm(cbp.firstName) === norm(d.givenName)), a: `${cbp.lastName}, ${cbp.firstName}`, b: fmtName(d) });
  if (cbp.dob && d.dob)                  checks.push({ label: 'DOB', ok: norm(cbp.dob) === norm(d.dob), a: cbp.dob, b: d.dob });
  const ok = checks.length > 0 && checks.every(c => c.ok);
  return { ok, checks, reason: checks.length ? '' : 'no comparable fields' };
}

function renderCbpCard(page) {
  const el = document.getElementById('cbp-card');
  if (!el) return;
  if (page !== 'cbp_i94') { el.innerHTML = ''; return; }

  const caseNum = document.getElementById('case-number')?.value?.trim() || '';
  const rows = (o) => Object.entries(o).map(([k,v]) =>
    `<div style="display:flex;gap:6px;padding:1px 0"><span style="width:110px;color:#64748b">${k}</span><span style="font-weight:600;color:#1e293b">${v || '—'}</span></div>`).join('');

  let body = '';
  if (!lastCbp) {
    body = `<div style="color:#64748b;font-size:11px;margin:4px 0 8px">
      ${clientData ? '在 CBP 查询出结果后点击抓取。' : '⚠ 先在上方输入案件号加载客户，再抓取（用于身份核对）。'}
    </div>
    <button id="btn-cbp-capture" style="width:100%;padding:8px;border:none;border-radius:7px;background:#1e3a5f;color:#fff;font-weight:700;font-size:12px;cursor:pointer">📥 抓取本页 I-94 · Capture I-94</button>
    <button id="btn-cbp-passport" style="width:100%;margin-top:6px;padding:8px;border:none;border-radius:7px;background:#475569;color:#fff;font-weight:700;font-size:12px;cursor:pointer">📎 注入护照信息页 → CBP Document Capture</button>
    <div style="color:#94a3b8;font-size:10px;margin-top:3px">先点页面上 CAPTURE DOCUMENT 打开弹窗，再点此按钮（不用点 Files）</div>`;
  } else {
    const c = lastCbp;
    const match = cbpMatchClient(c, clientData);
    const matchHtml = clientData ? (match.ok
      ? `<div style="margin:6px 0;padding:6px 8px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:6px;color:#166534;font-size:11px;font-weight:700">✓ 与 case ${caseNum} 身份匹配</div>`
      : `<div style="margin:6px 0;padding:6px 8px;background:#fef2f2;border:1px solid #fecaca;border-radius:6px;color:#991b1b;font-size:11px">
           ✗ 与已加载客户不匹配 — ${match.checks.filter(x=>!x.ok).map(x=>`${x.label}: CBP「${x.a}」≠ CRM「${x.b}」`).join('；') || match.reason}
           <label style="display:block;margin-top:4px;font-weight:600"><input type="checkbox" id="cbp-override"> 我已人工核对，强制保存</label>
         </div>`)
      : `<div style="margin:6px 0;padding:6px 8px;background:#fffbeb;border:1px solid #fde68a;border-radius:6px;color:#92400e;font-size:11px">⚠ 未加载客户，无法核对身份 — 请先加载案件</div>`;

    body = `
      <div style="font-size:11px">${rows({
        'I-94 号': c.i94Number,
        '入境日期': c.entryDate,
        '身份类别': c.classOfAdmission,
        '准许停留至': c.admitUntil,
        '入境口岸': c.portMapped ? `${c.port} (${c.portRaw})` : `${c.portRaw || '—'} ⚠未识别`,
        '姓名': c.lastName ? `${c.lastName}, ${c.firstName}` : '',
        '出生日期': c.dob,
        '护照号': c.docNumber,
        '入境次数': `${c.arrivalsCount}${c.arrivalsCount > 1 ? '（有既往入境 → otherEntries=Yes）' : ''}`,
      })}</div>
      ${matchHtml}
      <div style="display:flex;gap:6px;margin-top:6px">
        <button id="btn-cbp-save" ${clientData ? '' : 'disabled'} style="flex:2;padding:8px;border:none;border-radius:7px;background:${clientData?'#166534':'#94a3b8'};color:#fff;font-weight:700;font-size:12px;cursor:pointer">💾 保存到 CRM (case ${caseNum || '?'})</button>
        <button id="btn-cbp-recapture" style="flex:1;padding:8px;border-radius:7px;border:1px solid #cbd5e1;background:#fff;font-size:12px;cursor:pointer">重新抓取</button>
      </div>`;
  }

  el.innerHTML = `<div style="background:#f1f5f9;border-radius:8px;padding:8px 10px;margin-bottom:8px;">
    <div style="font-weight:700;color:#1e3a5f;font-size:12px;margin-bottom:4px">🛂 CBP I-94 捕获</div>${body}</div>`;

  const cap = document.getElementById('btn-cbp-capture') || document.getElementById('btn-cbp-recapture');
  if (cap) cap.onclick = captureGovernmentResult;
  const save = document.getElementById('btn-cbp-save');
  if (save) save.onclick = () => saveCbpToCloudflare(page);
  const pp = document.getElementById('btn-cbp-passport');
  if (pp) pp.onclick = () => uploadPassportBio();
}

async function uploadPassportBio() {
  const statusEl = document.getElementById('fill-status');
  const caseNum = document.getElementById('case-number')?.value?.trim();
  if (!caseNum) { setStatus(statusEl, '❌ 先输入案件号', 'err'); return; }
  setStatus(statusEl, '获取护照信息页…', 'info');
  try {
    const res = await fetch(`${WORKER}/passport-bio/${caseNum}`);
    if (!res.ok) {
      setStatus(statusEl, `❌ Worker /passport-bio 未部署或无文件 (HTTP ${res.status}) — 见 Codex 指令文档`, 'err');
      return;
    }
    const blob = await res.blob();
    const base64 = await new Promise((ok, bad) => {
      const r = new FileReader();
      r.onload = () => ok(r.result);
      r.onerror = () => bad(new Error('read failed'));
      r.readAsDataURL(blob);
    });
    setStatus(statusEl, '注入 CBP Document Capture…', 'info');
    const resp = await sendToContent({ type: 'UPLOAD_PASSPORT_BIO', dataUrl: base64, fileName: `passport_bio_${caseNum}.jpg` });
    if (resp?.success) setStatus(statusEl, '✅ 护照信息页已注入 — 在 CBP 弹窗里核对识别结果后提交', 'ok');
    else setStatus(statusEl, `❌ 注入失败: ${resp?.error || 'no response'} — 确认已点开 CAPTURE DOCUMENT 弹窗`, 'err');
  } catch (e) {
    setStatus(statusEl, `❌ ${e.message}`, 'err');
  }
}

async function saveCbpToCloudflare(page) {
  const statusEl = document.getElementById('fill-status');
  const caseNum = document.getElementById('case-number')?.value?.trim();
  if (!lastCbp || !clientData || !caseNum) return;
  const match = cbpMatchClient(lastCbp, clientData);
  const override = document.getElementById('cbp-override')?.checked;
  if (!match.ok && !override) {
    setStatus(statusEl, '❌ 身份不匹配 — 核对后勾选强制保存', 'err');
    return;
  }
  setStatus(statusEl, '保存到 Cloudflare…', 'info');
  const c = lastCbp;
  const merged = {
    ...clientData,
    i94Number: c.i94Number || clientData.i94Number,
    lastEntryDate: c.entryDate || clientData.lastEntryDate,
    lastEntryStatus: c.classOfAdmission || clientData.lastEntryStatus,
    dateStatusExpires: c.admitUntil || clientData.dateStatusExpires,
    i94StatusExpiry: c.admitUntil || clientData.i94StatusExpiry,   // legacy mirror
    entryPort: (c.portMapped && c.port) || clientData.entryPort,
    passportNumber: clientData.passportNumber || c.docNumber,
    otherEntries: c.arrivalsCount > 1 ? 'Yes' : (clientData.otherEntries || 'No'),
    _cbp: { capturedAt: c.capturedAt, sourceUrl: c.sourceUrl, travelHistory: c.travelHistory,
            docNumber: c.docNumber, arrivalsCount: c.arrivalsCount,
            classOfAdmission: c.classOfAdmission, portRaw: c.portRaw,
            confirmedBy: 'staff-extension', matchOverride: !match.ok },
  };
  try {
    const res = await fetch(`${WORKER}/update-info-sheet`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ caseNumber: caseNum, infoFormData: merged }),
    });
    const json = await res.json().catch(() => ({}));
    if (res.ok && json.success !== false) {
      clientData = merged;
      chrome.storage.local.set({ arreglo_client_data: merged, arreglo_case_number: caseNum });
      setStatus(statusEl, `✅ I-94 已保存到 case ${caseNum} — CRM 同步后即生效，USCIS 填表将使用这些数据`, 'ok');
    } else {
      setStatus(statusEl, `❌ 保存失败: ${json.error || res.status}`, 'err');
    }
  } catch (e) {
    setStatus(statusEl, `❌ 保存失败: ${e.message}`, 'err');
  }
}

// ── Refresh page detection & update UI ───────────────────────────────────────
let _pingFailCount = 0;

// v1.33: a supported tab is USCIS *or* CBP — previously this only looked for
// a USCIS tab, so on i94.cbp.dhs.gov it early-returned with a warning and the
// CBP capture card never rendered (her 8:52PM screenshot).
async function getSupportedTab() {
  const active = await getActiveTab();
  try {
    if (active && SUPPORTED_HOSTS.test(new URL(active.url || '').hostname)) return active;
  } catch (e) {}
  return await getUscisTab();
}

async function refreshPageTag() {
  try {
    await refreshEoirVisibility();
    const uscisTab = await getSupportedTab();
    if (!uscisTab) {
      document.getElementById('page-tag').innerHTML =
        `<span class="page-tag" style="background:#fffbeb;color:#92400e">⚠️ Open my.uscis.gov or i94.cbp.dhs.gov</span>`;
      return;
    }
    let resp;
    try {
      resp = await chrome.tabs.sendMessage(uscisTab.id, { type: 'PING' });
      _pingFailCount = 0;
    } catch(pingErr) {
      _pingFailCount++;
      if (_pingFailCount >= 3) {
        document.getElementById('page-tag').innerHTML =
          `<span class="page-tag" style="background:#fffbeb;color:#92400e">⚠️ Reconnecting to USCIS page</span>`;
      }
      return;
    }
    const detectedPage = resp?.page || 'unknown';

    if (detectedPage !== currentPage) {
      currentPage = detectedPage;
      const label = PAGE_LABELS[currentPage] || currentPage;
      document.getElementById('page-tag').innerHTML =
        `<span class="page-tag">📄 ${label}</span>`;
      // Clear old fill results — show fresh preview for new page
      document.getElementById('fill-status').innerHTML = '';
      document.getElementById('fill-results').innerHTML = '';
      renderCbpCard(currentPage);
      // CBP page: capture is the workflow — USCIS fill button makes no sense there
      const fillBtn = document.getElementById('btn-fill');
      if (fillBtn) fillBtn.style.display = currentPage === 'cbp_i94' ? 'none' : '';
      if (clientData) {
        renderAddressSelector(currentPage);
        renderSchoolSelector(currentPage);
        renderWorkSelector(currentPage);
        renderChildSelector(currentPage);
        renderFieldPreview(currentPage);
      }
    }
  } catch(e) {
    // ignore unexpected errors silently
  }
}

// Poll every 1.5s so sidebar auto-updates when user navigates USCIS pages
let _pollInterval = null;
function startPolling() {
  if (_pollInterval) return;
  _pollInterval = setInterval(() => { refreshPageTag(); }, 600);  // v1.31: always poll so the CBP card appears before a client is loaded
}
function stopPolling() {
  if (_pollInterval) { clearInterval(_pollInterval); _pollInterval = null; }
}

// ── Load client ───────────────────────────────────────────────────────────────
document.getElementById('btn-load').addEventListener('click', async () => {
  const caseNum = document.getElementById('case-number').value.trim();
  if (!caseNum) return;

  const btn = document.getElementById('btn-load');
  const statusEl = document.getElementById('load-status');
  btn.disabled = true;
  btn.textContent = 'Loading...';
  setStatus(statusEl, 'Fetching from Cloudflare...', 'info');

  try {
    const saved = await loadClientFromCloudflare(caseNum, { resetAddressIndex: true });
    if (!saved) {
      btn.disabled = false; btn.textContent = 'Load Client 加载客户'; return;
    }

    // Render preview immediately with whatever currentPage is — don't block on USCIS ping
    renderAddressSelector(currentPage);
    renderSchoolSelector(currentPage);
    renderWorkSelector(currentPage);
    renderChildSelector(currentPage);
    renderFieldPreview(currentPage);
    // Detect USCIS page in background (non-blocking)
    refreshPageTag().catch(() => {});
    startPolling();

  } catch(e) {
    setStatus(document.getElementById('load-status'), `❌ Error: ${e.message}`, 'err');
  }

  btn.disabled = false;
  btn.textContent = 'Load Client 加载客户';
});

// ── Fill current page ─────────────────────────────────────────────────────────
document.getElementById('btn-fill').addEventListener('click', async () => {
  if (!clientData) return;

  const btn = document.getElementById('btn-fill');
  const statusEl = document.getElementById('fill-status');
  btn.disabled = true;
  btn.textContent = 'Syncing...';

  try {
    const caseNum = document.getElementById('case-number').value.trim();
    setStatus(statusEl, 'Refreshing latest CRM data from Cloudflare...', 'info');
    const refreshed = await loadClientFromCloudflare(caseNum, { silent: true, requireInfoSheet: true });
    if (refreshed) clientData = refreshed;
    else {
      btn.disabled = false;
      btn.textContent = 'Fill This Page 填写此页';
      return;
    }
  } catch(e) {
    setStatus(statusEl, `❌ Cloudflare refresh failed: ${e.message}`, 'err');
    btn.disabled = false;
    btn.textContent = 'Fill This Page 填写此页';
    return;
  }

  btn.textContent = 'Filling...';

  // Always detect page fresh at fill time — don't rely on poll currentPage
  try {
    const pingResp = await sendToContent({ type: 'PING' });
    if (pingResp?.page) currentPage = pingResp.page;
  } catch(_) {}

  const isAddrPage = currentPage === 'residence_history_1' || currentPage === 'residence_history_3';
  let opts = {};
  if (isAddrPage) {
    const cls = classifyAddresses(clientData);
    if (currentPage === 'residence_history_1') {
      // Smart: auto-picked last address outside US — no selection needed
      opts = { selectedAddr: cls.lastOutsideUs };
    } else {
      // Manual single-entry fallback picks from the computed 5-year list
      opts = { addressIndex: selectedAddressIndex, selectedAddr: cls.fiveYearList[selectedAddressIndex] || null };
    }
  }
  if (currentPage === 'school') {
    // Single-entry mode: fill the selected school into the open editor.
    // (Fill ALL has its own button in the school selector.)
    opts = { fillAllSchools: false, selectedSchoolIndex, sortedSchools: getSortedSchools() };
  }
  if (currentPage === 'employment') {
    // Single-entry mode: fill the selected CRM work row into the open editor.
    opts = { selectedWorkIndex };
  }
  if (currentPage === 'child_0_name' || currentPage === 'child_0_info') {
    // Which child's data goes into the open "Add child" editor.
    opts = { childIndex: selectedChildIndex };
  }

  try {
    const resp = await sendToContent({ type: 'FILL_PAGE', data: clientData, opts });
    const { page, results } = resp;
    const label = PAGE_LABELS[page] || page;

    const ok   = results.filter(r => r.ok).length;
    const fail = results.filter(r => !r.ok).length;

    setStatus(statusEl, `✅ ${label}: ${ok} filled, ${fail} skipped`, ok > 0 ? 'ok' : 'warn');

    // Show fill results (overrides preview until next page navigation)
    const html = results.map(r => `
      <div class="result-row">
        <div class="dot ${r.ok ? 'dot-ok' : 'dot-fail'}"></div>
        <div class="result-name">${String(r.name).split('.').pop()}</div>
        <div class="result-val">${r.val || '—'}</div>
      </div>
    `).join('');
    document.getElementById('fill-results').innerHTML = html;

    setTimeout(refreshPageTag, 800);

  } catch(e) {
    setStatus(statusEl, `❌ Error: ${e.message}`, 'err');
  }

  btn.disabled = false;
  btn.textContent = 'Fill This Page 填写此页';
});

// ── Change client ─────────────────────────────────────────────────────────────
document.getElementById('btn-clear').addEventListener('click', () => {
  clientData = null;
  selectedAddressIndex = 0;
  currentPage = 'unknown';
  stopPolling();
  chrome.storage.local.remove(['arreglo_data', 'arreglo_case', 'arreglo_address_index']);
  document.getElementById('step-fill').style.display = 'none';
  document.getElementById('step-login').style.display = 'block';
  document.getElementById('case-number').value = '';
  document.getElementById('load-status').textContent = '';
  document.getElementById('fill-results').innerHTML = '';
  document.getElementById('addr-selector').innerHTML = '';
  const schoolSel = document.getElementById('school-selector');
  if (schoolSel) schoolSel.innerHTML = '';
  selectedSchoolIndex = 0;
  selectedWorkIndex = 0;
  selectedChildIndex = 0;
});

// ── On popup open: restore session ───────────────────────────────────────────
chrome.storage.local.get(['arreglo_data', 'arreglo_case', 'arreglo_address_index'], async (result) => {
  if (result.arreglo_data && result.arreglo_case) {
    clientData = result.arreglo_data;
    selectedAddressIndex = Number.isInteger(result.arreglo_address_index)
      ? result.arreglo_address_index
      : 0;
    const saved = clientData;
    renderLoadedClient(result.arreglo_case, saved);
    // Render preview immediately from cached data — no USCIS ping needed
    renderAddressSelector('unknown');
    renderSchoolSelector('unknown');
    renderWorkSelector('unknown');
    renderChildSelector('unknown');
    renderFieldPreview('unknown');
    startPolling(); // poll will detect page and update preview within 600ms
    loadClientFromCloudflare(result.arreglo_case, { silent: true })
      .then(fresh => {
        if (fresh) {
          renderAddressSelector(currentPage);
          renderSchoolSelector(currentPage);
          renderWorkSelector(currentPage);
          renderChildSelector(currentPage);
          renderFieldPreview(currentPage);
        }
      })
      .catch(() => {});
  }
});

// v1.32.1: start polling only after the whole script has initialized —
// calling it earlier hit the `let _pollInterval` temporal dead zone, threw,
// and killed every event listener below it (the 'Load Client does nothing' bug).
initializeEoirCapture().catch((error) => {
  setEoirState(
    EOIR_STATES.IDLE,
    `Unable to initialize EOIR capture. ${error?.message || String(error)}`,
  );
});
startPolling();
