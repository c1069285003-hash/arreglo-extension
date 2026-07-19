// Arreglo Content Script — USCIS I-589 Autofill v1.27
// v1.27: MAIN-world bridge (Inputmask/zip fix), focusout events (save-without-
// click fix), passport 3-question fill, USCIS status option mapping (B2 -
// VISITOR FOR PLEASURE), port-of-entry punctuation-tolerant match, dynamic
// child index (all children, not just the first).

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// ── MAIN-world bridge ─────────────────────────────────────────────────────────
// The isolated world can't see el.inputmask (USCIS masked fields) or reliably
// trigger Formik's touched state. page-bridge.js runs in the page world.
let __bridgeInjected = false;
function ensureBridge() {
  if (__bridgeInjected) return;
  try {
    const s = document.createElement('script');
    s.src = chrome.runtime.getURL('page-bridge.js');
    s.onload = () => s.remove();
    (document.head || document.documentElement).appendChild(s);
    __bridgeInjected = true;
  } catch (e) { /* keep fallbacks */ }
}
function bridgeSet(name, value) {
  ensureBridge();
  return new Promise(resolve => {
    const reqId = Math.random().toString(36).slice(2);
    const onRes = (e) => {
      if (e.detail && e.detail.reqId === reqId) {
        window.removeEventListener('ARREGLO_SET_VALUE_RESULT', onRes);
        resolve(e.detail);
      }
    };
    window.addEventListener('ARREGLO_SET_VALUE_RESULT', onRes);
    window.dispatchEvent(new CustomEvent('ARREGLO_SET_VALUE', { detail: { name, value, reqId } }));
    setTimeout(() => { window.removeEventListener('ARREGLO_SET_VALUE_RESULT', onRes); resolve({ ok: false, timeout: true }); }, 1500);
  });
}

// ── React value setter (works with React 16/17/18) ────────────────────────────
function setReactValue(el, value) {
  if (!el) return false;
  try {
    const proto = el.tagName === 'TEXTAREA'
      ? window.HTMLTextAreaElement.prototype
      : window.HTMLInputElement.prototype;
    const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
    if (setter) setter.call(el, value);
    else el.value = value;
    el.dispatchEvent(new Event('input',  { bubbles: true, cancelable: true }));
    el.dispatchEvent(new Event('change', { bubbles: true, cancelable: true }));
    return true;
  } catch(e) { return false; }
}

// ── Plain text fill + focus/blur cycle so React/Formik commits the value ──────
function fillByName(name, value) {
  if (value === undefined || value === null || value === '') return false;
  const el = document.querySelector(`[name="${name}"]`);
  if (!el) return false;
  el.focus();
  el.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
  el.dispatchEvent(new FocusEvent('focus', { bubbles: true }));
  setReactValue(el, value);
  // Extra: simulate user typing end so Formik marks field as touched.
  // v1.27: React 17+ delegates blur via focusout — without it values display
  // but never commit ("saved only after clicking the box with the mouse").
  el.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true }));
  el.dispatchEvent(new FocusEvent('focusout', { bubbles: true }));
  el.dispatchEvent(new FocusEvent('blur', { bubbles: true }));
  el.dispatchEvent(new Event('blur', { bubbles: true }));
  el.blur();
  return true;
}

// ── Find an input by its question/label text (for fields whose name is only
// known after a radio reveals them — e.g. the passport questions) ─────────────
function findInputByLabel(labelSub) {
  const needle = labelSub.toLowerCase();
  const cands = [...document.querySelectorAll('label, legend, p, span, h2, h3')];
  const lab = cands.find(l => (l.textContent || '').toLowerCase().includes(needle));
  if (!lab) return null;
  const forId = lab.getAttribute && lab.getAttribute('for');
  if (forId) { const el = document.getElementById(forId); if (el) return el; }
  let p = lab.parentElement;
  for (let i = 0; i < 5 && p; i++, p = p.parentElement) {
    const el = p.querySelector('input:not([type="radio"]):not([type="checkbox"]), textarea');
    if (el) return el;
  }
  return null;
}

// ── Masked input — char-by-char with native setter (v1.16 method that worked for US address)
async function fillMasked(name, value) {
  if (!value) return false;
  const el = document.querySelector(`[name="${name}"]`);
  if (!el) return false;

  const str = String(value);

  // v1.27 PRIMARY: main-world bridge — the only place el.inputmask is visible.
  // (Isolated-world code below never saw it, which is why zip codes like
  // 91731 filled visually but saved blank.)
  const bridged = await bridgeSet(name, str);
  if (bridged.ok && (bridged.value === str || (bridged.value || '').replace(/\D/g, '') === str.replace(/\D/g, ''))) {
    return true;
  }

  el.focus();
  await sleep(40);

  // Primary: use Inputmask's own setValue API
  // USCIS uses Inputmask library — must use its internal setValue so the buffer updates
  // Bypassing it (native setter, execCommand, keyboard events) leaves buffer empty → blank save
  if (el.inputmask?.setValue) {
    el.inputmask.setValue(str);
    await sleep(50);
    el.dispatchEvent(new Event('input',  {bubbles:true}));
    el.dispatchEvent(new Event('change', {bubbles:true}));
    el.blur();
    await sleep(40);
    return el.value === str;
  }

  // Secondary: Inputmask setvalue CustomEvent
  el.dispatchEvent(new CustomEvent('setvalue', {
    detail: [str],
    bubbles: false,
  }));
  await sleep(50);
  el.dispatchEvent(new Event('input',  {bubbles:true}));
  el.dispatchEvent(new Event('change', {bubbles:true}));
  el.blur();
  await sleep(40);

  if (el.value === str) return true;

  // Fallback: native setter + React events (for non-Inputmask masked fields)
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
  setter.call(el, str);
  el.dispatchEvent(new Event('input',  {bubbles:true}));
  el.dispatchEvent(new Event('change', {bubbles:true}));
  el.dispatchEvent(new FocusEvent('blur', {bubbles:true}));
  await sleep(40);
  return el.value === str;
}

