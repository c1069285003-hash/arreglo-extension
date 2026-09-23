import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

for (const file of ['../chrome-extension/popup.js', './popup.js']) {
  const popup = readFileSync(new URL(file, import.meta.url), 'utf8');
  assert.match(popup, /const needSex = !\(c\.sex \|\| c\.gender\);/,
    `${file}: saved child gender must suppress the missing-sex reminder`);
}

console.log('child gender reminder guard passed');
