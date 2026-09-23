import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

const source = fs.readFileSync(new URL('../content.js', import.meta.url), 'utf8');

class FakeInput {
  constructor({ name = '', type = 'text', value = '', label = '' } = {}) {
    this.name = name;
    this.type = type;
    this._value = value;
    this.events = [];
    this.checked = false;
    this.labelText = label;
    this.tagName = type === 'textarea' ? 'TEXTAREA' : 'INPUT';
    this.id = name;
  }
  get value() { return this._value; }
  set value(next) { this._value = String(next); }
  click() {
    if (this.type === 'checkbox') this.checked = !this.checked;
    if (this.type === 'radio') this.checked = true;
  }
  dispatchEvent(event) { this.events.push(event.type); }
  focus() {}
  closest(selector) {
    if (selector === 'label' && this.labelText) return { textContent: this.labelText };
    return null;
  }
}

class FakeTextArea extends FakeInput {}

function makeRuntime(elements = [], url = 'https://my.uscis.gov/account/case-service/my-case') {
  const byName = new Map(elements.map(el => [el.name, el]));
  const document = {
    body: { click() {}, innerText: '' },
    location: { href: url },
    querySelector(selector) {
      const nameMatch = selector.match(/^\[name="(.+)"\]$/);
      if (nameMatch) return byName.get(nameMatch[1]) || null;
      const typed = selector.match(/^input\[type="(radio|checkbox)"\]\[name="(.+)"\]$/);
      if (typed) return elements.find(el => el.type === typed[1] && el.name === typed[2]) || null;
      return null;
    },
    querySelectorAll(selector) {
      if (selector === 'input, select, textarea') return elements;
      const radios = selector.match(/^input\[type="radio"\]\[name="(.+)"\]$/);
      if (radios) return elements.filter(el => el.type === 'radio' && el.name === radios[1]);
      if (selector === 'label, [role="radio"]' || selector === 'button') return [];
      return [];
    },
  };
  const listener = { current: null };
  const context = {
    __ARREGLO_TEST_MODE__: true,
    chrome: {
      runtime: {
        onMessage: {
          addListener(fn) { listener.current = fn; },
        },
      },
    },
    document,
    Event: class { constructor(type) { this.type = type; } },
    KeyboardEvent: class {},
    HTMLInputElement: FakeInput,
    HTMLTextAreaElement: FakeTextArea,
    setTimeout(fn, ms, ...args) { return setTimeout(fn, Math.min(ms || 0, 1), ...args); },
    setInterval() { return 1; },
    clearTimeout,
    console,
  };
  context.window = context;
  context.window.location = { href: url };
  vm.createContext(context);
  vm.runInContext(source, context);
  return { api: context.__ARREGLO_TEST__, elements, listener };
}

test('normalizes dates, phones, states, and address date parts', () => {
  const { api } = makeRuntime();
  assert.equal(api.fmtDate('1994-03-02'), '03/02/1994');
  assert.equal(api.cleanPhone('+1 (626) 613-7634'), '6266137634');
  assert.equal(api.toFullState('ca'), 'CALIFORNIA');
  assert.deepEqual({ ...api.parseYM('2020/7') }, { year: '2020', month: '07' });
  assert.equal(api.addrFromDate({ fromYear: '2019', fromMonth: '4' }), '2019/04');
});

test('detects key USCIS pages from their field names', () => {
  const cases = [
    ['applicant.yourName.name.firstName', 'your_name'],
    ['applicant.background.physicalAddress.usAddress.city', 'contact'],
    ['applicant.whenAndWhereYouWereBorn.dateOfBirth', 'birth'],
    ['applicant.residenceHistory.residenceHistory1.lastAddressOutsideUs.city', 'residence_history_1'],
    ['applicant.residenceHistory.residenceHistory3.0.address.city', 'residence_history_3'],
    ['applicant.schoolHistory.0.name', 'school'],
    ['applicant.immigrationInformation.immigrationInformation1.i94Number', 'immigration_info_1'],
    ['applicant.mother.name.firstName', 'mother'],
    ['applicant.siblings.0.name.firstName', 'siblings'],
  ];
  for (const [name, expected] of cases) {
    const { api } = makeRuntime([new FakeInput({ name })]);
    assert.equal(api.detectPage(), expected, name);
  }
});