// ── MUI Autocomplete — SCOPED fill (only looks at THIS field's listbox) ────────
// This is the correct way: keep focus on THIS input, wait for ITS listbox,
// find the option inside that specific listbox, click it, then blur.
async function fillAutocomplete(name, value) {
  if (!value) return false;
  const input = document.querySelector(`[name="${name}"]`);
  if (!input) return false;

  // Close any open dropdown first
  document.body.click();
  await sleep(120);

  input.focus();
  await sleep(80);
  setReactValue(input, value);
  await sleep(900); // wait for this field's listbox to open and populate

  // Find the listbox that belongs to THIS input (via aria-owns or aria-controls)
  const listboxId = input.getAttribute('aria-owns') ||
                    input.getAttribute('aria-controls') ||
                    input.getAttribute('aria-activedescendant')?.replace(/-\d+$/, '');

  let listbox = null;
  if (listboxId) {
    listbox = document.getElementById(listboxId) ||
              document.querySelector(`[id="${listboxId}"]`);
  }
  // Fallback: find the only visible listbox in DOM
  if (!listbox) {
    const allListboxes = [...document.querySelectorAll('[role="listbox"]')];
    listbox = allListboxes.find(lb => {
      const rect = lb.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0; // visible
    }) || null;
  }

  if (!listbox) {
    // No listbox appeared — try arrow down to open
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', keyCode: 40, bubbles: true }));
    await sleep(400);
    const allLb = [...document.querySelectorAll('[role="listbox"]')];
    listbox = allLb.find(lb => lb.getBoundingClientRect().width > 0) || null;
  }

  if (listbox) {
    const options = [...listbox.querySelectorAll('[role="option"], li')];
    let found = options.find(o => (o.textContent||'').trim().toLowerCase() === value.toLowerCase());
    if (!found) found = options.find(o => (o.textContent||'').trim().toLowerCase().startsWith(value.toLowerCase()));
    if (found) {
      found.click();
      await sleep(200);
      // Verify the value was committed
      if (input.value.toLowerCase().includes(value.toLowerCase())) {
        // Success — blur to commit to Formik
        input.dispatchEvent(new FocusEvent('blur', { bubbles: true }));
        await sleep(150);
        return true;
      }
    }
  }

  // Fallback: press Enter on whatever is highlighted
  input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', keyCode: 13, bubbles: true }));
  await sleep(150);
  input.dispatchEvent(new FocusEvent('blur', { bubbles: true }));
  await sleep(150);
  return false;
}

// ── MUI Select (State dropdown on preparer page — has div[role="button"] trigger) ──
async function fillMuiSelect(name, value) {
  if (!value) return false;
  const input = document.querySelector(`[name="${name}"]`);
  if (!input) return false;
  document.body.click();
  await sleep(150);
  const root = input.closest('.MuiInputBase-root') || input.parentElement;
  const trigger = root?.querySelector('div[role="button"]') ||
                  root?.querySelector('.MuiSelect-select') ||
                  root?.querySelector('[aria-haspopup="listbox"]') || root;
  trigger.click();
  await sleep(600);
  const opts = [...document.querySelectorAll('ul[role="listbox"] li, [role="option"], .MuiMenuItem-root')];
  for (const opt of opts) {
    if ((opt.textContent||'').trim() === String(value)) {
      opt.click(); await sleep(200); return true;
    }
  }
  document.body.click();
  return false;
}

// ── Radio / Checkbox ──────────────────────────────────────────────────────────
function clickRadio(name, label) {
  const radios = [...document.querySelectorAll(`input[type="radio"][name="${name}"]`)];
  for (const r of radios) {
    const lbl = r.closest('label') || document.querySelector(`label[for="${r.id}"]`);
    if ((lbl?.textContent || r.value || '').trim().toLowerCase().includes(label.toLowerCase())) {
      r.click(); return true;
    }
  }
  return false;
}
function setCheckbox(name, checked) {
  const el = document.querySelector(`input[type="checkbox"][name="${name}"]`);
  if (!el) return false;
  if (el.checked !== checked) el.click();
  return true;
}

// ── USPS dialog ───────────────────────────────────────────────────────────────
async function handleUspsDialog() {
  for (let i = 0; i < 8; i++) {
    await sleep(500);
    if (!document.body.innerText.includes('Verify your address') &&
        !document.body.innerText.includes('recommended address')) continue;
    for (const label of [...document.querySelectorAll('label, [role="radio"]')]) {
      if ((label.textContent||'').toLowerCase().includes('recommended')) { label.click(); await sleep(300); break; }
    }
    for (const btn of [...document.querySelectorAll('button')]) {
      if (/use selected|use recommended|confirm/i.test(btn.textContent||'')) {
        btn.click(); await sleep(500); return true;
      }
    }
  }
  return false;
}

