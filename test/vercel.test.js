'use strict';

// Tests for the Vercel entry point (api/index.js), using an in-memory database instead of MongoDB.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const { createHandler } = require('../api');
const vercelConfig = require('../vercel.json');

function fakeDb() {
  const docs = [{ _id: 'v1', name: 'Lamp', goal: 'Essentials' }];
  let settings = null;
  const collections = {
    items: {
      find: () => ({ sort: () => ({ toArray: async () => docs.slice() }) }),
      insertOne: async (item) => { docs.push({ ...item, _id: `v${docs.length + 1}` }); return { insertedId: `v${docs.length}` }; }
    },
    settings: {
      findOne: async () => settings,
      updateOne: async (filter, { $set }) => { settings = { ...(settings || filter), ...$set }; }
    }
  };
  return { collection: (name) => collections[name] };
}

async function serve(handler, run) {
  const server = http.createServer(handler).listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  try {
    await run(`http://127.0.0.1:${server.address().port}`);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

test('serves the API through the Vercel handler and connects only once', async () => {
  let connects = 0;
  const db = fakeDb();
  const handler = createHandler(async () => { connects++; return db; });
  await serve(handler, async (base) => {
    const items = await (await fetch(`${base}/api/items`)).json();
    assert.deepEqual(items.items.map((item) => item.name), ['Lamp']);
    const created = await fetch(`${base}/api/items`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name: 'Mug' }) });
    assert.equal(created.status, 201);
    const settings = await fetch(`${base}/api/settings`);
    assert.equal(settings.status, 200);
    assert.equal((await fetch(`${base}/api/missing`)).status, 404);
  });
  assert.equal(connects, 1, 'the database connection is reused between requests');
});

test('answers 503 when the database is unreachable and retries on the next request', async () => {
  let attempts = 0;
  const handler = createHandler(async () => {
    attempts++;
    if (attempts === 1) throw new Error('network blocked');
    return fakeDb();
  });
  const originalError = console.error;
  console.error = () => {};
  try {
    await serve(handler, async (base) => {
      const failed = await fetch(`${base}/api/items`);
      assert.equal(failed.status, 503);
      assert.deepEqual(await failed.json(), { error: 'Database unavailable' });
      const retried = await fetch(`${base}/api/items`);
      assert.equal(retried.status, 200);
    });
  } finally {
    console.error = originalError;
  }
  assert.equal(attempts, 2);
});

test('the default handler reports a missing MONGODB_URI as unavailable instead of crashing', async () => {
  const saved = process.env.MONGODB_URI;
  delete process.env.MONGODB_URI;
  const originalError = console.error;
  console.error = () => {};
  try {
    await serve(createHandler(), async (base) => {
      assert.equal((await fetch(`${base}/api/items`)).status, 503);
    });
  } finally {
    console.error = originalError;
    if (saved !== undefined) process.env.MONGODB_URI = saved;
  }
});

test('vercel.json serves public/ statically and sends /api requests to the function', () => {
  assert.equal(vercelConfig.outputDirectory, 'public');
  assert.deepEqual(vercelConfig.rewrites, [{ source: '/api/:path*', destination: '/api' }]);
});
