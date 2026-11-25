(() => {
  const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const MOODS = { excited: 'excited', happy: 'happy', neutral: 'neutral', sad: 'sad', upset: 'upset' };
  const LOCKS = ['1 Day', '1 Week', '2 Weeks', '1 Month'];
  const CURRENCIES = ['CAD', 'USD', 'EUR', 'GBP', 'AUD'];
  const SYMBOLS = { CAD: '$', USD: '$', AUD: '$', EUR: '€', GBP: '£' };

  // Material Symbols paths (viewBox 0 -960 960 960).
  const PATHS = {
    more: 'M480-160q-33 0-56.5-23.5T400-240q0-33 23.5-56.5T480-320q33 0 56.5 23.5T560-240q0 33-23.5 56.5T480-160Zm0-240q-33 0-56.5-23.5T400-480q0-33 23.5-56.5T480-560q33 0 56.5 23.5T560-480q0 33-23.5 56.5T480-400Zm0-240q-33 0-56.5-23.5T400-720q0-33 23.5-56.5T480-800q33 0 56.5 23.5T560-720q0 33-23.5 56.5T480-640Z',
    edit: 'M200-200h57l391-391-57-57-391 391v57Zm-80 80v-170l528-527q12-11 26.5-17t30.5-6q16 0 31 6t26 18l55 56q12 11 17.5 26t5.5 30q0 16-5.5 30.5T817-647L290-120H120Zm640-584-56-56 56 56Zm-141 85-28-29 57 57-29-28Z',
    calendar: 'M200-80q-33 0-56.5-23.5T120-160v-560q0-33 23.5-56.5T200-800h40v-80h80v80h320v-80h80v80h40q33 0 56.5 23.5T840-720v560q0 33-23.5 56.5T760-80H200Zm0-80h560v-400H200v400Zm0-480h560v-80H200v80Zm0 0v-80 80Z',
    del: 'M280-120q-33 0-56.5-23.5T200-200v-520h-40v-80h200v-40h240v40h200v80h-40v520q0 33-23.5 56.5T680-120H280Zm400-600H280v520h400v-520ZM360-280h80v-360h-80v360Zm160 0h80v-360h-80v360ZM280-720v520-520Z',
    close: 'm256-200-56-56 224-224-224-224 56-56 224 224 224-224 56 56-224 224 224 224-56 56-224-224-224 224Z',
    check: 'M382-240 154-468l57-57 171 171 367-367 57 57-424 424Z',
    chevron: 'M480-528 296-344l-56-56 240-240 240 240-56 56-184-184Z',
    bag: 'M240-80q-33 0-56.5-23.5T160-160v-480q0-33 23.5-56.5T240-720h80q0-66 47-113t113-47q66 0 113 47t47 113h80q33 0 56.5 23.5T800-640v480q0 33-23.5 56.5T720-80H240Zm0-80h480v-480h-80v80q0 17-11.5 28.5T600-520q-17 0-28.5-11.5T560-560v-80H400v80q0 17-11.5 28.5T360-520q-17 0-28.5-11.5T320-560v-80h-80v480Zm160-560h160q0-33-23.5-56.5T480-800q-33 0-56.5 23.5T400-720ZM240-160v-480 480Z',
    bought: 'm424-296 282-282-56-56-226 226-114-114-56 56 170 170Zm56 216q-83 0-156-31.5T197-197q-54-54-85.5-127T80-480q0-83 31.5-156T197-763q54-54 127-85.5T480-880q83 0 156 31.5T763-763q54 54 85.5 127T880-480q0 83-31.5 156T763-197q-54 54-127 85.5T480-80Zm0-80q134 0 227-93t93-227q0-134-93-227t-227-93q-134 0-227 93t-93 227q0 134 93 227t227 93Zm0-320Z',
    back: 'M400-80 0-480l400-400 71 71-329 329 329 329-71 71Z',
    forward: 'm321-80-71-71 329-329-329-329 71-71 400 400L321-80Z'
  };
  const icon = (name, size = 22) => `<svg width="${size}" height="${size}" viewBox="0 -960 960 960" aria-hidden="true"><path fill="currentColor" d="${PATHS[name]}"/></svg>`;

  function ordinal(day) {
    const lastTwo = day % 100;
    return `${day}${lastTwo >= 11 && lastTwo <= 13 ? 'th' : ({ 1: 'st', 2: 'nd', 3: 'rd' }[day % 10] || 'th')}`;
  }

  // Every category on an item; older items only have a single `goal`.
  const goalsOf = (item) => (Array.isArray(item.goals) && item.goals.length ? item.goals : item.goal ? [item.goal] : []);
  // "A", "A and B", "A, B and C".
  const joinList = (list) => (list.length < 2 ? list.join('') : `${list.slice(0, -1).join(', ')} and ${list[list.length - 1]}`);
  window.pinchGoals = goalsOf;
  window.pinchJoinList = joinList;

  function boughtText(item) {
    const date = new Date(item.boughtAt);
    return Number.isFinite(date.getTime()) ? `Bought on the ${ordinal(date.getDate())} of ${date.toLocaleDateString(undefined, { month: 'long' })} ${date.getFullYear()}` : 'Bought';
  }

  function unlockText(item) {
    const date = window.pinchUnlockDate ? window.pinchUnlockDate(item) : null;
    if (!date) return item.lockDuration ? `Locked for ${item.lockDuration}` : 'No lock set';
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const label = `${ordinal(date.getDate())} of ${date.toLocaleDateString(undefined, { month: 'long' })} ${date.getFullYear()}`;
    return date <= today ? `Unlocked on the ${label}` : `Unlocks on the ${label}`;
  }

  function money(amount, currency) {
    const value = Math.round(Number(amount) * 100) / 100;
    const digits = Number.isInteger(value) ? 0 : 2;
    return `${SYMBOLS[currency] || ''}${value.toLocaleString(undefined, { minimumFractionDigits: digits, maximumFractionDigits: digits })} ${currency || ''}`.trim();
  }

  function costBlock(item, settings) {
    const price = item.price === '' || item.price == null ? NaN : Number(item.price);
    if (!Number.isFinite(price)) return '';
    const rate = Number(settings.taxRate) || 0;
    const withTax = settings.showTaxInCost && rate > 0;
    if (!withTax) return `<div class="pj-cost-box"><div class="pj-cost-row"><span>Price: ${esc(money(price, item.currency))}</span></div></div>`;
    const tax = price * rate / 100;
    return `<div class="pj-cost-box"><button type="button" class="pj-cost-row" data-action="cost-toggle" aria-expanded="false"><span>True cost: ${esc(money(price + tax, item.currency))}</span>${icon('chevron', 20)}</button>
      <dl class="pj-cost-detail" hidden><div><dt>Original price</dt><dd>${esc(money(price, item.currency))}</dd></div><div><dt>Tax (${esc(rate)}%)</dt><dd>${esc(money(tax, item.currency))}</dd></div></dl></div>`;
  }

  const fabClosed = (name) => `<button type="button" class="pj-fab-btn" data-action="fab-open" aria-expanded="false" aria-label="Actions for ${esc(name)}">${icon('more')}</button>`;
  const fabOpen = (name, bought) => `<button type="button" class="pj-fab-btn" data-action="item-edit" aria-label="Edit ${esc(name)}">${icon('edit')}</button><button type="button" class="pj-fab-btn" data-action="item-lock" aria-label="Change unlock date">${icon('calendar')}</button><button type="button" class="pj-fab-btn${bought ? ' is-on' : ''}" data-action="item-bought" aria-pressed="${bought}" aria-label="${bought ? `Mark ${esc(name)} as not bought` : `Mark ${esc(name)} as bought`}" title="${bought ? 'Bought' : 'Mark as bought'}">${icon('bag')}</button><button type="button" class="pj-fab-btn is-danger" data-action="item-delete" aria-label="Delete ${esc(name)}">${icon('del')}</button><span class="pj-fab-divider" aria-hidden="true"></span><button type="button" class="pj-fab-btn" data-action="fab-close" aria-label="Close actions">${icon('close')}</button>`;
  const fabConfirm = (name) => `<span class="pj-fab-question" id="pj-confirm-text">Delete this item?</span><button type="button" class="pj-fab-btn" data-action="fab-close" aria-label="Keep ${esc(name)}">${icon('close')}</button><button type="button" class="pj-fab-btn is-danger" data-action="item-delete-confirm" aria-label="Yes, delete ${esc(name)}">${icon('check')}</button>`;

  // Edit pop-ups, shared by the wishlist card and the item page.
  function sheet(title, body, onSubmit) {
    const dialog = document.createElement('dialog');
    dialog.className = 'pj-sheet';
    dialog.innerHTML = `<form method="dialog" class="pj-sheet-form"><h2>${esc(title)}</h2>${body}<p class="pj-sheet-error" role="alert"></p><div class="pj-sheet-actions"><button type="button" class="pj-sheet-cancel" value="cancel">Cancel</button><button type="submit" class="pj-next">Save</button></div></form>`;
    document.body.appendChild(dialog);
    const form = dialog.querySelector('form');
    const error = dialog.querySelector('.pj-sheet-error');
    dialog.querySelector('.pj-sheet-cancel').onclick = () => dialog.close();
    dialog.addEventListener('close', () => dialog.remove());
    dialog.addEventListener('click', (event) => { if (event.target === dialog) dialog.close(); });
    form.onsubmit = async (event) => {
      event.preventDefault();
      const save = form.querySelector('[type="submit"]');
      save.disabled = true;
      error.textContent = '';
      try {
        await onSubmit(new FormData(form), form);
        dialog.close();
      } catch (err) {
        error.textContent = err && err.message ? err.message : 'Could not save. Check your connection and try again.';
        save.disabled = false;
      }
    };
    dialog.showModal();
    return dialog;
  }

  function editSheet(item, settings, onUpdate) {
    const current = goalsOf(item);
    const categories = settings.categories.map((c) => c.name);
    current.forEach((goal) => { if (!categories.includes(goal)) categories.push(goal); });
    const color = (name) => (settings.categories.find((c) => c.name === name) || {}).color || 'grey';
    const body = `<label class="pj-sheet-field"><span>Name</span><input name="name" maxlength="200" required value="${esc(item.name)}" autocomplete="off"></label>
      <div class="pj-sheet-pair"><label class="pj-sheet-field"><span>Price</span><input name="price" type="number" min="0" step="any" inputmode="decimal" value="${esc(item.price)}"></label>
      <label class="pj-sheet-field pj-sheet-currency"><span>Currency</span><select name="currency">${CURRENCIES.map((c) => `<option${c === item.currency ? ' selected' : ''}>${c}</option>`).join('')}</select></label></div>
      <label class="pj-sheet-field"><span>Store</span><input name="store" maxlength="200" placeholder="e.g. apple.com" value="${esc(item.store)}" autocomplete="off"></label>
      <fieldset class="pj-sheet-field pj-sheet-goals"><legend>Categories</legend><div class="pj-sheet-chips">${categories.map((c) => `<label class="pj-sheet-chip"><input type="checkbox" name="goals" value="${esc(c)}"${current.includes(c) ? ' checked' : ''}><span class="pj-tag pj-${esc(color(c))}">${esc(c)}</span></label>`).join('')}</div></fieldset>`;
    sheet('Edit item', body, async (data) => {
      const name = String(data.get('name')).trim();
      if (!name) throw new Error('Please enter an item name.');
      await onUpdate(item.id, { name, price: String(data.get('price')), currency: String(data.get('currency')), goals: data.getAll('goals').map(String), store: String(data.get('store')) });
    });
  }

  function lockSheet(item, onUpdate) {
    const custom = item.lockDuration && !LOCKS.includes(item.lockDuration) ? item.lockDuration : '';
    const body = `<p class="pj-sheet-hint">Your unlock date counts from the day you added this item.</p>
      <div class="pj-sheet-locks" role="radiogroup" aria-label="Lock length">${LOCKS.map((lock) => `<label class="pj-sheet-lock"><input type="radio" name="lock" value="${lock}"${item.lockDuration === lock ? ' checked' : ''}><span>${lock}</span></label>`).join('')}</div>
      <label class="pj-sheet-field"><span>Or a custom length</span><input name="custom" placeholder="e.g. 3 weeks" value="${esc(custom)}" autocomplete="off"></label>
      <p class="pj-sheet-preview" aria-live="polite"></p>`;
    const dialog = sheet('Change unlock date', body, async (data) => {
      const lockDuration = String(data.get('custom') || '').trim() || String(data.get('lock') || '');
      if (lockDuration && !/^\d+\s*(day|week|month)s?$/i.test(lockDuration)) throw new Error('Use a length like “3 days”, “2 weeks” or “1 month”.');
      await onUpdate(item.id, { lockDuration });
    });
    const form = dialog.querySelector('form');
    const preview = dialog.querySelector('.pj-sheet-preview');
    const update = (event) => {
      if (event && event.target.name === 'lock') form.elements.custom.value = '';
      if (event && event.target.name === 'custom' && event.target.value) form.querySelectorAll('[name="lock"]').forEach((radio) => { radio.checked = false; });
      const lockDuration = form.elements.custom.value.trim() || (form.querySelector('[name="lock"]:checked') || {}).value || '';
      preview.textContent = lockDuration ? unlockText({ ...item, lockDuration }) : 'No lock set';
    };
    form.addEventListener('input', update);
    update();
  }

  window.pinchItemSheets = { edit: editSheet, lock: lockSheet };
  window.pinchItemFormat = { esc, icon, money, unlockText, boughtText, mood: (item) => MOODS[String(item.feeling || '').toLowerCase()] || 'neutral' };

  window.pinchItemCard = function pinchItemCard(item, settings) {
    const name = item.name || item.title || '';
    const categories = goalsOf(item).map((goal) => goal.toLowerCase());
    const mood = MOODS[String(item.feeling || '').toLowerCase()] || 'neutral';
    const image = typeof item.image === 'string' ? item.image : '';
    return `<article class="pj-card pj-item${item.boughtAt ? ' is-bought' : ''}" data-id="${esc(item.id)}" data-categories="${esc(categories.join('|'))}" data-name="${esc(String(name).toLowerCase())}">
      <div class="pj-item-head"><img class="pj-item-mood" src="./assets/journey/${mood}.svg" alt="${esc(item.feeling ? `Feeling ${item.feeling.toLowerCase()}` : '')}"><h2><button type="button" class="pj-item-open" data-action="open-item">${esc(name)}</button></h2></div>
      <div class="pj-item-image" data-action="open-item">${image ? `<img src="${esc(image)}" alt="">` : ''}<div class="pj-fab" data-state="closed">${fabClosed(name)}</div></div>
      <div class="pj-item-info">${item.boughtAt ? `<p class="pj-unlock pj-bought">${icon('bought', 18)}<span>${esc(boughtText(item))}</span></p>` : `<p class="pj-unlock">${esc(unlockText(item))}</p>`}${costBlock(item, settings)}</div>
    </article>`;
  };

  // Wires the action button, cost breakdown and edit sheets for the cards inside `root`.
  // Returns a click handler; it returns true when it handled the click.
  window.pinchItemActions = function pinchItemActions(root, { items, settings, onUpdate, onDelete, onOpen }) {
    const byId = new Map(items.map((item) => [String(item.id), item]));

    function setFab(fab, state) {
      const card = fab.closest('.pj-item');
      const entry = byId.get(card.dataset.id) || {};
      const name = entry.name || '';
      fab.dataset.state = state;
      fab.innerHTML = state === 'open' ? fabOpen(name, Boolean(entry.boughtAt)) : state === 'confirm' ? fabConfirm(name) : fabClosed(name);
      const first = fab.querySelector(state === 'closed' ? '[data-action="fab-open"]' : state === 'confirm' ? '[data-action="fab-close"]' : '[data-action="item-edit"]');
      if (first) first.focus({ preventScroll: true });
    }

    function closeAll(except) {
      root.querySelectorAll('.pj-fab:not([data-state="closed"])').forEach((fab) => { if (fab !== except) setFab(fab, 'closed'); });
    }

    document.addEventListener('keydown', function onKey(event) {
      if (!root.isConnected || !root.querySelector('.pj-item')) { document.removeEventListener('keydown', onKey); return; }
      if (event.key === 'Escape' && !document.querySelector('dialog.pj-sheet[open]')) {
        const open = root.querySelector('.pj-fab:not([data-state="closed"])');
        if (open) setFab(open, 'closed');
      }
    });

    return function handleClick(event) {
      const fab = event.target.closest('.pj-fab');
      if (!fab) closeAll();
      // The photo opens the item too, unless the tap was on the action button.
      const button = event.target.closest('button') || (!fab && event.target.closest('.pj-item-image[data-action="open-item"]'));
      if (!button) return false;
      const card = button.closest('.pj-item');
      const item = card && byId.get(card.dataset.id);
      switch (button.dataset.action) {
        case 'open-item': if (item && onOpen) onOpen(item.id); return true;
        case 'fab-open': closeAll(fab); setFab(fab, 'open'); return true;
        case 'fab-close': setFab(fab, 'closed'); return true;
        case 'item-edit': setFab(fab, 'closed'); if (item) editSheet(item, settings, onUpdate); return true;
        case 'item-lock': setFab(fab, 'closed'); if (item) lockSheet(item, onUpdate); return true;
        case 'item-bought': {
          if (!item) return true;
          button.disabled = true;
          Promise.resolve(onUpdate(item.id, { boughtAt: item.boughtAt ? null : new Date().toISOString() })).catch(() => {
            button.disabled = false;
            window.alert('Could not update this item. Check your connection and try again.');
          });
          return true;
        }
        case 'item-delete': setFab(fab, 'confirm'); return true;
        case 'item-delete-confirm': {
          button.disabled = true;
          Promise.resolve(onDelete(item.id)).catch(() => {
            button.disabled = false;
            window.alert('Could not delete this item. Check your connection and try again.');
          });
          return true;
        }
        case 'cost-toggle': {
          const open = button.getAttribute('aria-expanded') !== 'true';
          button.setAttribute('aria-expanded', String(open));
          button.parentElement.querySelector('.pj-cost-detail').hidden = !open;
          return true;
        }
        default: return false;
      }
    };
  };
})();
