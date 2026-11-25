'use strict';

const express = require('express');
const { DEFAULT_SETTINGS, validateSettings } = require('../validation');

// All settings live in one shared document.
const SETTINGS_ID = 'app';

function serializeSettings(doc) {
  const result = {};
  for (const [key, value] of Object.entries(DEFAULT_SETTINGS)) result[key] = doc && doc[key] !== undefined ? doc[key] : value;
  return result;
}

function settingsRouter(collection) {
  const router = express.Router();

  router.get('/', async (req, res, next) => {
    try {
      res.json({ settings: serializeSettings(collection && await collection.findOne({ _id: SETTINGS_ID })) });
    } catch (err) { next(err); }
  });

  router.put('/', async (req, res, next) => {
    const error = validateSettings(req.body);
    if (error) return res.status(400).json({ error });
    if (!collection) return next(new Error('settings storage unavailable'));
    const update = { ...req.body };
    if (update.categories) update.categories = update.categories.map(({ name, color }) => ({ name: name.trim(), color }));
    try {
      await collection.updateOne({ _id: SETTINGS_ID }, { $set: update }, { upsert: true });
      res.json({ settings: serializeSettings(await collection.findOne({ _id: SETTINGS_ID })) });
    } catch (err) { next(err); }
  });

  return router;
}

module.exports = { settingsRouter, serializeSettings };