// ── Date helpers ──────────────────────────────────────────────────────────────
function fmtDate(d) {
  if (!d) return '';
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(d)) return d;
  const m = d.match(/^(\d{4})[\/-](\d{1,2})[\/-](\d{1,2})$/);
  if (m) return `${m[2].padStart(2,'0')}/${m[3].padStart(2,'0')}/${m[1]}`;
  return d;
}
function parseYM(ym) {
  if (!ym) return { month: '', year: '' };
  let m = String(ym).match(/^(\d{4})[\/\-](\d{1,2})$/);
  if (m) return { year: m[1], month: m[2].padStart(2,'0') };
  m = String(ym).match(/^(\d{1,2})\/(\d{4})$/);
  if (m) return { year: m[2], month: m[1].padStart(2,'0') };
  m = String(ym).match(/^(\d{4})$/);
  if (m) return { year: m[1], month: '' };
  return { month: '', year: '' };
}
function addrFromDate(addr) {
  if (addr.fromDate) return addr.fromDate;
  if (addr.fromYear) return `${addr.fromYear}/${String(addr.fromMonth||'01').padStart(2,'0')}`;
  return '';
}
function addrToDate(addr) {
  if (addr.toDate) return addr.toDate;
  if (addr.toYear) return `${addr.toYear}/${String(addr.toMonth||'01').padStart(2,'0')}`;
  return '';
}
function cleanPhone(p) { return (p||'').replace(/\D/g,'').slice(-10); }

const MONTH_NAMES = {
  '01':'January','02':'February','03':'March','04':'April',
  '05':'May','06':'June','07':'July','08':'August',
  '09':'September','10':'October','11':'November','12':'December',
};
function monthName(m) { return MONTH_NAMES[String(m).padStart(2,'0')] || ''; }

const STATE_FULL = {
  'AL':'ALABAMA','AK':'ALASKA','AZ':'ARIZONA','AR':'ARKANSAS','CA':'CALIFORNIA',
  'CO':'COLORADO','CT':'CONNECTICUT','DE':'DELAWARE','FL':'FLORIDA','GA':'GEORGIA',
  'HI':'HAWAII','ID':'IDAHO','IL':'ILLINOIS','IN':'INDIANA','IA':'IOWA',
  'KS':'KANSAS','KY':'KENTUCKY','LA':'LOUISIANA','ME':'MAINE','MD':'MARYLAND',
  'MA':'MASSACHUSETTS','MI':'MICHIGAN','MN':'MINNESOTA','MS':'MISSISSIPPI','MO':'MISSOURI',
  'MT':'MONTANA','NE':'NEBRASKA','NV':'NEVADA','NH':'NEW HAMPSHIRE','NJ':'NEW JERSEY',
  'NM':'NEW MEXICO','NY':'NEW YORK','NC':'NORTH CAROLINA','ND':'NORTH DAKOTA','OH':'OHIO',
  'OK':'OKLAHOMA','OR':'OREGON','PA':'PENNSYLVANIA','RI':'RHODE ISLAND','SC':'SOUTH CAROLINA',
  'SD':'SOUTH DAKOTA','TN':'TENNESSEE','TX':'TEXAS','UT':'UTAH','VT':'VERMONT',
  'VA':'VIRGINIA','WA':'WASHINGTON','WV':'WEST VIRGINIA','WI':'WISCONSIN','WY':'WYOMING',
  'DC':'DISTRICT OF COLUMBIA',
};
function toFullState(s) {
  if (!s) return '';
  const up = s.toUpperCase().trim();
  return STATE_FULL[up] || up;
}

const PREPARER = {
  firstName:'Lauren', lastName:'Zhou', phone:'6266137634',
  address1:'3380 Flair Dr', address2:'', city:'El Monte',
  stateCode:'CA', stateFull:'CALIFORNIA', zip:'91731',
};

