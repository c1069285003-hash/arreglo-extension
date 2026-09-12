import assert from 'node:assert/strict';
import fs from 'node:fs';

const manifest = JSON.parse(fs.readFileSync(new URL('./manifest.json', import.meta.url), 'utf8'));
const popup = fs.readFileSync(new URL('./popup.js', import.meta.url), 'utf8');
const bridge = fs.readFileSync(new URL('./eoirContent.js', import.meta.url), 'utf8');

const eoirRegistration = manifest.content_scripts.find((entry) =>
  entry.matches?.includes('https://acis.eoir.justice.gov/*'));

assert.deepEqual(eoirRegistration?.js, ['eoirContent.js'],
  'EOIR pages must not load the USCIS/I-94 content script');
assert.match(popup, /fallbackScript = 'eoirContent\.js'/,
  'retry injection must use the isolated EOIR bridge');
assert.match(bridge, /msg\?\.type !== 'ARREGLO_CAPTURE_EOIR_RESULT'/,
  'EOIR bridge must ignore unrelated extension messages');
assert.doesNotMatch(bridge, /FILL_PAGE|EXTRACT_CBP|SET_USCIS/,
  'EOIR bridge must not contain USCIS or CBP automation');

console.log('EOIR content isolation guard passed');
