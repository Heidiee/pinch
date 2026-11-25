'use strict';

const express = require('express');
const { ObjectId } = require('mongodb');
const { ITEM_FIELDS, validateItem, validateItemPatch } = require('../validation');

// Item ids are MongoDB ObjectIds; accept their hex form and fall back to the raw string.
const itemId = id => (/^[a-f0-9]{24}$/i.test(id) ? new ObjectId(id) : id);

function serializeItem(item) {
  const result = { id: String(item._id) };
  for (const field of ITEM_FIELDS) result[field] = item[field];
  const createdAt = item.createdAt instanceof Date ? item.createdAt : item._id?.getTimestamp?.();
  if (createdAt instanceof Date && Number.isFinite(createdAt.getTime())) result.createdAt = createdAt.toISOString();
  return result;
}

function itemsRouter(collection) {
  const router = express.Router();

  router.get('/', async (req, res, next) => {
    try {
      const items = await collection.find({}).sort({ _id: 1 }).toArray();
      res.json({ items: items.map(serializeItem) });
    } catch (err) { next(err); }
  });

  router.post('/', async (req, res, next) => {
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

  router.patch('/:id', async (req, res, next) => {
    const error = validateItemPatch(req.body);
    if (error) return res.status(400).json({ error });
    const update = { ...req.body };
    if (typeof update.name === 'string') update.name = update.name.trim();
    try {
      const item = await collection.findOneAndUpdate({ _id: itemId(req.params.id) }, { $set: update }, { returnDocument: 'after' });
      if (!item) return res.status(404).json({ error: 'Item not found' });
      res.json({ item: serializeItem(item) });
    } catch (err) { next(err); }
  });

  router.delete('/:id', async (req, res, next) => {
    try {
      const result = await collection.deleteOne({ _id: itemId(req.params.id) });
      if (!result.deletedCount) return res.status(404).json({ error: 'Item not found' });
      res.status(204).end();
    } catch (err) { next(err); }
  });

  return router;
}

module.exports = { itemsRouter, serializeItem };
