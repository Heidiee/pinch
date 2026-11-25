(() => {
  const asset = (name) => `./assets/journey/${name}.svg`;
  const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const img = (name, cls = '') => `<img class="${cls}" src="${asset(name)}" alt="">`;

  const CURRENCIES = ['CAD', 'USD', 'EUR', 'GBP', 'AUD'];
  const LOCKS = [['', 'None'], ['1 Day', '1 Day'], ['1 Week', '1 Week'], ['2 Weeks', '2 Weeks'], ['1 Month', '1 Month']];
  const COLORS = ['purple', 'green', 'blue', 'coral', 'orange', 'grey'];

  // Used when the server can't be reached, so the app still works with sensible defaults.
  window.PINCH_DEFAULT_SETTINGS = Object.freeze({
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

  // Price including sales tax when the setting is on; null when the item has no usable price.
  window.pinchTrueCost = function pinchTrueCost(price, settings) {
    if (price === '' || price == null || !Number.isFinite(Number(price))) return null;
    const base = Number(price);
    const withTax = settings && settings.showTaxInCost ? base * (1 + (Number(settings.taxRate) || 0) / 100) : base;
    return withTax.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 });
  };

  function csvCell(value) {
    let text = String(value ?? '');
    if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`; // keep spreadsheets from running it as a formula
    return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  }

  function localDate(date) {
    if (!date || !Number.isFinite(date.getTime())) return '';
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  }

  function exportCsv(items, settings) {
    const header = ['Name', 'Price', 'Currency', 'True cost', 'Category', 'Urgency', 'Lock', 'Feeling', 'Added', 'Unlocks'];
    const rows = items.map((item) => {
      const unlock = window.pinchUnlockDate ? window.pinchUnlockDate(item) : null;
      const added = item.createdAt ? new Date(item.createdAt) : null;
      const price = item.price === '' || item.price == null ? NaN : Number(item.price);
      const cost = Number.isFinite(price) ? Math.round(price * (settings.showTaxInCost ? 1 + (Number(settings.taxRate) || 0) / 100 : 1) * 100) / 100 : '';
      return [item.name, item.price, item.currency, cost, item.goal, item.urgency,
        item.lockDuration, item.feeling, localDate(added), localDate(unlock)];
    });
    const csv = [header, ...rows].map((row) => row.map(csvCell).join(',')).join('\r\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `pinch-wishlist-${localDate(new Date())}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function profileStats(items) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    let unlocked = 0;
    let locked = 0;
    items.forEach((item) => {
      const unlock = window.pinchUnlockDate ? window.pinchUnlockDate(item) : null;
      if (!unlock) return;
      if (unlock <= today) unlocked++;
      else locked++;
    });
    const first = items.map((item) => item.createdAt ? new Date(item.createdAt) : null)
      .filter((date) => date && Number.isFinite(date.getTime())).sort((a, b) => a - b)[0];
    return { count: items.length, locked, unlocked, since: first ? first.toLocaleDateString(undefined, { month: 'short', year: 'numeric' }) : '' };
  }

  window.mountSettings = function mountSettings(root, { settings: initial, loadItems = async () => [], saveSettings, onHome = () => {}, onAdd = () => {} } = {}) {
    let settings = structuredClone(initial || window.PINCH_DEFAULT_SETTINGS);
    let items = [];
    let editingCategories = false;
    let addingCategory = false;
    let newColor = COLORS[settings.categories.length % COLORS.length];
    let status = '';
    let rendered = false;
    root.onclick = null;
    root.oninput = null;
    root.onchange = null;

    const toggle = (name, on, label) => `<button type="button" class="ps-toggle" role="switch" data-setting="${name}" aria-checked="${on}" aria-label="${esc(label)}"><span></span></button>`;

    // Re-rendering replaces the controls, so remember which one had focus and put it back.
    function focusKey(el) {
      if (!el || !root.contains(el)) return null;
      if (el.dataset.setting) return `[data-setting="${el.dataset.setting}"]`;
      if (el.name) return `[name="${el.name}"]`;
      if (el.dataset.action) return `[data-action="${el.dataset.action}"]${el.dataset.value !== undefined ? `[data-value="${CSS.escape(el.dataset.value)}"]` : ''}`;
      return null;
    }

    function render() {
      const restore = focusKey(document.activeElement);
      draw();
      rendered = true;
      const target = restore && root.querySelector(restore);
      if (target) target.focus({ preventScroll: true });
    }

    function draw() {
      const stats = profileStats(items);
      const chips = settings.categories.map((category, index) => `<span class="ps-chip pj-tag pj-${esc(category.color)}">${esc(category.name)}${editingCategories ? `<button type="button" class="ps-chip-remove" data-action="remove-category" data-index="${index}" aria-label="Remove ${esc(category.name)}"><svg viewBox="0 0 10 10" width="8" height="8" aria-hidden="true"><path d="M1.5 1.5l7 7M8.5 1.5l-7 7" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg></button>` : ''}</span>`).join('');
      const adder = addingCategory
        ? `<form class="ps-new-category" data-form="category"><label class="ps-sr" for="ps-category-name">Category name</label><input id="ps-category-name" name="category" maxlength="30" placeholder="Category name" autocomplete="off" required><div class="ps-colors" role="radiogroup" aria-label="Category colour">${COLORS.map((color) => `<button type="button" class="ps-color pj-${color}" role="radio" data-action="pick-color" data-color="${color}" aria-checked="${color === newColor}" aria-label="${color}"></button>`).join('')}</div><div class="ps-new-actions"><button type="button" class="ps-text-button" data-action="cancel-category">Cancel</button><button type="submit" class="pj-next ps-add">Add</button></div></form>`
        : (settings.categories.length < 12 ? '<button type="button" class="ps-chip-new" data-action="new-category">+ New</button>' : '');
      root.innerHTML = `<section class="pj-home ps-screen${rendered ? ' is-ready' : ''}" aria-labelledby="ps-title"><div class="pj-home-inner ps-inner">
        <h1 id="ps-title">Settings</h1>
        <div class="ps-profile">
          <div class="ps-who"><div class="ps-avatar">${img('happy')}</div><div><h2>Your Pinch</h2><p>${stats.since ? `Pinching since ${esc(stats.since)}` : 'Add your first item to get started'}</p></div></div>
          <div class="ps-stats"><div><strong>${stats.count}</strong><span>on your list</span></div><div><strong>${stats.locked}</strong><span>locked</span></div><div><strong>${stats.unlocked}</strong><span>unlocked</span></div></div>
        </div>

        <h2 class="ps-group-title">Waiting period</h2>
        <div class="ps-card"><div class="ps-row ps-stack"><span id="ps-lock-label">Default lock length</span>
          <div class="ps-segmented" role="radiogroup" aria-labelledby="ps-lock-label">${LOCKS.map(([value, label]) => `<button type="button" role="radio" data-action="lock" data-value="${esc(value)}" aria-checked="${settings.defaultLockDuration === value}">${esc(label)}</button>`).join('')}</div>
          <p class="ps-hint">New items start with this lock. You can still change it while adding.</p></div></div>

        <h2 class="ps-group-title">Money</h2>
        <div class="ps-card">
          <label class="ps-row"><span>Home currency</span><span class="ps-value"><select name="currency">${CURRENCIES.map((c) => `<option${c === settings.currency ? ' selected' : ''}>${c}</option>`).join('')}</select></span></label>
          <label class="ps-row"><span>Sales tax</span><span class="ps-value"><input name="taxRate" type="number" inputmode="decimal" min="0" max="30" step="0.1" value="${esc(settings.taxRate)}" aria-describedby="ps-tax-unit"><span id="ps-tax-unit">%</span></span></label>
          <div class="ps-row"><span id="ps-tax-toggle">Show true cost with tax</span>${toggle('showTaxInCost', settings.showTaxInCost, 'Show true cost with tax')}</div>
        </div>

        <div class="ps-group-head"><h2 class="ps-group-title">Categories</h2>${settings.categories.length ? `<button type="button" class="ps-text-button" data-action="edit-categories" aria-pressed="${editingCategories}">${editingCategories ? 'Done' : 'Edit'}</button>` : ''}</div>
        <div class="ps-card ps-chips">${chips}${adder}</div>

        <h2 class="ps-group-title">Data</h2>
        <div class="ps-card"><button type="button" class="ps-row ps-row-button" data-action="export" ${items.length ? '' : 'disabled'}><span>Export wishlist</span><span class="ps-value">CSV ›</span></button></div>

        <p class="ps-status" role="status" aria-live="polite">${esc(status)}</p>
      </div>
      <nav class="pj-tabbar" aria-label="Main navigation"><button type="button" aria-label="Home" data-action="home">${img('home-inactive')}</button><button type="button" aria-label="Add item" data-action="add">${img('add')}</button><button type="button" aria-label="Settings" aria-current="page">${img('info-active')}</button></nav></section>`;
    }

    async function save(patch) {
      const previous = settings;
      settings = { ...settings, ...structuredClone(patch) };
      status = 'Saving…';
      render();
      try {
        settings = await saveSettings(patch);
        status = 'Saved';
      } catch (err) {
        settings = previous;
        status = err && err.message ? `Couldn’t save: ${err.message}` : 'Couldn’t save. Check your connection and try again.';
      }
      render();
    }

    root.onclick = (event) => {
      const button = event.target.closest('button');
      if (!button || !root.contains(button)) return;
      if (button.dataset.setting) { save({ [button.dataset.setting]: !settings[button.dataset.setting] }); return; }
      switch (button.dataset.action) {
        case 'home': onHome(); break;
        case 'add': onAdd(); break;
        case 'lock': if (button.dataset.value !== settings.defaultLockDuration) save({ defaultLockDuration: button.dataset.value }); break;
        case 'edit-categories': editingCategories = !editingCategories; addingCategory = false; render(); break;
        case 'remove-category': save({ categories: settings.categories.filter((_, i) => i !== Number(button.dataset.index)) }); break;
        case 'new-category': addingCategory = true; editingCategories = false; render(); root.querySelector('#ps-category-name').focus(); break;
        case 'cancel-category': addingCategory = false; render(); break;
        case 'pick-color': {
          newColor = button.dataset.color;
          root.querySelectorAll('.ps-color').forEach((swatch) => swatch.setAttribute('aria-checked', String(swatch === button)));
          break;
        }
        case 'export': exportCsv(items, settings); break;
      }
    };

    root.onsubmit = (event) => {
      if (event.target.dataset.form !== 'category') return;
      event.preventDefault();
      const input = event.target.elements.category;
      const name = input.value.trim();
      if (!name) return;
      if (name.toLowerCase() === 'all' || settings.categories.some((c) => c.name.toLowerCase() === name.toLowerCase())) {
        input.setCustomValidity('You already have a category with this name.');
        input.reportValidity();
        input.oninput = () => input.setCustomValidity('');
        return;
      }
      addingCategory = false;
      save({ categories: [...settings.categories, { name, color: newColor }] });
      newColor = COLORS[(settings.categories.length + 1) % COLORS.length];
    };

    root.onchange = (event) => {
      const { name, value } = event.target;
      if (name === 'currency') save({ currency: value });
      if (name === 'taxRate') {
        const rate = Number(value);
        if (value === '' || !Number.isFinite(rate) || rate < 0 || rate > 30) {
          status = 'Sales tax must be between 0 and 30%.';
          render();
          return;
        }
        save({ taxRate: Math.round(rate * 100) / 100 });
      }
    };

    render();
    Promise.resolve().then(loadItems).then((loaded) => { items = Array.isArray(loaded) ? loaded : []; render(); }).catch(() => {});
  };
})();
