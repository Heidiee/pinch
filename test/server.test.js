'use strict';

const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { createApp } = require('../server');

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

before(async () => {
  documents = [];
  server = createApp(collection).listen(0, '127.0.0.1');
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
  for (const pathname of ['/', '/index.html', '/app.js', '/onboarding.js', '/journey.css', '/assets/add/logo.svg', '/assets/journey/page1.svg']) {
    const response = await fetch(`${base}${pathname}`);
    assert.equal(response.status, 200, pathname);
  }
  for (const pathname of ['/.env', '/.env.example', '/package.json', '/server.js', '/node_modules/express/package.json', '/assets/../server.js', '/api/missing']) {
    const response = await fetch(`${base}${pathname}`);
    assert.equal(response.status, 404, pathname);
    assert.deepEqual(await response.json(), { error: 'Not found' });
  }
});
