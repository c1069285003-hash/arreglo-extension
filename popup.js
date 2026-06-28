const WORKER = 'https://xinyuan.angie-li-business.workers.dev';
const PAGE_LABELS = {
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
let currentPage = 'unknown';

function setStatus(el, msg, type) {
  el.className = `status-box status-${type}`;
  el.textContent = msg;
  el.style.display = 'block';
  el.style.marginTop = '10px';
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

async function sendToContent(msg, retries = 3) {
  const tab = await getUscisTab() || await getActiveTab();
  if (!tab) throw new Error('No USCIS tab found. Please open my.uscis.gov first.');
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
          files: ['content.js']
        });
      } catch(_) {}
      await new Promise(r => setTimeout(r, 600));
    }
  }
}

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

// ── Render contextual field preview ──────────────────────────────────────────
function renderFieldPreview(page) {
  const el = document.getElementById('fill-results');
  if (!el || !clientData) return;

  const isAddrPage = page === 'residence_history_1' || page === 'residence_history_3';
  if (isAddrPage) {
    // For address pages, show the selected address fields as preview
    const addrs = getAllAddresses();
    const addr = addrs[selectedAddressIndex];
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

// ── Render address selector ───────────────────────────────────────────────────
function renderAddressSelector(page) {
  const el = document.getElementById('addr-selector');
  if (!el) return;

  const isAddrPage = page === 'residence_history_1' || page === 'residence_history_3';
  if (!isAddrPage || !clientData) {
    el.innerHTML = '';
    return;
  }

  const addrs = getAllAddresses();
  if (addrs.length === 0) {
    el.innerHTML = '<div style="color:#94a3b8;font-size:11px">No address history found</div>';
    return;
  }

  // Clamp index
  if (selectedAddressIndex >= addrs.length) selectedAddressIndex = 0;

  const cur = addrs[selectedAddressIndex];
  const label = getAddressLabel(cur);
  const dateRange = getAddressDateRange(cur);
  const isUS = (cur.country || '').toLowerCase().includes('united states') ||
               (cur.country || '').toLowerCase() === 'us' ||
               (cur.country || '').toLowerCase() === 'usa';

  el.innerHTML = `
    <div style="background:#f1f5f9;border-radius:8px;padding:8px 10px;margin-bottom:8px;font-size:11px;">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px;">
        <span style="font-weight:700;color:#1e3a5f">Address for this page</span>
        <span style="color:#64748b">${selectedAddressIndex + 1} / ${addrs.length}</span>
      </div>
      <div style="color:#1e293b;font-weight:600;margin-bottom:2px;font-size:12px">${label}</div>
      <div style="color:#64748b">${dateRange}</div>
      ${isUS ? '<div style="margin-top:3px;font-size:10px;color:#0369a1;font-weight:600">🇺🇸 US Address</div>' : ''}
      <div style="display:flex;gap:6px;margin-top:6px;">
        <button id="addr-prev" style="flex:1;padding:4px;border-radius:6px;border:1px solid #cbd5e1;background:#fff;cursor:pointer;font-size:12px">◀ Prev</button>
        <button id="addr-next" style="flex:1;padding:4px;border-radius:6px;border:1px solid #cbd5e1;background:#fff;cursor:pointer;font-size:12px">Next ▶</button>
      </div>
    </div>
  `;

  document.getElementById('addr-prev').onclick = () => {
    selectedAddressIndex = (selectedAddressIndex - 1 + addrs.length) % addrs.length;
    renderAddressSelector(page);
    renderFieldPreview(page);
  };
  document.getElementById('addr-next').onclick = () => {
    selectedAddressIndex = (selectedAddressIndex + 1) % addrs.length;
    renderAddressSelector(page);
    renderFieldPreview(page);
  };
}

// ── Refresh page detection & update UI ───────────────────────────────────────
let _pingFailCount = 0;

async function refreshPageTag() {
  try {
    const uscisTab = await getUscisTab();
    if (!uscisTab) {
      document.getElementById('page-tag').innerHTML =
        `<span class="page-tag" style="background:#fffbeb;color:#92400e">⚠️ Open my.uscis.gov in a tab</span>`;
      return;
    }
    let resp;
    try {
      resp = await chrome.tabs.sendMessage(uscisTab.id, { type: 'PING' });
      _pingFailCount = 0;
    } catch(pingErr) {
      _pingFailCount++;
      if (_pingFailCount >= 3) {
        // Clear the loading message after 3 fails — don't leave it stuck
        document.getElementById('page-tag').innerHTML =
          `<span class="page-tag" style="background:#f1f5f9;color:#64748b">📄 Ready</span>`;
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
      if (clientData) {
        // On address pages, default to China address (index 1) since US (0) is filled first
        const isAddrPage = currentPage === 'residence_history_1' || currentPage === 'residence_history_3';
        if (isAddrPage) {
          const addrs = getAllAddresses();
          if (addrs.length > 1 && selectedAddressIndex === 0) selectedAddressIndex = 1;
        }
        renderAddressSelector(currentPage);
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
  _pollInterval = setInterval(() => { if (clientData) refreshPageTag(); }, 600);
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
    const res = await fetch(`${WORKER}/case/${caseNum}`);
    const json = await res.json();

    if (!json.success || !json.client) {
      setStatus(statusEl, `❌ Case ${caseNum} not found`, 'err');
      btn.disabled = false;
      btn.textContent = 'Load Client 加载客户';
      return;
    }

    const client = json.client;
    const saved = client.infoFormData;

    if (!saved || (!saved.familyName && !saved.givenName)) {
      setStatus(statusEl, '⚠️ English info sheet not saved yet. Open CRM → Info Form → Save.', 'warn');
      btn.disabled = false;
      btn.textContent = 'Load Client 加载客户';
      return;
    }

    clientData = saved;
    selectedAddressIndex = 0;
    await chrome.storage.local.set({ arreglo_data: saved, arreglo_case: caseNum });

    document.getElementById('step-login').style.display = 'none';
    document.getElementById('step-fill').style.display = 'block';

    document.getElementById('client-card').innerHTML = `
      <div class="client-card">
        <div class="client-name">${saved.familyName || ''}, ${saved.givenName || ''}</div>
        <div class="client-meta">Case: ${caseNum} · DOB: ${saved.dob || '—'}</div>
        <div class="client-meta">Nationality: ${saved.nationality || saved.countryOfBirth || '—'}</div>
      </div>
    `;

    // Render preview immediately with whatever currentPage is — don't block on USCIS ping
    renderAddressSelector(currentPage);
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
  btn.textContent = 'Filling...';

  // Always detect page fresh at fill time — don't rely on poll currentPage
  try {
    const pingResp = await sendToContent({ type: 'PING' });
    if (pingResp?.page) currentPage = pingResp.page;
  } catch(_) {}

  const isAddrPage = currentPage === 'residence_history_1' || currentPage === 'residence_history_3';
  let opts = {};
  if (isAddrPage) {
    const addrs = getAllAddresses();
    const selectedAddr = addrs[selectedAddressIndex] || null;
    opts = { addressIndex: selectedAddressIndex, selectedAddr };
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
  chrome.storage.local.remove(['arreglo_data', 'arreglo_case']);
  document.getElementById('step-fill').style.display = 'none';
  document.getElementById('step-login').style.display = 'block';
  document.getElementById('case-number').value = '';
  document.getElementById('load-status').textContent = '';
  document.getElementById('fill-results').innerHTML = '';
  document.getElementById('addr-selector').innerHTML = '';
});

// ── On popup open: restore session ───────────────────────────────────────────
chrome.storage.local.get(['arreglo_data', 'arreglo_case'], async (result) => {
  if (result.arreglo_data && result.arreglo_case) {
    clientData = result.arreglo_data;
    selectedAddressIndex = 0;
    const saved = clientData;
    document.getElementById('step-login').style.display = 'none';
    document.getElementById('step-fill').style.display = 'block';
    document.getElementById('case-number').value = result.arreglo_case;
    document.getElementById('client-card').innerHTML = `
      <div class="client-card">
        <div class="client-name">${saved.familyName || ''}, ${saved.givenName || ''}</div>
        <div class="client-meta">Case: ${result.arreglo_case} · DOB: ${saved.dob || '—'}</div>
        <div class="client-meta">Nationality: ${saved.nationality || saved.countryOfBirth || '—'}</div>
      </div>
    `;
    // Render preview immediately from cached data — no USCIS ping needed
    renderAddressSelector('unknown');
    renderFieldPreview('unknown');
    startPolling(); // poll will detect page and update preview within 600ms
  }
});
