import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

const source = fs.readFileSync(new URL('../cbp-content.js', import.meta.url), 'utf8');

function makeRuntime(html) {
  const listener = { current: null };
  const document = {
    documentElement: { appendChild() {} },
    body: { innerText: html },
    querySelectorAll(selector) {
      if (selector === 'table') return this.tables || [];
      if (selector === 'tr') return this.rows || [];
      if (selector === 'dt') return [];
      if (selector === 'label, strong, b, span, div, p') return [];
      return [];
    },
  };
  const context = {
    __ARREGLO_TEST_MODE__: true,
    chrome: { runtime: { sendMessage() {} } },
    document,
    window: { location: { pathname: '/search/recent-search/results' } },
    Date,
    console,
  };
  vm.createContext(context);
  vm.runInContext(source, context);
  return { api: context.__ARREGLO_CBP_TEST__, document };
}

function makeCell(text) {
  return { textContent: text };
}

function makeRow(cells) {
  return {
    querySelectorAll(selector) {
      return selector === 'th,td' ? cells.map(makeCell) : [];
    },
  };
}

function makeTable(rows) {
  return {
    querySelectorAll(selector) {
      return selector === 'tr' ? rows.map(makeRow) : [];
    },
  };
}

test('normalizes CBP date formats', () => {
  const { api } = makeRuntime('');
  assert.equal(api.normalizeDate('06/28/2026'), '2026-06-28');
  assert.equal(api.normalizeDate('2026-06-28'), '2026-06-28');
});

test('extracts I-94 fields from label/value table rows', () => {
  const { api, document } = makeRuntime('');
  document.rows = [
    makeRow(['I-94 Number', '217428063A4']),
    makeRow(['Most Recent Date of Entry', '06/10/2021']),
    makeRow(['Class of Admission', 'B2']),
    makeRow(['Admit Until Date', '12/09/2021']),
    makeRow(['Passport Number', 'E12345678']),
  ];

  assert.deepEqual(JSON.parse(JSON.stringify(api.extractI94Record(document))), {
    i94Number: '217428063A4',
    lastEntryDate: '2021-06-10',
    lastEntryStatus: 'B2',
    i94StatusExpiry: '2021-12-09',
    passportNumber: 'E12345678',
  });
});

test('extracts latest arrival from CBP travel history table', () => {
  const { api, document } = makeRuntime('');
  document.tables = [
    makeTable([
      ['Row', 'DATE', 'TYPE', 'LOCATION'],
      [],
      ['1', '2026-02-19', 'Arrival', 'LOS'],
      ['2', '2026-01-01', 'Departure', 'CAN'],
    ]),
  ];

  assert.deepEqual(JSON.parse(JSON.stringify(api.extractCbpRecord(document))), {
    travelHistory: [
      { date: '2026-02-19', type: 'Arrival', location: 'LOS' },
      { date: '2026-01-01', type: 'Departure', location: 'CAN' },
    ],
    lastEntryDate: '2026-02-19',
    entryPort: 'LOS',
    travelHistoryLastType: 'Arrival',
  });
});

test('extracts recent I-94 fields from CBP text layout', () => {
  const { api, document } = makeRuntime(`
    Admission I-94 Record Number: 948858855A4
    Arrival/Issued Date: 2026 February 19
    Class of Admission: B2
    Admit Until Date: 2026 August 18
    Last/Surname: TU
    First (Given) Name: YUAN
    Birth Date: 1982 December 28
    Document Number: ep1376463
    Country of Citizenship: China
  `);

  assert.deepEqual(JSON.parse(JSON.stringify(api.extractCbpRecord(document))), {
    i94Number: '948858855A4',
    lastEntryDate: '2026-02-19',
    lastEntryStatus: 'B2',
    i94StatusExpiry: '2026-08-18',
    familyName: 'TU',
    givenName: 'YUAN',
    dob: '1982-12-28',
    passportNumber: 'ep1376463',
    passportCountry: 'China',
    nationality: 'China',
  });
});
