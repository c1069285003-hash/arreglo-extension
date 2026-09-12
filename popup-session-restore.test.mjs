import assert from 'node:assert/strict';
import fs from 'node:fs';

const popup = fs.readFileSync(new URL('./popup.js', import.meta.url), 'utf8');

assert.match(
  popup,
  /chrome\.storage\.local\.set\(\{\s*arreglo_data: merged,\s*arreglo_case: caseNum,/,
  'CBP save must use the canonical keys restored when the extension reopens',
);
assert.match(
  popup,
  /const restoredData = result\.arreglo_data \|\| result\.arreglo_client_data;/,
  'restore must migrate legacy CBP data',
);
assert.match(
  popup,
  /const restoredCase = result\.arreglo_case \|\| result\.arreglo_case_number;/,
  'restore must migrate the legacy CBP case number',
);

console.log('popup session restore guard passed');
