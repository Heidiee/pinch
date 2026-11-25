(() => {
  const asset = (name) => `./assets/journey/${name}.svg`;
  const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const img = (name, cls = '') => `<img class="${cls}" src="${asset(name)}" alt="">`;
  const next = (label = 'Next') => `<button type="button" class="pj-next" data-action="next">${label}${img('next')}</button>`;
  const part = (name, x, y, w, h, rotate = 0) => `<img src="${asset(name)}" alt="" style="left:${x}px;top:${y}px;width:${w}px;height:${h}px;transform:rotate(${rotate}deg)">`;

  function illustration(finish) {
    if (!finish) return `<div class="pj-art"><div class="pj-art-inner">
      ${part('bag-handle',139,48,36,44,180)}${part('bag-top',101,80,129,41)}${part('bag-body',101,93,128,133)}${part('bag-fold',102,195,47,30)}${part('bag-side',126,107,23,117)}${part('bag-dot',178,120,7,7)}${part('bag-dot',201,111,7,7)}${part('bag-handle2',169,47,36,77,180)}${part('bag-caption',51,260,235,30)}
    </div></div>`;
    return `<div class="pj-art"><div class="pj-art-inner pj-finish-art">
      <div class="pj-map"><i></i><b></b><b></b><b></b><em></em><em></em><em></em></div>
      ${part('finish-check',78,67,15,10)}${part('finish-check',78,90,15,10)}${part('finish-dot',68,40,5,6)}${part('finish-dot',149,40,5,6)}
      ${part('finish-education',181,81,64,80,6.76)}<div class="pj-paper"></div><div class="pj-paper-lines"></div>${part('finish-star',204,87,26,25,-10.31)}
      ${part('finish-map1',40,124,61,54,-7.53)}${part('finish-map2',44,123,57,51,-4.85)}${part('finish-mapdot',71,127,5,6)}${part('finish-union',50,136,19,19,-48.37)}
      ${part('finish-handle',143,151,33,43,177.29)}${part('finish-top',124,178,88,27)}${part('finish-body',103,180,127,140)}${part('finish-fold',104,293,47,26)}${part('finish-side',132,202,19,117)}${part('finish-bagdot',164,207,7,7)}${part('finish-bagdot',187,197,7,7)}${part('finish-handle2',162,151,29,59,180)}
      ${part('finish-frame',234,110,45,93,4.41)}<div class="pj-hour-paper"></div>${part('finish-hourglass',254,130,22,43,-6.86)}${part('finish-sand',257,141,17,30,-6.86)}<div class="pj-hour-top"></div><div class="pj-hour-bottom"></div>${part('finish-framedot',243,115,5,6)}
    </div></div>`;
  }
  const tag = (label, color, selected, action = 'choice') => `<button type="button" class="pj-tag pj-${color}${selected ? ' is-selected' : ''}" data-action="${action}" data-value="${esc(label)}" aria-pressed="${selected}">${esc(label)}</button>`;
  const navigation = () => `<div class="pj-nav">${next()}<div class="pj-secondary"><button type="button" class="pj-back" data-action="back">‹ Back</button><button type="button" class="pj-skip" data-action="skip">Skip ›</button></div></div>`;

  // Same floating nav as the add flow, with "+" as the current page.
  const tabbar = '<nav class="pj-tabbar" aria-label="Main navigation"><button type="button" data-action="home" aria-label="Home"><img src="./assets/add/home.svg" alt=""></button><button type="button" data-action="nav-add" aria-label="Add item" aria-current="page"><img src="./assets/add/add.svg" alt=""></button><button type="button" data-action="settings" aria-label="Settings"><img src="./assets/add/info.svg" alt=""></button></nav>';

  window.mountJourney = function mountJourney(root, { onComplete = () => {}, onHome = () => {}, onSettings = () => {}, settings = window.PINCH_DEFAULT_SETTINGS } = {}) {
    let step = 0;
    const item = { name: '', price: '', currency: settings.currency, image: null, goal: '', goals: [], urgency: '', lockDuration: settings.defaultLockDuration, feeling: '' };
    const nodes = ['17:1839', '17:1922', '17:2025', '17:2102', '17:2174', '20:2237', '20:2427'];
    function render() {
      let body = '';
      if (step === 0) body = `<div class="pj-polaroid pj-intro">${illustration(false)}<h1>Log what you’re wishing for!</h1><p>Pause and consider how certain items make you feel, does it align with your current goals and aspirations?</p></div><div class="pj-intro-next">${next('Let’s try it!')}</div>`;
      if (step === 1) body = `<div class="pj-heading"><h1>Let’s add your first item</h1></div><div class="pj-fields"><label class="pj-input"><span class="pj-sr">Item name</span><input name="name" placeholder="Item name" value="${esc(item.name)}"></label><label class="pj-input pj-price"><span class="pj-sr">Price</span><input name="price" type="number" min="0" step="any" placeholder="Price" value="${esc(item.price)}"><select name="currency" aria-label="Currency">${['CAD','USD','EUR','GBP','AUD'].map(c => `<option${item.currency === c ? ' selected' : ''}>${c}</option>`).join('')}</select></label><label class="pj-next pj-upload">Input image ${img('upload')}<input name="image" type="file" accept="image/*"></label>${item.image ? '<span class="pj-file-status">Image added</span>' : ''}${next()}<button type="button" class="pj-back" data-action="back">Back</button></div>`;
      if (step === 2) body = `<div class="pj-heading"><h1>Which goal are you reaching for with this item?</h1><p>Pick all that apply.</p></div><div class="pj-goals">${settings.categories.map(({ name: v, color: c }) => tag(v,c,item.goals.includes(v))).join('')}</div>${navigation(step)}`;
      if (step === 3) body = `<div class="pj-heading"><h1>Do you need this item right now?</h1></div><div class="pj-options pj-urgency">${[['yes, urgently','coral'],['I can wait...','green'],['not urgent at all','blue']].map(([v,c]) => tag(v,c,item.urgency === v)).join('')}</div>${navigation(step)}`;
      if (step === 4) body = `<div class="pj-heading"><h1>Take some time to make sure it’s a keeper.</h1><p>You can lock the item for a while, giving you the space to make a decision you’ll feel great about.</p></div><div class="pj-options pj-duration">${[['1 Day','coral'],['1 Week','orange'],['2 Weeks','green'],['1 Month','blue']].map(([v,c]) => tag(v,c,item.lockDuration === v)).join('')}<label class="pj-custom"><span class="pj-sr">Custom lock duration</span><input name="custom" placeholder="custom input" value="${esc(!['1 Day','1 Week','2 Weeks','1 Month'].includes(item.lockDuration) ? item.lockDuration : '')}"></label></div>${navigation(step)}`;
      if (step === 5) body = `<div class="pj-heading"><h1>How does spending money on this item make you feel?</h1></div><div class="pj-moods">${['Excited','Happy','Neutral','Sad','Upset'].map(v => `<button type="button" data-action="choice" data-value="${v}" class="pj-mood${item.feeling === v ? ' is-selected' : ''}" aria-pressed="${item.feeling === v}">${img(v.toLowerCase() + (item.feeling === v ? '-selected' : ''))}<span>${v}</span></button>`).join('')}</div>${navigation(step)}`;
      if (step === 6) body = `<div class="pj-polaroid pj-summary">${illustration(true)}<h1>Nice! you logged your first item</h1><div class="pj-summary-line pj-purple">${item.name ? `<strong>${esc(item.name)}</strong>` : 'Your item'}${item.goals.length ? ` for <strong>${esc(window.pinchJoinList(item.goals).toLowerCase())}</strong> purposes` : ''}.</div><div class="pj-summary-line pj-blue">${item.lockDuration ? `It will be locked for <strong>${esc(item.lockDuration.toLowerCase())}</strong>.` : 'No lock duration selected.'}</div><div class="pj-summary-line pj-green">${item.feeling ? `Paying for it makes you feel <strong>${esc(item.feeling.toLowerCase())}</strong>.` : 'No feeling selected.'}</div></div><div class="pj-intro-next">${next()}</div><button type="button" class="pj-back pj-summary-back" data-action="back">Back</button>`;
      root.innerHTML = `<section class="pj-screen" data-node-id="${nodes[step]}"><header class="pj-brand">${img('logo')}<span>Pinch</span></header><div class="pj-content"><div class="pj-progress">${img('page' + (step + 1))}</div>${body}</div>${tabbar}</section>`;
    }
    root.onclick = (event) => {
      const button = event.target.closest('[data-action]');
      if (!button || !root.contains(button)) return;
      const action = button.dataset.action;
      if (action === 'home') onHome();
      else if (action === 'settings') onSettings();
      else if (action === 'nav-add') { if (step !== 0) { step = 0; render(); } }
      else if (action === 'back') { step = Math.max(0, step - 1); render(); }
      else if (action === 'next') {
        if (step === 1 && !item.name.trim()) {
          window.alert('Please enter an item name.');
          root.querySelector('input[name="name"]').focus();
          return;
        }
        if (step !== 6) { step++; render(); return; }
        if (button.disabled) return;
        button.disabled = true;
        button.setAttribute('aria-busy', 'true');
        Promise.resolve().then(() => onComplete({ ...item })).catch(() => {
          button.disabled = false;
          button.removeAttribute('aria-busy');
          window.alert('Could not save your item. Check your connection and try again.');
        });
      }
      else if (action === 'skip') { if (step === 2) { item.goals = []; item.goal = ''; } else item[{ 3:'urgency', 4:'lockDuration', 5:'feeling' }[step]] = ''; step++; render(); }
      else if (action === 'choice' && step === 2) {
        // Categories are multi-select: each tap toggles one on or off.
        const value = button.dataset.value;
        item.goals = item.goals.includes(value) ? item.goals.filter(goal => goal !== value) : [...item.goals, value];
        item.goal = item.goals[0] || '';
        const on = item.goals.includes(value);
        button.classList.toggle('is-selected', on);
        button.setAttribute('aria-pressed', String(on));
      }
      else if (action === 'choice') {
        const key = { 2:'goal', 3:'urgency', 4:'lockDuration', 5:'feeling' }[step];
        item[key] = button.dataset.value;
        const custom = root.querySelector('input[name="custom"]');
        if (custom) custom.value = '';
        syncChoices(item[key]);
      }
    };
    // Update the selected option in place so its press and selection can animate,
    // instead of rebuilding the whole screen.
    function syncChoices(value) {
      root.querySelectorAll('[data-action="choice"]').forEach((choice) => {
        const selected = choice.dataset.value === value;
        choice.classList.toggle('is-selected', selected);
        choice.setAttribute('aria-pressed', String(selected));
        const face = choice.classList.contains('pj-mood') && choice.querySelector('img');
        if (face) face.src = asset(choice.dataset.value.toLowerCase() + (selected ? '-selected' : ''));
      });
    }
    root.oninput = (event) => { const { name, value } = event.target; if (name === 'custom') { item.lockDuration = value; syncChoices(value); } else if (name === 'name' || name === 'price' || name === 'currency') item[name] = value; };
    root.onchange = (event) => {
      if (event.target.name === 'currency') item.currency = event.target.value;
      if (event.target.name === 'image' && event.target.files[0]) {
        const file = event.target.files[0];
        if (!['image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(file.type) || file.size > 2 * 1024 * 1024) {
          window.alert('Choose a JPEG, PNG, GIF or WebP image no larger than 2 MB.');
          event.target.value = '';
          return;
        }
        const reader = new FileReader();
        reader.onload = () => { item.image = reader.result; if (step === 1) render(); };
        reader.onerror = () => window.alert('Could not read this image. Please try again.');
        reader.readAsDataURL(file);
      }
    };
    render();
  };

  window.mountHome = function mountHome(root, { onAdd = () => {}, onSettings = () => {}, onOpen = () => {}, onUpdate = async () => {}, onDelete = async () => {}, loadItems, settings = window.PINCH_DEFAULT_SETTINGS } = {}) {
    root.onclick = null;
    root.oninput = null;
    root.onchange = null;
    root.innerHTML = '<section class="pj-home"><div class="pj-home-inner"><h1>Your Wishlist</h1><p role="status">Loading your wishlist…</p></div></section>';
    const loadingScreen = root.firstElementChild;
    Promise.resolve().then(loadItems).then(items => {
      if (root.firstElementChild !== loadingScreen) return;
      renderHome(root, { onAdd, onSettings, onOpen, onUpdate, onDelete, settings }, items);
    }).catch(() => {
      if (root.firstElementChild !== loadingScreen) return;
      root.innerHTML = '<section class="pj-home"><div class="pj-home-inner"><h1>Your Wishlist</h1><p role="alert">Could not load your wishlist. Check your connection and try again.</p><button type="button" class="pj-next" data-action="retry">Retry</button></div></section>';
      root.onclick = event => { if (event.target.closest('[data-action="retry"]')) window.mountHome(root, { onAdd, onSettings, onOpen, onUpdate, onDelete, loadItems, settings }); };
    });
  };

  function renderHome(root, { onAdd, onSettings, onOpen, onUpdate, onDelete, settings }, items) {
    const cards = items.map(entry => window.pinchItemCard(entry, settings)).join('');
    const categories = [['All','grey'], ...settings.categories.map(({ name, color }) => [name, color])];
    root.innerHTML = `<section class="pj-home" data-node-id="25:3072"><div class="pj-home-inner"><h1>Your Wishlist</h1><label class="pj-search">${img('search')}<span class="pj-sr">Search item</span><input type="search" placeholder="Search item"></label><div class="pj-filters">${categories.map(([v,c]) => tag(v,c,v === 'All','filter')).join('')}</div><div class="pj-card pj-calendar"></div>${cards || '<div class="pj-empty">Your wishlist is empty. Add an item to get started.</div>'}<p class="pj-no-results" hidden>No matching items.</p></div><nav class="pj-tabbar" aria-label="Main navigation"><button type="button" aria-label="Home" aria-current="page">${img('home')}</button><button type="button" aria-label="Add item" data-action="add">${img('add')}</button><button type="button" aria-label="Settings" data-action="settings">${img('info')}</button></nav></section>`;
    window.pinchCalendar(root.querySelector('.pj-calendar'), { items, onOpen });
    const filters = new Set(); // empty = All
    const search = root.querySelector('.pj-search input');
    const update = () => { const cards = [...root.querySelectorAll('.pj-item')]; let shown = 0; cards.forEach(card => { const visible = (!filters.size || card.dataset.categories.split('|').some(c => filters.has(c))) && card.dataset.name.includes(search.value.trim().toLowerCase()); card.hidden = !visible; if (visible) shown++; }); root.querySelector('.pj-no-results').hidden = !cards.length || shown > 0; };
    const itemActions = window.pinchItemActions(root, { items, settings, onUpdate, onDelete, onOpen });
    root.onclick = (event) => {
      if (itemActions(event)) return;
      const button = event.target.closest('[data-action]');
      if (!button || !root.contains(button)) return;
      if (button.dataset.action === 'add') onAdd();
      if (button.dataset.action === 'settings') onSettings();
      if (button.dataset.action === 'filter') {
        // Categories toggle on and off together; "All" clears them.
        const value = button.dataset.value.toLowerCase();
        if (value === 'all') filters.clear();
        else if (filters.has(value)) filters.delete(value);
        else filters.add(value);
        root.querySelectorAll('[data-action="filter"]').forEach(b => {
          const v = b.dataset.value.toLowerCase();
          const selected = v === 'all' ? !filters.size : filters.has(v);
          b.classList.toggle('is-selected', selected);
          b.setAttribute('aria-pressed', selected);
        });
        update();
      }
    };
    root.oninput = (event) => { if (event.target === search) update(); };
    root.onchange = null;
  }

  window.pinchUnlockDate = (entry) => getUnlockDate(entry);

  function getUnlockDate(item) {
    if (typeof item.createdAt !== 'string') return null;
    const createdAt = new Date(item.createdAt);
    if (!Number.isFinite(createdAt.getTime())) return null;
    const match = String(item.lockDuration || '').trim().match(/^(\d+)\s*(day|week|month)s?$/i);
    if (!match) return null;
    const amount = Number(match[1]);
    if (!Number.isSafeInteger(amount) || amount < 1) return null;
    const unlockDate = new Date(createdAt.getFullYear(), createdAt.getMonth(), createdAt.getDate());
    const unit = match[2].toLowerCase();
    if (unit === 'month') {
      const day = unlockDate.getDate();
      unlockDate.setDate(1);
      unlockDate.setMonth(unlockDate.getMonth() + amount);
      unlockDate.setDate(Math.min(day, new Date(unlockDate.getFullYear(), unlockDate.getMonth() + 1, 0).getDate()));
    } else {
      unlockDate.setDate(unlockDate.getDate() + amount * (unit === 'week' ? 7 : 1));
    }
    return unlockDate;
  }

})();
