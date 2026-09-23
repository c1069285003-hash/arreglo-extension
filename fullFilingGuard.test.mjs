import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const content = fs.readFileSync(new URL('./content.js', import.meta.url), 'utf8');
const popup = fs.readFileSync(new URL('./popup.js', import.meta.url), 'utf8');
const html = fs.readFileSync(new URL('./popup.html', import.meta.url), 'utf8');

test('start-filling UI exists and Cloudflare file manifest stays metadata-only', () => {
  assert.match(html, /id="btn-start-full"/);
  assert.match(popup, /_arregloFiles/);
  assert.match(popup, /passport-meta/);
  assert.doesNotMatch(popup, /_arregloFiles[^\n]*base64/);
});

test('personal identification requires all three official files and uploads together', () => {
  assert.match(content, /evidence_personal/);
  assert.match(content, /\['passport', 'i94', 'travel'\]/);
  assert.match(content, /new DataTransfer\(\)/);
  assert.match(content, /Missing from Cloudflare/);
  assert.match(content, /passport:'Passport'/);
  assert.match(content, /i94:'I-94'/);
  assert.match(content, /travel:'Other Identification'/);
});

test('signed preparer page is pulled only on the preparer signature upload page', () => {
  assert.match(content, /preparer_signature_upload/);
  assert.match(content, /preparer\.\*\(\?:signature\|details\)/);
  assert.match(content, /Preparer Details file missing from CRM Documents\/Cloudflare/);
});

test('review is a terminal detection state', () => {
  assert.match(content, /return 'review'/);
  assert.match(popup, /stopped at Review/);
  assert.match(popup, /Stopped safely/);
  const start = popup.indexOf("document.getElementById('btn-start-full')");
  const end = popup.indexOf('// ── Change client', start);
  const fullRunHandler = popup.slice(start, end > start ? end : undefined);
  assert.match(fullRunHandler, /currentPage === 'review'[\s\S]{0,500}return;/);
  assert.doesNotMatch(fullRunHandler, /FINAL_SUBMIT|SUBMIT_APPLICATION/);
});

test('legal-assistance must verify the real Yes radio before advancing', () => {
  assert.match(content, /function radioChoiceText\(/);
  assert.match(content, /getAttribute\('aria-label'\)/);
  assert.match(content, /async function selectYesNo\(/);
  assert.match(content, /value=\\?"\$\{boolValue\}\\?"/);
  assert.match(content, /exact\.closest\('label'\)/);
  assert.match(content, /\[role=\\?"radio\\?"\]/);
  assert.match(content, /aria-checked/);
  assert.match(content, /await sleep\(150\)/);
  assert.match(content, /case 'legal_assistance':[\s\S]{0,300}await selectYesNo\([\s\S]{0,200}ok \}/);
});

test('blank optional fields do not stop the full run', () => {
  assert.match(content, /if \(PREPARER\.address2\) await fill/);
  assert.match(content, /if \(d\.middleName\) await fillName/);
  assert.match(content, /if \(d\.usAddressLine2\) await fillName/);
  assert.match(content, /if \(d\.spouseMiddleName\) await fillName/);
});

test('preparer plain-text address fields use the real typing commit path', () => {
  const start = content.indexOf("case 'preparer_info'");
  const end = content.indexOf("case 'your_name'", start);
  const handler = content.slice(start, end);
  assert.match(handler, /fillName\('preparer\.nonFamilyMemberAsPreparer\.address\.addressLineOne'/);
  assert.match(handler, /fillName\('preparer\.nonFamilyMemberAsPreparer\.address\.city'/);
  assert.doesNotMatch(handler, /await fill\('preparer\.nonFamilyMemberAsPreparer\.address\.(?:addressLineOne|city)'/);
});

test('full run waits for the USCIS form, not only the URL shell', () => {
  assert.match(content, /ready:formReady/);
  assert.match(content, /page === 'review' \|\| \(next &&/);
  assert.match(popup, /ping\?\.ready && ping\.page/);
  assert.match(popup, /if \(!pageChanged\)/);
});

test('USCIS navigation, not a local false-negative, decides whether the run stops', () => {
  assert.match(popup, /previousFailures = failed/);
  assert.match(popup, /filled; validating with USCIS/);
  assert.doesNotMatch(popup, /if \(failed\.length\) throw new Error/);
  assert.match(popup, /if \(!pageChanged\)/);
});

test('start filling resumes from the currently open USCIS page', () => {
  assert.doesNotMatch(popup, /getting-started\/legal-assistance`/);
  assert.doesNotMatch(popup, /chrome\.tabs\.update\(tab\.id, \{ url:firstUrl/);
});

test('fill all addresses reopens the editor after each verified save', () => {
  const start = content.indexOf("case 'residence_history_3'");
  const end = content.indexOf("case 'school'", start);
  const addressHandler = content.slice(start, end);
  assert.match(addressHandler, /if \(idx === null\) \{[\s\S]{0,250}openAddAddressEditor\(\)/);
  assert.doesNotMatch(addressHandler, /lastIdx/);
  assert.match(content, /if \(!document\.body\.contains\(saveBtn\)\) return \{ ok: true \}/);
  assert.match(addressHandler, /if \(!save\.ok\)[\s\S]{0,180}break;/);
  assert.match(content, /isUS \? toFullState\(addr\.province \|\| ''\)/);
});

test('address controls appear during Start Filling and address rows are selectable', () => {
  assert.match(popup, /data-address-index="\$\{i\}"/);
  assert.match(popup, /querySelectorAll\('\[data-address-index\]'\)/);
  assert.match(popup, /selectedAddressIndex = Number\(row\.dataset\.addressIndex\)/);
  const start = popup.indexOf("document.getElementById('btn-start-full')");
  const end = popup.indexOf('// ── Change client', start);
  const fullRun = popup.slice(start, end);
  assert.match(fullRun, /currentPage = ping\.page;[\s\S]{0,180}renderAddressSelector\(currentPage\)/);
  assert.match(fullRun, /currentPage === 'residence_history_3'\) opts\.fillAllAddresses = true/);
});
