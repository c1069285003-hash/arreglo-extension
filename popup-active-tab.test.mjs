import assert from 'node:assert/strict';
import fs from 'node:fs';

const popup = fs.readFileSync(new URL('./popup.js', import.meta.url), 'utf8');
const start = popup.indexOf('async function getActiveTab()');
const end = popup.indexOf('\n}\n', start) + 2;
const block = popup.slice(start, end);

assert.ok(start >= 0, 'getActiveTab must exist');
assert.match(block, /chrome\.tabs\.query\(\{ active: true, currentWindow: true \}\)/,
  'the current tab must be checked first');
assert.match(block, /SUPPORTED_HOSTS\.test\(new URL\(tab\.url\)\.hostname\)/,
  'an active CBP or USCIS tab must be accepted');
assert.ok(block.indexOf('active: true') < block.indexOf('getUscisTab()'),
  'USCIS fallback must not steal capture from the active I-94 tab');

console.log('popup active-tab routing guards passed');
