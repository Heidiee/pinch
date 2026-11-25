'use strict';

// Request validation for items and settings. Each validator returns an error message or null.

const MAX_IMAGE_BYTES = 2 * 1024 * 1024;
const ITEM_FIELDS = ['name', 'price', 'currency', 'image', 'goal', 'urgency', 'lockDuration', 'feeling', 'store', 'notes', 'boughtAt', 'goals'];
const TEXT_LIMITS = { name: 200, currency: 10, goal: 100, urgency: 100, lockDuration: 100, feeling: 100, store: 200 };
const MAX_NOTES = 100;
const MAX_NOTE_LENGTH = 500;
const CURRENCIES = ['CAD', 'USD', 'EUR', 'GBP', 'AUD'];
const LOCK_DURATIONS = ['', '1 Day', '1 Week', '2 Weeks', '1 Month'];
const CATEGORY_COLORS = ['purple', 'green', 'blue', 'coral', 'orange', 'grey'];
const DEFAULT_SETTINGS = Object.freeze({
  currency: 'CAD',
  defaultLockDuration: '',
  taxRate: 13,
  showTaxInCost: true,
  categories: [
    { name: 'Essentials', color: 'purple' },
    { name: 'Education', color: 'green' },
    { name: 'Fashion', color: 'blue' },
    { name: 'Travel', color: 'purple' }
  ]
});

const isPlainObject = value => Boolean(value) && typeof value === 'object' && !Array.isArray(value);

function validateItem(body) {
  if (!isPlainObject(body)) return 'Request body must be an object';
  if (Object.keys(body).some(key => !ITEM_FIELDS.includes(key))) return 'Unknown item field';
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
  if (body.goals !== undefined) {
    if (!Array.isArray(body.goals) || body.goals.length > 12) return 'goals must be an array of at most 12 categories';
    const seen = new Set();
    for (const goal of body.goals) {
      if (typeof goal !== 'string' || !goal.trim() || goal.length > 100) return 'each goal must be 1 to 100 characters';
      if (seen.has(goal.trim().toLowerCase())) return 'goals must be unique';
      seen.add(goal.trim().toLowerCase());
    }
  }
  if (body.boughtAt !== undefined && body.boughtAt !== null &&
      (typeof body.boughtAt !== 'string' || !/^\d{4}-\d{2}-\d{2}T/.test(body.boughtAt) || !Number.isFinite(Date.parse(body.boughtAt)))) {
    return 'boughtAt must be an ISO date or null';
  }
  if (body.notes !== undefined) {
    if (!Array.isArray(body.notes) || body.notes.length > MAX_NOTES) return `notes must be an array of at most ${MAX_NOTES} entries`;
    for (const note of body.notes) {
      if (!isPlainObject(note) || Object.keys(note).some(key => key !== 'text' && key !== 'createdAt')) return 'each note must have only text and createdAt';
      if (typeof note.text !== 'string' || !note.text.trim() || note.text.length > MAX_NOTE_LENGTH) return `note text must be 1 to ${MAX_NOTE_LENGTH} characters`;
      if (typeof note.createdAt !== 'string' || !/^\d{4}-\d{2}-\d{2}T/.test(note.createdAt) || !Number.isFinite(Date.parse(note.createdAt))) return 'note createdAt must be an ISO date';
    }
  }
  return null;
}

// Same rules as a new item, but every field is optional.
function validateItemPatch(body) {
  if (!isPlainObject(body)) return 'Request body must be an object';
  if (!Object.keys(body).length) return 'Nothing to update';
  if (body.name === undefined) return validateItem({ ...body, name: 'placeholder' });
  return validateItem(body);
}

// Validates a partial settings update.
function validateSettings(body) {
  if (!isPlainObject(body)) return 'Request body must be an object';
  if (Object.keys(body).some(key => !(key in DEFAULT_SETTINGS))) return 'Unknown settings field';
  if (body.currency !== undefined && !CURRENCIES.includes(body.currency)) return `currency must be one of ${CURRENCIES.join(', ')}`;
  if (body.defaultLockDuration !== undefined && !LOCK_DURATIONS.includes(body.defaultLockDuration)) return 'defaultLockDuration is not a supported duration';
  if (body.taxRate !== undefined && (typeof body.taxRate !== 'number' || !Number.isFinite(body.taxRate) || body.taxRate < 0 || body.taxRate > 30)) return 'taxRate must be a number from 0 to 30';
  if (body.showTaxInCost !== undefined && typeof body.showTaxInCost !== 'boolean') return 'showTaxInCost must be a boolean';
  if (body.categories !== undefined) {
    const { categories } = body;
    if (!Array.isArray(categories) || categories.length > 12) return 'categories must be an array of at most 12 entries';
    const names = new Set();
    for (const category of categories) {
      if (!isPlainObject(category) || Object.keys(category).some(key => key !== 'name' && key !== 'color')) return 'each category must have only name and color';
      if (typeof category.name !== 'string' || !category.name.trim() || category.name.trim().length > 30) return 'category name must be 1 to 30 characters';
      const key = category.name.trim().toLowerCase();
      if (key === 'all') return 'category name "All" is reserved';
      if (!CATEGORY_COLORS.includes(category.color)) return `category color must be one of ${CATEGORY_COLORS.join(', ')}`;
      if (names.has(key)) return 'category names must be unique';
      names.add(key);
    }
  }
  return null;
}

module.exports = { ITEM_FIELDS, DEFAULT_SETTINGS, validateItem, validateItemPatch, validateSettings };
