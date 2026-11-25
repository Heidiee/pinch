'use strict';

// Vercel entry point. Vercel runs this file as a serverless function for every /api/... request
// (see vercel.json); everything in public/ is served as static files and never reaches it.
//
// Vercel can start a fresh copy of this function at any time, and keeps it warm between requests
// for a while. So the MongoDB connection and the Express app are created once per copy and reused,
// instead of opening a new database connection on every request.
const { MongoClient } = require('mongodb');
const { createApp } = require('../src/server/app');

async function connectToMongo() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI is required');
  // A small pool: each warm copy of the function needs only a few connections.
  const client = new MongoClient(uri, { maxPoolSize: 10 });
  try {
    await client.connect();
    const db = client.db(process.env.MONGODB_DB_NAME || 'pinch');
    await db.command({ ping: 1 });
    return db;
  } catch (err) {
    await client.close().catch(() => {});
    throw err;
  }
}

// `connect` is swappable so tests can use an in-memory database.
function createHandler(connect = connectToMongo) {
  let appPromise = null;

  function getApp() {
    if (!appPromise) {
      appPromise = connect()
        .then((db) => createApp(db.collection('items'), db.collection('settings')))
        .catch((err) => {
          appPromise = null; // try again on the next request instead of staying broken
          throw err;
        });
    }
    return appPromise;
  }

  return async function handler(req, res) {
    let app;
    try {
      app = await getApp();
    } catch {
      console.error('Database connection failed; check MONGODB_URI and Atlas network access');
      res.statusCode = 503;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: 'Database unavailable' }));
      return;
    }
    return app(req, res);
  };
}

module.exports = createHandler();
module.exports.createHandler = createHandler;
