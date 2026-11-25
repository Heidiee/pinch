'use strict';

// Entry point: connects to MongoDB, then serves the API and the frontend.
const { MongoClient } = require('mongodb');
const { createApp } = require('./app');

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
    const server = createApp(db.collection('items'), db.collection('settings')).listen(Number(port));
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

module.exports = { start };
