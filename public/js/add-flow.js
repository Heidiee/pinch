(() => {
  const asset = name => `./assets/add/${name}.svg`;
  const image = (name, cls = '') => `<img class="${cls}" src="${asset(name)}" alt="">`;
  const escape = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const choices = (key, values, selected, extra = '') => `<div class="af-choices ${extra}" role="group">${values.map(([label, color, value]) => `<button type="button" class="af-choice af-${color}" data-choice="${key}" data-value="${escape(value || label)}" aria-pressed="${selected === (value || label)}">${escape(label)}</button>`).join('')}</div>`;
  const illustration = `
    <div class="af-art" aria-hidden="true">
      <div class="af-art-map"><i></i><b></b><b></b><b></b><em></em><em></em><em></em>${image('check','af-check af-check-one')}${image('check','af-check af-check-two')}${image('pin','af-pin af-pin-one')}${image('pin','af-pin af-pin-two')}</div>
      ${image('education','af-art-education-back')}<div class="af-art-education"><i></i><i></i><i></i></div>${image('star','af-art-star')}
      ${image('maps-back','af-maps-back')}${image('maps','af-maps')}${image('map-symbol','af-map-symbol')}<div class="af-map-line af-map-line1"></div><div class="af-map-line af-map-line2"></div><div class="af-map-line af-map-line3"></div><div class="af-map-line af-map-line4"></div>${image('maps-pin','af-maps-pin')}
      ${image('bag-handle','af-bag-handle')}${image('bag-top','af-bag-top')}${image('bag-body','af-bag-body')}${image('bag-bottom','af-bag-bottom')}${image('bag-side','af-bag-side')}${image('bag-dot','af-bag-dot1')}${image('bag-dot','af-bag-dot2')}${image('bag-handle2','af-bag-handle2')}
      ${image('hourglass-back','af-hourglass-back')}<div class="af-hourglass-frame"></div>${image('hourglass','af-hourglass')}${image('sand','af-sand')}<div class="af-hourglass-top"></div><div class="af-hourglass-bottom"></div>${image('hourglass-pin','af-hourglass-pin')}
    </div>`;

  window.mountAddFlow = function mountAddFlow(root, { onHome = () => {}, onComplete = () => {}, onSettings = () => {}, settings = window.PINCH_DEFAULT_SETTINGS } = {}) {
    const blank = () => ({ name: '', price: '', currency: settings.currency, image: null, goal: '', urgency: '', lockDuration: settings.defaultLockDuration, feeling: '' });
    const item = blank();
    let step = 0;
    const title = [
      'Add another item', 'Which goal are you reaching for with this item?', 'Do you need this item right now?',
      'Take some time to make sure it’s a keeper.', 'How does spending money on this item make you feel?'
    ];
    const next = label => `<button type="button" class="af-next" data-action="next">${label} ${image('next')}</button>`;
    function render() {
      const heading = step < 5 ? `<div class="af-heading"><h1>${title[step]}</h1>${step === 3 ? '<p>You can lock the item for a while, giving you the space to make a decision you’ll feel great about.</p>' : ''}</div>` : '';
      let body = '';
      if (step === 0) body = `<div class="af-fields"><label class="af-field"><span class="af-sr">Item name</span><input name="name" placeholder="Macbook Pro 14 inch" value="${escape(item.name)}" autocomplete="off"></label><label class="af-field af-price"><span class="af-sr">Price</span><input name="price" type="number" min="0" step="0.01" inputmode="decimal" placeholder="2300" value="${escape(item.price)}"><select name="currency" aria-label="Currency">${['CAD','USD','EUR','GBP','AUD'].map(v => `<option ${item.currency === v ? 'selected' : ''}>${v}</option>`).join('')}</select>${image('currency')}</label><label class="af-upload">${item.image ? 'Change image' : 'Input image'} ${image('upload')}<input class="af-sr" type="file" accept="image/*" name="image"></label>${item.image ? '<span class="af-image-added">Image added</span>' : ''}${next('Next')}</div>`;
      if (step === 1) body = choices('goal', settings.categories.map(({ name, color }) => [name, color]), item.goal, 'af-goals');
      if (step === 2) body = choices('urgency', [['yes, urgently','coral'],['I can wait...','green'],['not urgent at all','blue']], item.urgency, 'af-urgency');
      if (step === 3) body = `${choices('lockDuration', [['1 Day','coral'],['1 Week','orange'],['2 Weeks','green'],['1 Month','blue']], item.lockDuration, 'af-durations')}<label class="af-custom"><span class="af-sr">Custom lock duration</span><input name="lockDuration" placeholder="custom input" value="${escape(!['1 Day','1 Week','2 Weeks','1 Month'].includes(item.lockDuration) ? item.lockDuration : '')}"></label>`;
      if (step === 4) body = `<div class="af-feelings" role="group" aria-label="How do you feel?">${['Excited','Happy','Neutral','Sad','Upset'].map(name => `<button type="button" data-choice="feeling" data-value="${name}" aria-pressed="${item.feeling === name}">${image(name.toLowerCase())}<span>${name}</span></button>`).join('')}</div>`;
      if (step === 5) body = `<div class="af-summary">${illustration}<h1>Yay! you logged another item</h1><p class="af-summary-purple"><strong>${escape(item.name || 'Your item')}</strong>${item.goal ? ` for <strong>${escape(item.goal.toLowerCase())}</strong> purposes` : ''}.</p><p class="af-summary-blue">${item.lockDuration ? `It will be locked for <strong>${escape(item.lockDuration.toLowerCase())}</strong>.` : 'No lock duration selected.'}</p><p class="af-summary-green">${item.feeling ? `Paying for it makes you feel <strong>${escape(item.feeling.toLowerCase())}</strong>.` : 'No feeling selected.'}</p></div>${next('Go to home')}`;
      root.innerHTML = `<section class="af-screen ${step === 5 ? 'af-complete' : ''}"><header class="af-brand">${image('logo')}<span>Pinch</span></header><div class="af-content"><div class="af-pagination">${image(`page${step + 1}`)}</div>${heading}${body}</div>${step > 0 && step < 5 ? `<div class="af-actions">${next('Next')}<div class="af-secondary"><button type="button" class="af-back" data-action="back">‹ Back</button><button type="button" class="af-skip" data-action="skip">Skip ›</button></div></div>` : ''}<nav class="af-nav" aria-label="Main navigation"><button type="button" data-action="home" aria-label="Home">${image('home')}</button><button type="button" data-action="add" aria-label="Add item" aria-current="page">${image('add')}</button><button type="button" data-action="settings" aria-label="Settings">${image('info')}</button></nav></section>`;
    }
    root.onclick = event => {
      const button = event.target.closest('button');
      if (!button || !root.contains(button) || !button.closest('.af-screen')) return;
      if (button.dataset.choice) {
        const key = button.dataset.choice;
        item[key] = button.dataset.value;
        // Update in place so the press and selection can animate instead of re-rendering.
        root.querySelectorAll(`[data-choice="${key}"]`).forEach(choice => choice.setAttribute('aria-pressed', String(choice === button)));
        const custom = key === 'lockDuration' && root.querySelector('input[name="lockDuration"]');
        if (custom) custom.value = '';
        return;
      }
      switch (button.dataset.action) {
        case 'home': onHome(); break;
        case 'add': if (step === 5) Object.assign(item, blank()); step = 0; render(); break;
        case 'settings': onSettings(); break;
        case 'back': step--; render(); break;
        case 'skip': item[['', 'goal', 'urgency', 'lockDuration', 'feeling'][step]] = ''; step++; render(); break;
        case 'next':
          if (step === 0 && !item.name.trim()) {
            window.alert('Please enter an item name.');
            root.querySelector('input[name="name"]').focus();
            break;
          }
          if (step !== 5) { step++; render(); break; }
          if (button.disabled) break;
          button.disabled = true;
          button.setAttribute('aria-busy', 'true');
          Promise.resolve().then(() => onComplete({ ...item })).catch(() => {
            button.disabled = false;
            button.removeAttribute('aria-busy');
            window.alert('Could not save your item. Check your connection and try again.');
          });
          break;
      }
    };
    root.oninput = event => {
      if (event.target.closest('.af-screen') && ['name','price','lockDuration'].includes(event.target.name)) item[event.target.name] = event.target.value;
      if (event.target.name === 'lockDuration') root.querySelectorAll('[data-choice="lockDuration"]').forEach(choice => choice.setAttribute('aria-pressed', String(choice.dataset.value === event.target.value)));
    };
    root.onchange = event => {
      if (!event.target.closest('.af-screen')) return;
      if (event.target.name === 'currency') item.currency = event.target.value;
      if (event.target.name === 'image') {
        const file = event.target.files[0];
        if (file) {
          if (!['image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(file.type) || file.size > 2 * 1024 * 1024) {
            window.alert('Choose a JPEG, PNG, GIF or WebP image no larger than 2 MB.');
            event.target.value = '';
            return;
          }
          const reader = new FileReader();
          reader.onload = () => { item.image = reader.result; if (step === 0) render(); };
          reader.onerror = () => window.alert('Could not read this image. Please try again.');
          reader.readAsDataURL(file);
        }
      }
    };
    render();
  };
})();