// ── Page detection ────────────────────────────────────────────────────────────
function detectPage() {
  const inputs = [...document.querySelectorAll('input,select,textarea')];
  const names = new Set(inputs.map(e => e.name).filter(Boolean));
  const url = window.location.href;

  if (url.includes('/getting-started/legal-assistance'))                     return 'legal_assistance';
  if (url.includes('family-member-preparer') && !url.includes('preparer-page-2')) return 'preparer_family';
  if (url.includes('preparer-page-2'))                                       return 'preparer_info';
  if ([...names].some(n => n.includes('preparer.nonFamilyMemberAsPreparer.name'))) return 'preparer_info';
  if ([...names].some(n => n.includes('applicant.yourName.name.firstName')))  return 'your_name';
  if ([...names].some(n => n.includes('applicant.background.physicalAddress'))) return 'contact';
  if ([...names].some(n => n.includes('applicant.whenAndWhereYouWereBorn.dateOfBirth'))) return 'birth';
  if ([...names].some(n => n.includes('applicant.background2.gender')))       return 'describe_yourself';
  if ([...names].some(n => n.includes('residenceHistory1.lastAddressOutsideUs'))) return 'residence_history_1';
  if ([...names].some(n => n.includes('residenceHistory3')))                  return 'residence_history_3';
  if ([...names].some(n => n.includes('applicant.schoolHistory')))            return 'school';
  if ([...names].some(n => n.includes('applicant.employmentHistory')))        return 'employment';
  if ([...names].some(n => n.includes('immigrationInformation1')))            return 'immigration_info_1';
  if ([...names].some(n => n.includes('immigrationInformation2')))            return 'immigration_info_2';
  if ([...names].some(n => n.includes('applicant.maritalStatus')))            return 'marital_status';
  if (names.has('applicant.children.doYouHaveChildren'))                      return 'children_yn';
  if ([...names].some(n => n.includes('childrenDetails.numberOfChildren')))   return 'children_count';
  if ([...names].some(n => n.includes('childrenInformation1.name.firstName'))) return 'child_0_name';
  if ([...names].some(n => n.includes('childrenInformation2.dateOfBirth')))   return 'child_0_info';
  if ([...names].some(n => n.includes('applicant.mother.name.firstName')))    return 'mother';
  if ([...names].some(n => n.includes('applicant.father.name.firstName')))    return 'father';
  if ([...names].some(n => /applicant\.siblings\.\d+/.test(n)))               return 'siblings';
  if (url.includes('sibling'))                                                return 'siblings';
  return 'unknown';
}

// ── Click "Save address" button on USCIS address pages ──────────────────────────
async function clickSaveAddress() {
  // Small pause to let last field's blur/change events settle
  await sleep(300);

  // Find and click Save address button (only once)
  const btns = [...document.querySelectorAll('button')];
  const saveBtn = btns.find(btn => {
    const txt = (btn.textContent || '').trim().toLowerCase();
    return txt === 'save address' || txt.includes('save address');
  });
  if (saveBtn && !saveBtn.disabled) {
    saveBtn.click();
    await sleep(800);
    return true;
  }
  return false;
}

// ── Fill one address entry (residence_history_3) ──────────────────────────────
async function fillAddressEntry(addr, p, isUS, extraData) {
  const log = [];

  // 1. Country — fill first, then wait for React to re-render the form
  //    (Country selection changes State label to Province, may unmount/remount fields)
  const country = isUS ? 'United States' : (addr.country || 'China');
  await fillAutocomplete(`${p}.address.country`, country);
  await sleep(800); // must wait for full re-render before touching any other field

  // ALL address sub-fields on residenceHistory3 are masked-input type.
  // Field names confirmed from console:
  //   addressLineOne, addressLineTwo, city, province (NOT state), postalCode (NOT zipCode)
  // Fill order: lines → state/province → city → postal (state last before city to avoid wipe)

  // 2. Address lines (masked-input)
  if (addr.addressLine1) { await fillMasked(`${p}.address.addressLineOne`, addr.addressLine1); await sleep(60); }
  if (addr.addressLine2) { await fillMasked(`${p}.address.addressLineTwo`, addr.addressLine2); await sleep(60); }

  // 3. State (US) or Province (China) — fill before city
  if (isUS) {
    const fullState = toFullState(addr.province || '');
    if (fullState) {
      // US: state is MUI Autocomplete
      await fillAutocomplete(`${p}.address.state`, fullState);
      await sleep(600);
    }
  } else {
    // China: province is masked-input named "address.province" (NOT "address.state")
    if (addr.province) {
      await fillMasked(`${p}.address.province`, addr.province);
      await sleep(60);
    }
  }

  // 4. City (masked-input) — after province/state to avoid re-render wipe
  if (addr.city) {
    await fillMasked(`${p}.address.city`, addr.city);
    await sleep(60);
    // Verify and retry once if wiped
    const cityEl = document.querySelector(`[name="${p}.address.city"]`);
    if (cityEl && cityEl.value !== addr.city) {
      await sleep(200);
      await fillMasked(`${p}.address.city`, addr.city);
    }
  }

  // 5. Postal code — named "postalCode" not "zipCode" on this page
  const zip = addr.postalCode || addr.zip || '';
  if (zip) {
    // Try postalCode first (China/international), then zipCode (US)
    const postalOk = await fillMasked(`${p}.address.postalCode`, zip);
    if (!postalOk) await fillMasked(`${p}.address.zipCode`, zip);
  }

  // 6. From date
  let fromStr = addrFromDate(addr);
  // US current address: use lastEntryDate as fromDate
  if (isUS && !fromStr && extraData?.lastEntryDate) {
    const m2 = extraData.lastEntryDate.match(/^(\d{2})\/\d{2}\/(\d{4})$/);
    if (m2) fromStr = `${m2[2]}/${m2[1]}`;
    else fromStr = extraData.lastEntryDate;
  }
  const from = parseYM(fromStr);
  const to   = parseYM(addrToDate(addr));

  if (from.month) { await fillAutocomplete(`${p}.dates.fromDate.month`, monthName(from.month)); await sleep(200); }
  if (from.year)  { await fillAutocomplete(`${p}.dates.fromDate.year`,  from.year);             await sleep(200); }

  // 7. To date
  if (to.month) {
    await fillAutocomplete(`${p}.dates.toDate.month`, monthName(to.month)); await sleep(200);
    if (to.year) { await fillAutocomplete(`${p}.dates.toDate.year`, to.year); await sleep(200); }
  } else if (isUS) {
    await fillAutocomplete(`${p}.dates.toDate.month`, 'Present'); await sleep(200);
    await fillAutocomplete(`${p}.dates.toDate.year`,  'Present'); await sleep(200);
  } else if (to.year) {
    await fillAutocomplete(`${p}.dates.toDate.year`, to.year); await sleep(200);
  }

  return log;
}

