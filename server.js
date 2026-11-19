'use strict';

const path = require('node:path');
const express = require('express');
const { MongoClient } = require('mongodb');

const MAX_IMAGE_BYTES = 2 * 1024 * 1024;
const FIELDS = ['name', 'price', 'currency', 'image', 'goal', 'urgency', 'lockDuration', 'feeling'];
const TEXT_LIMITS = { name: 200, currency: 10, goal: 100, urgency: 100, lockDuration: 100, feeling: 100 };
const FRONTEND_FILES = new Set([
  'index.html', 'app.js', 'journey.js', 'add-flow.js', 'onboarding.js',
  'journey.css', 'add-flow.css', 'onboarding.css', 'button-states.css', 'pinch-logo.svg'
]);

function validateItem(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return 'Request body must be an object';
  if (Object.keys(body).some(key => !FIELDS.includes(key))) return 'Unknown item field';
  if (typeof body.name !== 'string' || !body.name.trim()) return 'name must be a nonempty string';
  for (const [field, limit] of Object.entries(TEXT_LIMITS)) {
    if (body[field] !== undefined && (typeof body[field] !== 'string' || body[field].length > limit)) {
      return `${field} must be a string of at most ${limit} characters`;
    }
  }
  if (body.price !== undefined) {
    const price = body.price;
    if ((typeof price !== 'string' && typeof price !== 'number') ||
        (typeof price === 'string' && (price.length > 50 || (price !== '' && !/^(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i.test(price)))) ||
        (price !== '' && (!Number.isFinite(Number(price)) || Number(price) < 0))) {
      return 'price must be an empty string or a finite nonnegative number';
    }
  }
  if (body.image !== undefined && body.image !== null) {
    if (typeof body.image !== 'string') return 'image must be a supported base64 data URL or null';
    const match = /^data:image\/(jpeg|png|gif|webp);base64,([A-Za-z0-9+/]*={0,2})$/.exec(body.image);
    if (!match || !match[2] || match[2].length % 4 !== 0) return 'image must be a supported base64 data URL or null';
    const encoded = match[2];
    const padding = encoded.endsWith('==') ? 2 : encoded.endsWith('=') ? 1 : 0;
    const byteLength = encoded.length / 4 * 3 - padding;
    if (byteLength > MAX_IMAGE_BYTES) return 'image must not exceed 2 MiB';
    if (Buffer.from(encoded, 'base64').toString('base64') !== encoded) return 'image must contain valid base64';
  }
  return null;
}

function createApp(collection) {
  const app = express();
  app.disable('x-powered-by');
  app.use('/api', express.json({ limit: '3mb', strict: false }));

  app.get('/api/items', async (req, res, next) => {
    try {
      const items = await collection.find({}).sort({ _id: 1 }).toArray();
      res.json({ items: items.map(serializeItem) });
    } catch (err) { next(err); }
  });

  app.post('/api/items', async (req, res, next) => {
    const error = validateItem(req.body);
    if (error) return res.status(400).json({ error });
    const item = {
      name: req.body.name.trim(), price: req.body.price ?? '', currency: req.body.currency ?? 'CAD',
      image: req.body.image ?? null, goal: req.body.goal ?? '', urgency: req.body.urgency ?? '',
      lockDuration: req.body.lockDuration ?? '', feeling: req.body.feeling ?? ''
    };
    try {
      const result = await collection.insertOne(item);
      res.status(201).json({ item: serializeItem({ ...item, _id: result.insertedId }) });
    } catch (err) { next(err); }
  });

  app.use('/api', (req, res) => res.status(404).json({ error: 'Not found' }));
  app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));
  app.get('/:file', (req, res, next) => {
    if (!FRONTEND_FILES.has(req.params.file)) return next();
    res.sendFile(path.join(__dirname, req.params.file));
  });
  app.get(/^\/assets\/(add|journey|onboarding)\/([a-zA-Z0-9-]+\.svg)$/, (req, res) => {
    res.sendFile(path.join(__dirname, 'assets', req.params[0], req.params[1]));
  });
  app.use((req, res) => res.status(404).json({ error: 'Not found' }));
  app.use((err, req, res, next) => {
    if (err.type === 'entity.too.large') return res.status(413).json({ error: 'Request body too large' });
    if (err.type === 'entity.parse.failed') return res.status(400).json({ error: 'Invalid JSON' });
    if (err.status >= 400 && err.status < 500) return res.status(err.status).json({ error: 'Invalid request' });
    console.error('Request failed');
    res.status(500).json({ error: 'Internal server error' });
  });
  return app;
}

function serializeItem(item) {
  const result = { id: String(item._id) };
  for (const field of FIELDS) result[field] = item[field];
  return result;
}

async function start() {
  require('dotenv').config();
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI is required');
  const port = process.env.PORT || '3000';
  if (!/^\d+$/.test(port) || Number(port) < 1 || Number(port) > 65535) throw new Error('PORT must be between 1 and 65535');
  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db(process.env.MONGODB_DB_NAME || 'pinch');
    await db.command({ ping: 1 });
    const server = createApp(db.collection('items')).listen(Number(port));
    server.on('error', async () => {
      console.error('Failed to start server');
      await client.close();
      process.exitCode = 1;
    });
    server.on('listening', () => console.log(`Server listening on port ${port}`));
  } catch (err) {
    await client.close();
    throw err;
  }
}

if (require.main === module) {
  start().catch(() => {
    console.error('Server startup failed; check MongoDB connection and configuration');
    process.exitCode = 1;
  });
}

module.exports = { createApp, validateItem, start };
