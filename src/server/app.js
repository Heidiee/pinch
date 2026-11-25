'use strict';

const path = require('node:path');
const express = require('express');
const { itemsRouter } = require('./routes/items');
const { settingsRouter } = require('./routes/settings');

// Only this folder is served to the browser, so server code and config never are.
const PUBLIC_DIR = path.join(__dirname, '..', '..', 'public');

function createApp(itemsCollection, settingsCollection) {
  const app = express();
  app.disable('x-powered-by');

  app.use('/api', express.json({ limit: '3mb', strict: false }));
  app.use('/api/items', itemsRouter(itemsCollection));
  app.use('/api/settings', settingsRouter(settingsCollection));
  app.use('/api', (req, res) => res.status(404).json({ error: 'Not found' }));

  app.use(express.static(PUBLIC_DIR, { dotfiles: 'ignore', redirect: false }));
  app.use((req, res) => res.status(404).json({ error: 'Not found' }));

  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => {
    if (err.type === 'entity.too.large') return res.status(413).json({ error: 'Request body too large' });
    if (err.type === 'entity.parse.failed') return res.status(400).json({ error: 'Invalid JSON' });
    if (err.status >= 400 && err.status < 500) return res.status(err.status).json({ error: 'Invalid request' });
    console.error('Request failed');
    res.status(500).json({ error: 'Internal server error' });
  });
  return app;
}

module.exports = { createApp, PUBLIC_DIR };
