'use strict';

const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { ObjectId } = require('mongodb');
const { createApp, DEFAULT_SETTINGS } = require('../server');

let server;
let base;
let documents;
let failDatabase = false;
const collection = {
  find() {
    if (failDatabase) throw new Error('database unavailable');
    return { sort: () => ({ toArray: async () => documents.slice() }) };
  },
  async insertOne(item) {
    if (failDatabase) throw new Error('database unavailable');
    const insertedId = String(documents.length + 1);
    documents.push({ ...item, _id: insertedId });
    return { insertedId };
  }
};

let settingsDoc = null;
const settingsCollection = {
  async findOne() {
    if (failDatabase) throw new Error('database unavailable');
    return settingsDoc && structuredClone(settingsDoc);
  },
  async updateOne(filter, { $set }) {
    if (failDatabase) throw new Error('database unavailable');
    settingsDoc = { ...(settingsDoc || { _id: filter._id }), ...structuredClone($set) };
    return { acknowledged: true };
  }
};

before(async () => {
  documents = [];
  server = createApp(collection, settingsCollection).listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  base = `http://127.0.0.1:${server.address().port}`;
});
after(async () => { await new Promise((resolve, reject) => server.close(err => err ? reject(err) : resolve())); });

async function post(body) {
  return fetch(`${base}/api/items`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
}

test('creates and retrieves UI-shaped items with consistent response schemas', async () => {
  const input = { name: ' Notebook ', price: '12.50', currency: 'CAD', image: null, goal: 'Education', urgency: 'I can wait...', lockDuration: '1 Week', feeling: 'Happy' };
  const response = await post(input);
  assert.equal(response.status, 201);
  const { item } = await response.json();
  assert.deepEqual(item, { ...input, name: 'Notebook', id: '1' });
  const list = await fetch(`${base}/api/items`);
  assert.equal(list.status, 200);
  assert.deepEqual(await list.json(), { items: [item] });
  const minimal = await post({ name: 'Pen', price: 0 });
  assert.deepEqual(await minimal.json(), { item: { id: '2', name: 'Pen', price: 0, currency: 'CAD', image: null, goal: '', urgency: '', lockDuration: '', feeling: '' } });
});

test('exposes MongoDB creation timestamps for calendar scheduling', async () => {
  const createdAt = new Date('2026-10-18T00:00:00.000Z');
  documents = [{ _id: ObjectId.createFromTime(createdAt.getTime() / 1000), name: 'Calendar item', lockDuration: '1 Week' }];
  const response = await fetch(`${base}/api/items`);
  assert.equal(response.status, 200);
  const { items } = await response.json();
  assert.equal(items[0].createdAt, createdAt.toISOString());
  documents = [];
});

test('rejects invalid fields without inserting anything', async () => {
  const invalid = [null, [], {}, { name: '  ' }, { name: 123 }, { name: 'x'.repeat(201) },
    { name: 'a', price: -1 }, { name: 'a', price: ' ' }, { name: 'a', price: 'Infinity' },
    { name: 'a', image: 42 }, { name: 'a', goal: null }, { name: 'a', extra: true }];
  const count = documents.length;
  for (const value of invalid) {
    const response = await post(value);
    assert.equal(response.status, 400, JSON.stringify(value));
    assert.equal(typeof (await response.json()).error, 'string');
  }
  assert.equal(documents.length, count);
});

test('accepts supported image MIME types and the exact 2 MiB boundary', async () => {
  for (const type of ['jpeg', 'png', 'gif', 'webp']) {
    const response = await post({ name: type, image: `data:image/${type};base64,YQ==` });
    assert.equal(response.status, 201, type);
  }
  const data = Buffer.alloc(2 * 1024 * 1024, 1).toString('base64');
  const response = await post({ name: 'large', image: `data:image/png;base64,${data}` });
  assert.equal(response.status, 201);
  assert.equal((await response.json()).item.image, `data:image/png;base64,${data}`);
});

test('rejects oversized, unsupported, and malformed image data', async () => {
  const huge = Buffer.alloc(2 * 1024 * 1024 + 1, 1).toString('base64');
  for (const image of [`data:image/png;base64,${huge}`, 'data:image/svg+xml;base64,YQ==', 'data:image/jpg;base64,YQ==', 'data:image/png;base64,YQ=', 'data:image/png;base64,YR==', 'data:image/png;base64,', 'https://example.com/a.png']) {
    const response = await post({ name: 'x', image });
    assert.equal(response.status, 400);
    assert.equal(typeof (await response.json()).error, 'string');
  }
});

test('returns JSON errors for malformed or oversized requests and database failures', async () => {
  let response = await fetch(`${base}/api/items`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{' });
  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), { error: 'Invalid JSON' });
  response = await post({ name: 'x'.repeat(3 * 1024 * 1024) });
  assert.equal(response.status, 413);
  assert.deepEqual(await response.json(), { error: 'Request body too large' });
  failDatabase = true;
  try {
    for (const response of [await fetch(`${base}/api/items`), await post({ name: 'x' })]) {
      assert.equal(response.status, 500);
      assert.deepEqual(await response.json(), { error: 'Internal server error' });
    }
  } finally { failDatabase = false; }
});

test('serves only explicit frontend assets, not backend or hidden files', async () => {
  for (const pathname of ['/', '/index.html', '/app.js', '/onboarding.js', '/journey.css', '/calendar.css', '/assets/add/logo.svg', '/assets/journey/page1.svg', '/assets/journey/month-lock.svg', '/assets/journey/month-lock-open.svg']) {
    const response = await fetch(`${base}${pathname}`);
    assert.equal(response.status, 200, pathname);
  }
  for (const pathname of ['/.env', '/.env.example', '/package.json', '/server.js', '/node_modules/express/package.json', '/assets/../server.js', '/api/missing']) {
    const response = await fetch(`${base}${pathname}`);
    assert.equal(response.status, 404, pathname);
    assert.deepEqual(await response.json(), { error: 'Not found' });
  }
});

async function putSettings(body) {
  return fetch(`${base}/api/settings`, { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
}

test('returns default settings before anything is saved', async () => {
  settingsDoc = null;
  const response = await fetch(`${base}/api/settings`);
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { settings: DEFAULT_SETTINGS });
});

test('saves partial settings updates and keeps other values', async () => {
  settingsDoc = null;
  let response = await putSettings({ currency: 'USD', taxRate: 5, showTaxInCost: false });
  assert.equal(response.status, 200);
  response = await putSettings({ defaultLockDuration: '2 Weeks', categories: [{ name: ' Pets ', color: 'coral' }] });
  const { settings } = await response.json();
  assert.deepEqual(settings, { ...DEFAULT_SETTINGS, currency: 'USD', taxRate: 5, showTaxInCost: false, defaultLockDuration: '2 Weeks', categories: [{ name: 'Pets', color: 'coral' }] });
  assert.deepEqual(await (await fetch(`${base}/api/settings`)).json(), { settings });
  settingsDoc = null;
});

test('rejects invalid settings without saving', async () => {
  settingsDoc = null;
  const invalid = [null, [], { theme: 'dark' }, { currency: 'JPY' }, { taxRate: -1 }, { taxRate: 31 }, { taxRate: '13' },
    { showTaxInCost: 'yes' }, { defaultLockDuration: '3 Days' }, { categories: 'Pets' },
    { categories: [{ name: '', color: 'blue' }] }, { categories: [{ name: 'All', color: 'blue' }] },
    { categories: [{ name: 'Pets', color: 'red' }] }, { categories: [{ name: 'Pets', color: 'blue', extra: 1 }] },
    { categories: [{ name: 'Pets', color: 'blue' }, { name: 'pets', color: 'green' }] },
    { categories: Array.from({ length: 13 }, (_, i) => ({ name: `C${i}`, color: 'blue' })) }];
  for (const value of invalid) {
    const response = await putSettings(value);
    assert.equal(response.status, 400, JSON.stringify(value));
    assert.equal(typeof (await response.json()).error, 'string');
  }
  assert.equal(settingsDoc, null);
});

test('serves the settings screen files', async () => {
  for (const pathname of ['/settings.js', '/settings.css']) {
    assert.equal((await fetch(`${base}${pathname}`)).status, 200, pathname);
  }
});