test('fills the selected school instead of always using the first school', async () => {
  const name = new FakeInput({ name: 'applicant.schoolHistory.0.name' });
  const type = new FakeInput({ name: 'applicant.schoolHistory.0.type' });
  const city = new FakeInput({ name: 'applicant.schoolHistory.0.address.city' });
  const zip = new FakeInput({ name: 'applicant.schoolHistory.0.address.zipCode' });
  const country = new FakeInput({ name: 'applicant.schoolHistory.0.address.country' });
  const fromMonth = new FakeInput({ name: 'applicant.schoolHistory.0.dates.fromDate.month' });
  const fromYear = new FakeInput({ name: 'applicant.schoolHistory.0.dates.fromDate.year' });
  const toMonth = new FakeInput({ name: 'applicant.schoolHistory.0.dates.toDate.month' });
  const toYear = new FakeInput({ name: 'applicant.schoolHistory.0.dates.toDate.year' });
  const { api } = makeRuntime([name, type, city, zip, country, fromMonth, fromYear, toMonth, toYear]);
  await api.fillPage('school', {
    eduList: [
      { level: 'Elementary School', school: 'First School', city: 'Beijing', country: 'China', zipcode: '100000', startYear: '1990', endYear: '1996' },
      { level: 'Bachelor’s Degree', school: 'Second University', city: 'Shanghai', country: 'China', zipcode: '200000', startYear: '2000', endYear: '2004' },
    ],
  }, {
    schoolIndex: 1,
    selectedSchool: { level: 'Bachelor’s Degree', school: 'Second University', city: 'Shanghai', country: 'China', zipcode: '200000', startYear: '2000', endYear: '2004' },
  });
  assert.equal(name.value, 'Second University');
  assert.equal(type.value, 'Bachelor’s Degree');
  assert.equal(city.value, 'Shanghai');
  assert.equal(zip.value, '200000');
});

test('fills the name page and reports actual radio success', async () => {
  const first = new FakeInput({ name: 'applicant.yourName.name.firstName' });
  const middle = new FakeInput({ name: 'applicant.yourName.name.middleName' });
  const last = new FakeInput({ name: 'applicant.yourName.name.lastName' });
  const noAlias = new FakeInput({
    name: 'formikFactoryUIMeta.applicant.yourName.additionalNames.hasAdditionalNames',
    type: 'radio',
    label: 'No',
  });
  const { api } = makeRuntime([first, middle, last, noAlias]);
  const results = await api.fillPage('your_name', {
    givenName: 'Mei',
    middleName: '',
    familyName: 'Chen',
    aliasNone: true,
  });
  assert.equal(first.value, 'Mei');
  assert.equal(last.value, 'Chen');
  assert.equal(noAlias.checked, true);
  assert.equal(results.find(r => r.name === 'additionalNames')?.ok, true);
});

test('selects Yes and fills Other Names Used from the info sheet', async () => {
  const first = new FakeInput({ name: 'applicant.yourName.name.firstName' });
  const middle = new FakeInput({ name: 'applicant.yourName.name.middleName' });
  const last = new FakeInput({ name: 'applicant.yourName.name.lastName' });
  const yesAlias = new FakeInput({
    name: 'formikFactoryUIMeta.applicant.yourName.additionalNames.hasAdditionalNames',
    type: 'radio',
    label: 'Yes',
  });
  const aliasFirst = new FakeInput({
    name: 'applicant.yourName.additionalNames.0.name.firstName',
  });
  const aliasMiddle = new FakeInput({
    name: 'applicant.yourName.additionalNames.0.name.middleName',
  });
  const aliasLast = new FakeInput({
    name: 'applicant.yourName.additionalNames.0.name.lastName',
  });
  const { api } = makeRuntime([
    first, middle, last, yesAlias, aliasFirst, aliasMiddle, aliasLast,
  ]);

  const results = await api.fillPage('your_name', {
    givenName: 'Hailun',
    familyName: 'Chang',
    aliasFirstName: 'Xiaohong',
    aliasLastName: 'Chang',
    aliasNone: true,
  });

  assert.equal(yesAlias.checked, true);
  assert.equal(aliasFirst.value, 'Xiaohong');
  assert.equal(aliasMiddle.value, '');
  assert.equal(aliasLast.value, 'Chang');
  assert.equal(results.find(r => r.name === 'additionalNames')?.val, 'Yes');
});