// ── Fill page ─────────────────────────────────────────────────────────────────
async function fillPage(page, d, opts = {}) {
  const results = [];
  const fill = (name, val) => {
    const ok = fillByName(name, val);
    results.push({ name: name.split('.').pop(), val, ok });
    return ok;
  };
  const auto = async (name, val) => {
    const ok = await fillAutocomplete(name, val);
    results.push({ name: name.split('.').pop(), val, ok });
    return ok;
  };

  switch(page) {
    case 'legal_assistance':
      clickRadio('preparer.legalAssistance.providedWithListOfCounsel', 'Yes');
      results.push({ name: 'legalAssistance', val: 'Yes', ok: true });
      break;

    case 'preparer_family':
      clickRadio('preparer.familyMemberAsPreparer.familyMemberAsPreparer', 'No');
      results.push({ name: 'familyMember', val: 'No', ok: true });
      break;

    case 'preparer_info': {
      clickRadio('preparer.nonFamilyMemberAsPreparer.nonFamilyMemberAsPreparer', 'Yes');
      await sleep(400);
      fill('preparer.nonFamilyMemberAsPreparer.name.firstName', PREPARER.firstName);
      fill('preparer.nonFamilyMemberAsPreparer.name.lastName',  PREPARER.lastName);
      fill('preparer.nonFamilyMemberAsPreparer.daytimePhone',   PREPARER.phone);
      fill('preparer.nonFamilyMemberAsPreparer.address.addressLineOne', PREPARER.address1);
      fill('preparer.nonFamilyMemberAsPreparer.address.addressLineTwo', PREPARER.address2);
      fill('preparer.nonFamilyMemberAsPreparer.address.city',   PREPARER.city);
      // State on preparer page: try MUI Select first (has div[role=button]), fallback autocomplete
      const stateOk = await fillMuiSelect('preparer.nonFamilyMemberAsPreparer.address.state', PREPARER.stateFull);
      if (!stateOk) await fillAutocomplete('preparer.nonFamilyMemberAsPreparer.address.state', PREPARER.stateCode);
      await sleep(600);
      for (let i = 0; i < 4; i++) {
        const ok = await fillMasked('preparer.nonFamilyMemberAsPreparer.address.zipCode', PREPARER.zip);
        if (ok) break;
        await sleep(200);
      }
      results.push({ name: 'preparer', val: `${PREPARER.firstName} ${PREPARER.lastName}`, ok: true });
      break;
    }

    case 'your_name':
      fill('applicant.yourName.name.firstName',  d.givenName);
      fill('applicant.yourName.name.middleName', d.middleName || '');
      fill('applicant.yourName.name.lastName',   d.familyName);
      if (d.aliasNone) clickRadio('formikFactoryUIMeta.applicant.yourName.additionalNames.hasAdditionalNames', 'No');
      break;

    case 'contact':
      fill('applicant.background.physicalAddress.usAddress.addressLineOne', d.usAddressLine1);
      fill('applicant.background.physicalAddress.usAddress.addressLineTwo', d.usAddressLine2 || '');
      fill('applicant.background.physicalAddress.usAddress.city',           d.usCity);
      await auto('applicant.background.physicalAddress.usAddress.state',    d.usState || 'CA');
      fill('applicant.background.physicalAddress.usAddress.zipCode',        d.usZip);
      fill('applicant.background.physicalAddress.phoneNumber',              cleanPhone(d.phone));
      setCheckbox('formikFactoryUIMeta.applicant.background.mailingAddress.mailingAddressSameAsPhysicalAddress', true);
      await handleUspsDialog();
      break;

    case 'birth':
      fill('applicant.whenAndWhereYouWereBorn.dateOfBirth',    fmtDate(d.dob));
      fill('applicant.whenAndWhereYouWereBorn.cityOfBirth',    d.cityOfBirth);
      await auto('applicant.whenAndWhereYouWereBorn.countryOfBirth',   d.countryOfBirth  || 'China');
      await auto('applicant.whenAndWhereYouWereBorn.birthNationality', d.nationality     || 'China');
      break;

    case 'describe_yourself':
      clickRadio('applicant.background2.gender', d.sex === 'Female' ? 'Female' : 'Male');
      await auto('applicant.background2.race',           d.ethnicity === 'Han' ? 'Chinese' : (d.ethnicity || 'Chinese'));
      await auto('applicant.background2.religion',       d.religionNone ? 'None' : (d.religion || 'None'));
      await auto('applicant.background2.nativeLanguage', d.nativeLanguage || 'Mandarin');
      clickRadio('applicant.background2.fluentEnglish', 'No');
      break;

    case 'residence_history_1': {
      const addr = opts.selectedAddr;
      if (!addr) { results.push({ name: 'address', val: 'none selected', ok: false }); break; }
      const isUS = !!addr._isUS;
      const country = isUS ? 'United States' : (addr.country || 'China');
      await auto('applicant.residenceHistory.residenceHistory1.lastAddressOutsideUs.country', country);
      await sleep(400);
      // All sub-fields here are also masked-input
      if (addr.addressLine1) await fillMasked('applicant.residenceHistory.residenceHistory1.lastAddressOutsideUs.addressLineOne', addr.addressLine1);
      if (addr.addressLine2) await fillMasked('applicant.residenceHistory.residenceHistory1.lastAddressOutsideUs.addressLineTwo', addr.addressLine2);
      if (addr.province)     await fillMasked('applicant.residenceHistory.residenceHistory1.lastAddressOutsideUs.province', addr.province);
      if (addr.city)         await fillMasked('applicant.residenceHistory.residenceHistory1.lastAddressOutsideUs.city', addr.city);
      if (addr.postalCode)   await fillMasked('applicant.residenceHistory.residenceHistory1.lastAddressOutsideUs.postalCode', addr.postalCode);
      const from1 = parseYM(addrFromDate(addr));
      const to1   = parseYM(addrToDate(addr));
      if (from1.month) { await fillAutocomplete('applicant.residenceHistory.residenceHistory1.dates.fromDate.month', monthName(from1.month)); await sleep(200); }
      if (from1.year)  { await fillAutocomplete('applicant.residenceHistory.residenceHistory1.dates.fromDate.year',  from1.year); await sleep(200); }
      if (to1.month)   { await fillAutocomplete('applicant.residenceHistory.residenceHistory1.dates.toDate.month',   monthName(to1.month)); await sleep(200); }
      if (to1.year)    { await fillAutocomplete('applicant.residenceHistory.residenceHistory1.dates.toDate.year',    to1.year); await sleep(200); }
      clickRadio('formikFactoryUIMeta.applicant.residenceHistory.residenceHistory1.isFromCountryWhereFearedPersecution', 'Yes');
      await sleep(400);
      await clickSaveAddress();
      results.push({ name: 'address', val: addr.addressLine1 || addr.city, ok: true });
      break;
    }

    case 'residence_history_3': {
      const addr = opts.selectedAddr;
      if (!addr) { results.push({ name: 'address', val: 'none selected', ok: false }); break; }
      const isUS = !!addr._isUS;
      // Detect actual index dynamically
      const anyField = document.querySelector('input[name*="residenceHistory3."]');
      const idxMatch = anyField?.name.match(/residenceHistory3\.(\d+)\./);
      const idx = idxMatch ? idxMatch[1] : '0';
      const p = `applicant.residenceHistory.residenceHistory3.${idx}`;
      await fillAddressEntry(addr, p, isUS, d);
      // Auto-click "Save address" button to commit the entry to USCIS
      await sleep(400);
      await clickSaveAddress();
      results.push({ name: 'address', val: addr.addressLine1 || addr.city, ok: true });
      break;
    }

    case 'school': {
      const edu = (d.eduList || [])[0];
      if (edu) {
        fill('applicant.schoolHistory.0.name', edu.school || '');
        fill('applicant.schoolHistory.0.type', edu.level  || '');
        await auto('applicant.schoolHistory.0.address.country', edu.country || 'China');
        await fillMasked('applicant.schoolHistory.0.address.city', edu.city || '');
        await fillMasked('applicant.schoolHistory.0.address.zipCode', edu.zipcode || '');
        const fromYM = parseYM(edu.startDate || (edu.startYear ? `${edu.startYear}/09` : ''));
        const toYM   = parseYM(edu.endDate   || (edu.endYear   ? `${edu.endYear}/07`   : ''));
        if (fromYM.month) { await fillAutocomplete('applicant.schoolHistory.0.dates.fromDate.month', monthName(fromYM.month) || 'September'); await sleep(200); }
        if (fromYM.year)  { await fillAutocomplete('applicant.schoolHistory.0.dates.fromDate.year',  fromYM.year || edu.startYear); await sleep(200); }
        if (toYM.month)   { await fillAutocomplete('applicant.schoolHistory.0.dates.toDate.month',   monthName(toYM.month) || 'July'); await sleep(200); }
        if (toYM.year)    { await fillAutocomplete('applicant.schoolHistory.0.dates.toDate.year',    toYM.year   || edu.endYear); await sleep(200); }
      }
      break;
    }

    case 'employment': {
      const work = (d.workList || [])[0];
      if (work) {
        fill('applicant.employmentHistory.0.name',       work.company  || '');
        fill('applicant.employmentHistory.0.occupation', work.position || '');
        await auto('applicant.employmentHistory.0.address.country', work.country || 'China');
        await fillMasked('applicant.employmentHistory.0.address.city', work.city || '');
        const from = parseYM(work.startDate);
        const to   = parseYM(work.endDate);
        if (from.month) { await fillAutocomplete('applicant.employmentHistory.0.dates.fromDate.month', monthName(from.month)); await sleep(200); }
        if (from.year)  { await fillAutocomplete('applicant.employmentHistory.0.dates.fromDate.year',  from.year); await sleep(200); }
        if (to.month)   { await fillAutocomplete('applicant.employmentHistory.0.dates.toDate.month',   monthName(to.month)); await sleep(200); }
        if (to.year)    { await fillAutocomplete('applicant.employmentHistory.0.dates.toDate.year',    to.year); await sleep(200); }
      }
      break;
    }

    case 'immigration_info_1': {
      await auto('applicant.immigrationInformation.immigrationInformation1.presentNationality', d.nationality || 'China');

      // v1.27: passport 3 questions — the fields only render after "Yes", and
      // their names aren't in the exported structure, so locate them by label.
      const hasPassport = !!(d.passportNumber || d.passportCountry);
      clickRadio('formikFactoryUIMeta.applicant.immigrationInformation.immigrationInformation1.hasPassportOrTravelDocument', hasPassport ? 'Yes' : 'No');
      if (hasPassport) {
        await sleep(900); // wait for the three fields to render
        const cEl = findInputByLabel('country issued your last passport');
        if (cEl && cEl.name) {
          const ok = await fillAutocomplete(cEl.name, d.passportCountry || 'China');
          results.push({ name: 'passportCountry', val: d.passportCountry || 'China', ok });
        }
        const nEl = findInputByLabel('passport number or travel document number');
        if (nEl && nEl.name) {
          const r = await bridgeSet(nEl.name, d.passportNumber || '');
          results.push({ name: 'passportNumber', val: d.passportNumber, ok: !!r.ok });
        }
        const eEl = findInputByLabel('expiration date of your passport');
        if (eEl && eEl.name && (d.passportExpiry || d.passportExpirationDate)) {
          const r = await bridgeSet(eEl.name, fmtDate(d.passportExpiry || d.passportExpirationDate));
          results.push({ name: 'passportExpiry', val: d.passportExpiry, ok: !!r.ok });
        }
      }

      await fillMasked('applicant.immigrationInformation.immigrationInformation1.i94Number', d.i94Number || '');
      await fillMasked('applicant.immigrationInformation.immigrationInformation1.mostRecentEntry.dateOfEntry', fmtDate(d.lastEntryDate));

      // v1.27: USCIS port options have no punctuation ("LOS ANGELES CA") —
      // strip commas/periods from CRM's "Los Angeles, CA" before matching.
      const port = String(d.entryPort || '').replace(/[.,]/g, '').replace(/\s+/g, ' ').trim();
      await auto('applicant.immigrationInformation.immigrationInformation1.mostRecentEntry.placeOfEntry.referenceSelectOption', port);

      // v1.27: status is a combobox with options like "B2 - VISITOR FOR
      // PLEASURE" — map CRM values to the USCIS code, then prefix-match.
      const STATUS_TO_USCIS = {
        'B-2': 'B2 - VISITOR FOR PLEASURE', 'B-1': 'B1 - VISITOR FOR BUSINESS',
        'F-1': 'F1', 'J-1': 'J1', 'H-1B': 'H1B',
      };
      const rawStatus = (d.lastEntryStatus || 'B-2').split(' ')[0];
      const uscisStatus = STATUS_TO_USCIS[rawStatus] || rawStatus.replace('-', '');
      const stOk = await fillAutocomplete('applicant.immigrationInformation.immigrationInformation1.mostRecentEntry.status', uscisStatus);
      if (!stOk) await fillAutocomplete('applicant.immigrationInformation.immigrationInformation1.mostRecentEntry.status', rawStatus.replace('-', ''));
      results.push({ name: 'status', val: uscisStatus, ok: true });

      await fillMasked('applicant.immigrationInformation.immigrationInformation1.mostRecentEntry.dateStatusExpires', fmtDate(d.dateStatusExpires || d.i94StatusExpiry || d.visaExpiry));
      clickRadio('formikFactoryUIMeta.applicant.immigrationInformation.immigrationInformation1.otherEntries', 'No');
      break;
    }

    case 'immigration_info_2': {
      const court = d.courtHistory || 'No';
      if (court.toLowerCase().includes('currently') || court.toLowerCase().includes('now'))
        clickRadio('applicant.immigrationInformation.immigrationInformation2.immigrationCourtProceedings', 'now');
      else if (court.toLowerCase().includes('previously') || court.toLowerCase().includes('past'))
        clickRadio('applicant.immigrationInformation.immigrationInformation2.immigrationCourtProceedings', 'past');
      else
        clickRadio('applicant.immigrationInformation.immigrationInformation2.immigrationCourtProceedings', 'never');
      if (d.alienNumber) fill('applicant.immigrationInformation.immigrationInformation2.alienNumber.number', d.alienNumber);
      else setCheckbox('formikFactoryUIMeta.applicant.immigrationInformation.immigrationInformation2.alienNumber.none', true);
      if (d.ssn) fill('applicant.immigrationInformation.immigrationInformation2.socialSecurityNumber.number', d.ssn);
      else setCheckbox('formikFactoryUIMeta.applicant.immigrationInformation.immigrationInformation2.socialSecurityNumber.none', true);
      setCheckbox('formikFactoryUIMeta.applicant.immigrationInformation.immigrationInformation2.uscisNumber.none', true);
      break;
    }

    case 'marital_status': {
      const ms = d.maritalStatus || 'Single';
      clickRadio('applicant.maritalStatus.maritalStatus', ms);
      if (ms === 'Married') {
        await sleep(300);
        fill('applicant.maritalStatus.marriageDate',     fmtDate(d.marriageDate));
        fill('applicant.maritalStatus.marriageLocation', d.marriagePlace || '');
      }
      break;
    }

    case 'children_yn':
      clickRadio('applicant.children.doYouHaveChildren', (d.children||[]).length > 0 ? 'Yes' : 'No');
      break;

    case 'children_count': {
      const n = String((d.children||[]).length);
      // v1.27: masked-input aware fill with verification (was silently skipped)
      const ok = await fillMasked('applicant.childrenDetails.numberOfChildren', n);
      if (!ok) fill('applicant.childrenDetails.numberOfChildren', n);
      results.push({ name: 'numberOfChildren', val: n, ok: true });
      break;
    }

    case 'child_0_name': {
      // v1.27: index is dynamic — USCIS repeats this page per child (.0., .1., …)
      const anyC = document.querySelector('input[name*="childrenInformation1.name.firstName"]');
      const cIdx = parseInt(anyC?.name.match(/childrenInformation\.(\d+)\./)?.[1] || '0', 10);
      const c = (d.children||[])[cIdx];
      if (c) {
        const cp = `applicant.childrenDetails.childrenInformation.${cIdx}.childrenInformation1`;
        fill(`${cp}.name.firstName`, c.firstName||'');
        fill(`${cp}.name.lastName`,  c.lastName||'');
        if (c.middleName) fill(`${cp}.name.middleName`, c.middleName);
        results.push({ name: 'childIndex', val: `#${cIdx + 1} ${c.firstName || ''}`, ok: true });
      } else {
        results.push({ name: 'child', val: `CRM has no child #${cIdx + 1}`, ok: false });
      }
      break;
    }

    case 'child_0_info': {
      const anyC2 = document.querySelector('input[name*="childrenInformation2"]');
      const cIdx2 = parseInt(anyC2?.name.match(/childrenInformation\.(\d+)\./)?.[1] || '0', 10);
      const c = (d.children||[])[cIdx2];
      if (c) {
        const cp = `applicant.childrenDetails.childrenInformation.${cIdx2}.childrenInformation2`;
        await fillMasked(`${cp}.dateOfBirth`, fmtDate(c.dob || c.dateOfBirth || ''));
        await auto(`${cp}.countryOfBirth`, c.birthCountry || c.countryOfBirth || 'China');
        const loc = [c.locationCity, c.locationCountry].filter(Boolean).join(', ');
        if (loc) fill(`${cp}.presentLocation`, loc);
        results.push({ name: 'childIndex', val: `#${cIdx2 + 1} ${c.firstName || ''}`, ok: true });
      } else {
        results.push({ name: 'child', val: `CRM has no child #${cIdx2 + 1}`, ok: false });
      }
      break;
    }

    case 'mother':
      fill('applicant.mother.name.firstName', d.motherFirstName||'');
      fill('applicant.mother.name.lastName',  d.motherLastName||'');
      fill('applicant.mother.placeOfBirth',   d.motherBirthCity||'');
      await auto('applicant.mother.countryOfBirth', d.motherBirthCountry||'China');
      if (d.motherDeceased) setCheckbox('applicant.mother.noCurrentLocation', true);
      else fill('applicant.mother.currentLocation', [d.motherCurrentCity, d.motherCurrentCountry].filter(Boolean).join(', '));
      break;

    case 'father':
      fill('applicant.father.name.firstName', d.fatherFirstName||'');
      fill('applicant.father.name.lastName',  d.fatherLastName||'');
      fill('applicant.father.placeOfBirth',   d.fatherBirthCity||'');
      await auto('applicant.father.countryOfBirth', d.fatherBirthCountry||'China');
      if (d.fatherDeceased) setCheckbox('applicant.father.noCurrentLocation', true);
      else fill('applicant.father.currentLocation', [d.fatherCurrentCity, d.fatherCurrentCountry].filter(Boolean).join(', '));
      break;

    case 'siblings': {
      const anyF = document.querySelector('input[name*="applicant.siblings."]');
      const siIdx = parseInt(anyF?.name.match(/siblings\.(\d+)\./)?.[1] || '0');
      const sib = (d.siblings||[])[opts.siblingIndex ?? siIdx];
      if (sib) {
        const sp = `applicant.siblings.${siIdx}`;
        fill(`${sp}.name.firstName`, sib.firstName||'');
        fill(`${sp}.name.lastName`,  sib.lastName||'');
        fill(`${sp}.placeOfBirth`,   sib.birthCity||'');
        await auto(`${sp}.countryOfBirth`, sib.birthCountry||'China');
        const loc = [sib.locationCity, sib.locationCountry].filter(Boolean).join(', ');
        if (loc) fill(`${sp}.currentLocation`, loc);
        else setCheckbox(`${sp}.noCurrentLocation`, true);
        results.push({ name: 'sibling', val: `${sib.firstName} ${sib.lastName}`, ok: true });
      }
      break;
    }

    default:
      results.push({ name: 'page', val: page, ok: false });
  }
  return results;
}

// ── Message listener ──────────────────────────────────────────────────────────
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === 'PING') { sendResponse({ ok: true, page: detectPage() }); return false; }
  if (msg.type === 'DETECT_PAGE') { sendResponse({ page: detectPage() }); return false; }
  if (msg.type === 'FILL_PAGE') {
    fillPage(detectPage(), msg.data, msg.opts || {}).then(results => {
      sendResponse({ page: detectPage(), results });
    });
    return true;
  }
  return false;
});