test('reports a missing radio as skipped instead of a false success', async () => {
  const { api } = makeRuntime();
  const results = await api.fillPage('legal_assistance', {});
  assert.deepEqual(
    { ...results[0] },
    { name: 'legalAssistance', val: 'Yes', ok: false },
  );
});

test('maps CRM B-2 values to the exact USCIS admission option', () => {
  const { api } = makeRuntime();
  assert.equal(api.normalizeEntryStatusOption('B-2 Tourist'), 'B2 - VISITOR FOR PLEASURE');
  assert.equal(api.normalizeEntryStatusOption('B2'), 'B2 - VISITOR FOR PLEASURE');
});

test('fills the dynamic passport fields after selecting Yes', async () => {
  const hasPassport = new FakeInput({
    name: 'formikFactoryUIMeta.applicant.immigrationInformation.immigrationInformation1.hasPassportOrTravelDocument',
    type: 'radio',
    label: 'Yes',
  });
  const passportCountry = new FakeInput({
    name: 'applicant.immigrationInformation.immigrationInformation1.passportOrTravelDocument.countryOfIssuance',
  });
  const passportNumber = new FakeInput({
    name: 'applicant.immigrationInformation.immigrationInformation1.passportOrTravelDocument.passportNumber',
  });
  const passportExpiry = new FakeInput({
    name: 'applicant.immigrationInformation.immigrationInformation1.passportOrTravelDocument.expirationDate',
  });
  const status = new FakeInput({
    name: 'applicant.immigrationInformation.immigrationInformation1.mostRecentEntry.status',
  });
  const { api } = makeRuntime([hasPassport, passportCountry, passportNumber, passportExpiry, status]);

  await api.fillPage('immigration_info_1', {
    passportCountry: 'China',
    passportNumber: 'EC4724955',
    passportExpiry: '2030-06-07',
    lastEntryStatus: 'B-2 Tourist',
  });

  assert.equal(hasPassport.checked, true);
  assert.equal(passportCountry.value, 'China');
  assert.equal(passportNumber.value, 'EC4724955');
  assert.equal(passportExpiry.value, '06/07/2030');
  assert.equal(status.value, 'B2 - VISITOR FOR PLEASURE');
});

test('fills the child represented by the current USCIS child index', async () => {
  const first = new FakeInput({
    name: 'applicant.childrenDetails.childrenInformation.1.childrenInformation1.name.firstName',
  });
  const last = new FakeInput({
    name: 'applicant.childrenDetails.childrenInformation.1.childrenInformation1.name.lastName',
  });
  const { api } = makeRuntime([first, last]);

  await api.fillPage('child_name', {
    children: [
      { firstName: 'Meng', lastName: 'Yu' },
      { firstName: 'Xiangyue', lastName: 'Yu' },
    ],
  });

  assert.equal(first.value, 'Xiangyue');
  assert.equal(last.value, 'Yu');
});

test('uses numChildren when the normalized child array is temporarily unavailable', async () => {
  const count = new FakeInput({ name: 'applicant.childrenDetails.numberOfChildren' });
  const { api } = makeRuntime([count]);
  await api.fillPage('children_count', { numChildren: '2' });
  assert.equal(count.value, '2');
});

test('fills USCIS contact ZIP through the masked-input commit path', async () => {
  const zip = new FakeInput({ name: 'applicant.background.physicalAddress.usAddress.zipCode' });
  const { api } = makeRuntime([zip]);
  await api.fillPage('contact', { usZip: '91731' });
  assert.equal(zip.value, '91731');
  assert.ok(zip.events.includes('input'));
  assert.ok(zip.events.includes('change'));
  assert.ok(zip.events.includes('focusout'));
  assert.ok(zip.events.includes('blur'));
});
