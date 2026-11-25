(() => {
  // Item bottom sheet (Figma node 277:3946): slides up over the wishlist with the photo, title,
  // tabs for details / price / notes, and a keep-or-let-go decision.
  // Dismiss by dragging the handle down, tapping outside, pressing Esc or "Still want it".
  const TABS = [['details', 'Details'], ['price', 'Price'], ['notes', 'Notes']];
  const DISMISS_DISTANCE = 120; // px dragged down before letting go closes the sheet
  const DISMISS_VELOCITY = 0.6; // px per ms; a quick flick also closes it

  const dateLabel = (date) => (date && Number.isFinite(date.getTime()) ? date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—');
  const noteDate = (iso) => new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: '2-digit' });

  window.openItemSheet = function openItemSheet({ itemId, items, settings, tab = 'details', onUpdate, onDelete, onClose = () => {} } = {}) {
    const { esc, icon, money, mood } = window.pinchItemFormat;
    const list = items.slice();
    let index = list.findIndex((entry) => String(entry.id) === String(itemId));
    if (index === -1) return;
    let item = list[index];
    let activeTab = TABS.some(([id]) => id === tab) ? tab : 'details';
    let changed = false;
    let closing = false;

    const sheet = document.createElement('dialog');
    sheet.className = 'pd-sheet';
    sheet.setAttribute('aria-labelledby', 'pd-title');
    sheet.innerHTML = `<div class="pd-bar">
        <button type="button" class="pd-arrow" data-action="prev" aria-label="Previous item">${icon('back', 18)}</button>
        <button type="button" class="pd-handle" data-action="close" aria-label="Close"><span class="pd-grabber"></span></button>
        <button type="button" class="pd-arrow" data-action="next" aria-label="Next item">${icon('forward', 18)}</button>
      </div><div class="pd-content"></div>`;
    const content = sheet.querySelector('.pd-content');
    document.body.appendChild(sheet);

    const categoryColor = (name) => (settings.categories.find((c) => c.name === name) || {}).color || 'grey';
    const goals = () => window.pinchGoals(item);

    function detailsPanel() {
      const added = item.createdAt ? new Date(item.createdAt) : null;
      const unlock = window.pinchUnlockDate ? window.pinchUnlockDate(item) : null;
      const bought = item.boughtAt ? new Date(item.boughtAt) : null;
      const rows = [
        ['Status', bought ? `Bought ${dateLabel(bought)}` : unlock && unlock <= new Date() ? 'Unlocked' : 'Waiting'],
        [goals().length > 1 ? 'Categories' : 'Category', goals().join(', ') || '—'],
        ['Added', dateLabel(added)],
        ['Unlocks', unlock ? dateLabel(unlock) : '—'],
        ['Waiting period', item.lockDuration ? item.lockDuration.toLowerCase() : 'No lock'],
        ['Store', item.store || '—'],
        ['Mood', item.feeling || '—']
      ];
      return `<dl class="pd-rows">${rows.map(([k, v]) => `<div class="pd-row"><dt>${esc(k)}</dt><dd>${esc(v)}${k === 'Unlocks' ? ' <button type="button" class="pd-link" data-action="lock" aria-label="Change unlock date">Change</button>' : ''}</dd></div>`).join('')}</dl>`;
    }

    function pricePanel() {
      const price = item.price === '' || item.price == null ? NaN : Number(item.price);
      if (!Number.isFinite(price)) return '<p class="pd-empty">No price added yet. Use the edit button to add one.</p>';
      const rate = Number(settings.taxRate) || 0;
      const withTax = settings.showTaxInCost && rate > 0;
      const rows = [['Original price', money(price, item.currency)]];
      if (withTax) rows.push([`Tax (${rate}%)`, money(price * rate / 100, item.currency)]);
      return `<dl class="pd-rows">${rows.map(([k, v]) => `<div class="pd-row"><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}
        <div class="pd-row pd-total"><dt>${withTax ? 'True cost' : 'Price'}</dt><dd>${esc(money(withTax ? price * (1 + rate / 100) : price, item.currency))}</dd></div></dl>`;
    }

    function notesPanel() {
      const notes = (item.notes || []).map((note, i) => ({ ...note, i })).reverse();
      return `${notes.length ? `<ul class="pd-notes">${notes.map((note) => `<li class="pd-note"><span><time datetime="${esc(note.createdAt)}">${esc(noteDate(note.createdAt))}</time> | ${esc(note.text)}</span><button type="button" class="pd-note-remove" data-action="remove-note" data-index="${note.i}" aria-label="Delete note">${icon('close', 16)}</button></li>`).join('')}</ul>` : '<p class="pd-empty">No notes yet. Write down why you want it, or how you feel about it today.</p>'}
        <form class="pd-note-form" data-form="note"><label class="pj-sr" for="pd-note-text">New note</label><textarea id="pd-note-text" name="note" maxlength="500" rows="3" placeholder="Write what you’re thinking of"></textarea><p class="pd-note-error" role="alert"></p><div class="pd-note-actions"><button type="submit" class="pj-next">Add note</button></div></form>`;
    }

    function render(focusSelector) {
      const image = typeof item.image === 'string' ? item.image : '';
      const panel = activeTab === 'price' ? pricePanel() : activeTab === 'notes' ? notesPanel() : detailsPanel();
      const base = item.price === '' || item.price == null ? NaN : Number(item.price);
      const rate = settings.showTaxInCost ? Number(settings.taxRate) || 0 : 0;
      const price = Number.isFinite(base) ? money(base * (1 + rate / 100), item.currency) : '';
      sheet.querySelector('[data-action="prev"]').disabled = index === 0;
      sheet.querySelector('[data-action="next"]').disabled = index === list.length - 1;
      content.innerHTML = `
        <div class="pd-image">${image ? `<img src="${esc(image)}" alt="${esc(item.name)}">` : ''}</div>
        <div class="pd-info">
          <div class="pd-title"><h1 id="pd-title" tabindex="-1">${esc(item.name)}</h1><div class="pd-title-actions"><img class="pd-mood" src="./assets/journey/${mood(item)}.svg" alt="${esc(item.feeling ? `Feeling ${item.feeling.toLowerCase()}` : '')}"><button type="button" class="pd-edit" data-action="edit" aria-label="Edit ${esc(item.name)}">${icon('edit', 20)}</button></div></div>
          ${goals().length ? `<div class="pd-tags">${goals().map((goal) => `<span class="pd-tag pj-${esc(categoryColor(goal))}">${esc(goal)}</span>`).join('')}</div>` : ''}
          ${price ? `<p class="pd-price">${esc(price)}</p>` : ''}
        </div>
        <div class="pd-tabs" role="tablist" aria-label="Item information">${TABS.map(([id, label]) => `<button type="button" role="tab" id="pd-tab-${id}" aria-controls="pd-panel" aria-selected="${id === activeTab}" tabindex="${id === activeTab ? 0 : -1}" data-action="tab" data-tab="${id}">${esc(label)}${id === 'notes' && item.notes && item.notes.length ? ` (${item.notes.length})` : ''}</button>`).join('')}</div>
        <div class="pd-panel" id="pd-panel" role="tabpanel" aria-labelledby="pd-tab-${activeTab}" tabindex="0">${panel}</div>
        <div class="pd-actions"><button type="button" class="pd-letgo" data-action="let-go">Let it go</button><button type="button" class="pd-keep" data-action="keep">Still want it</button></div>`;
      const target = focusSelector && sheet.querySelector(focusSelector);
      if (target) target.focus({ preventScroll: true });
    }

    async function save(patch) {
      const updated = await onUpdate(item.id, patch);
      item = { ...item, ...(updated || patch) };
      list[index] = item;
      changed = true;
    }

    // Slide down, then close; the wishlist underneath is refreshed if anything changed.
    function dismiss() {
      if (closing) return;
      closing = true;
      sheet.style.translate = '';
      sheet.classList.add('is-closing');
      const finish = () => { if (sheet.open) sheet.close(); };
      sheet.addEventListener('transitionend', finish, { once: true });
      setTimeout(finish, 400);
    }

    sheet.addEventListener('close', () => {
      document.documentElement.classList.remove('pd-locked');
      sheet.remove();
      onClose(changed);
    });
    // Esc: animate out instead of disappearing instantly.
    sheet.addEventListener('cancel', (event) => { event.preventDefault(); dismiss(); });
    // A tap on the dimmed area outside the sheet closes it.
    sheet.addEventListener('click', (event) => {
      if (event.target !== sheet) return;
      const r = sheet.getBoundingClientRect();
      if (event.clientY < r.top || event.clientY > r.bottom || event.clientX < r.left || event.clientX > r.right) dismiss();
    });

    function show(newIndex) {
      index = newIndex;
      item = list[index];
      sheet.scrollTop = 0;
      render();
    }

    function confirmLetGo() {
      const dialog = document.createElement('dialog');
      dialog.className = 'pj-sheet';
      dialog.innerHTML = `<form method="dialog" class="pj-sheet-form"><h2>Let go of ${esc(item.name)}?</h2><p class="pj-sheet-hint">It will be removed from your wishlist. This can’t be undone.</p><p class="pj-sheet-error" role="alert"></p><div class="pj-sheet-actions"><button type="button" class="pj-sheet-cancel">Keep it</button><button type="submit" class="pd-letgo pd-confirm">Let it go</button></div></form>`;
      document.body.appendChild(dialog);
      const error = dialog.querySelector('.pj-sheet-error');
      dialog.querySelector('.pj-sheet-cancel').onclick = () => dialog.close();
      dialog.addEventListener('close', () => dialog.remove());
      dialog.addEventListener('click', (event) => { if (event.target === dialog) dialog.close(); });
      dialog.querySelector('form').onsubmit = async (event) => {
        event.preventDefault();
        const button = dialog.querySelector('[type="submit"]');
        button.disabled = true;
        try {
          await onDelete(item.id);
          changed = true;
          dialog.close();
          dismiss();
        } catch {
          error.textContent = 'Could not remove this item. Check your connection and try again.';
          button.disabled = false;
        }
      };
      dialog.showModal();
    }

    sheet.onclick = (event) => {
      const button = event.target.closest('button');
      if (!button || !sheet.contains(button)) return;
      switch (button.dataset.action) {
        case 'close': if (!suppressTap) dismiss(); break;
        case 'keep': dismiss(); break;
        case 'prev': if (index > 0) show(index - 1); break;
        case 'next': if (index < list.length - 1) show(index + 1); break;
        case 'tab': activeTab = button.dataset.tab; render(`#pd-tab-${activeTab}`); break;
        case 'edit': window.pinchItemSheets.edit(item, settings, async (id, patch) => { await save(patch); render('[data-action="edit"]'); }); break;
        case 'lock': window.pinchItemSheets.lock(item, async (id, patch) => { await save(patch); render('[data-action="lock"]'); }); break;
        case 'let-go': confirmLetGo(); break;
        case 'remove-note': {
          const removeAt = Number(button.dataset.index);
          save({ notes: (item.notes || []).filter((_, i) => i !== removeAt) }).then(() => render('#pd-note-text'))
            .catch(() => window.alert('Could not delete this note. Check your connection and try again.'));
          break;
        }
      }
    };

    // Arrow keys move between tabs, as tabs normally do.
    sheet.onkeydown = (event) => {
      if (!event.target.matches || !event.target.matches('[role="tab"]')) return;
      const order = TABS.map(([id]) => id);
      const step = event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0;
      if (!step) return;
      event.preventDefault();
      activeTab = order[(order.indexOf(activeTab) + step + order.length) % order.length];
      render(`#pd-tab-${activeTab}`);
    };

    sheet.onsubmit = async (event) => {
      if (event.target.dataset.form !== 'note') return;
      event.preventDefault();
      const form = event.target;
      const text = form.elements.note.value.trim();
      const error = form.querySelector('.pd-note-error');
      if (!text) { error.textContent = 'Write something first.'; return; }
      const button = form.querySelector('[type="submit"]');
      button.disabled = true;
      try {
        await save({ notes: [...(item.notes || []), { text, createdAt: new Date().toISOString() }] });
        render('#pd-note-text');
      } catch {
        error.textContent = 'Could not save your note. Check your connection and try again.';
        button.disabled = false;
      }
    };

    // Drag the top bar down to dismiss. A short drag snaps back.
    const bar = sheet.querySelector('.pd-bar');
    let drag = null;
    let suppressTap = false;
    bar.addEventListener('pointerdown', (event) => {
      if (event.button !== 0 || event.target.closest('.pd-arrow')) return;
      drag = { y: event.clientY, t: performance.now(), dy: 0, moved: false };
      try { bar.setPointerCapture(event.pointerId); } catch { /* keep tracking without capture */ }
    });
    bar.addEventListener('pointermove', (event) => {
      if (!drag) return;
      // Pointer moves are in window pixels; divide by the desktop phone frame's scale so the sheet follows the finger.
      drag.dy = Math.max(0, (event.clientY - drag.y) / (parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--device-scale')) || 1));
      if (drag.dy > 4) drag.moved = true;
      sheet.classList.add('is-dragging');
      sheet.style.translate = `0 ${drag.dy}px`;
    });
    const endDrag = () => {
      if (!drag) return;
      const { dy, t, moved } = drag;
      drag = null;
      sheet.classList.remove('is-dragging');
      if (!moved) { sheet.style.translate = ''; return; }
      // A real drag shouldn't also count as a tap on the handle.
      suppressTap = true;
      setTimeout(() => { suppressTap = false; }, 0);
      if (dy > DISMISS_DISTANCE || dy / (performance.now() - t) > DISMISS_VELOCITY) dismiss();
      else sheet.style.translate = '';
    };
    bar.addEventListener('pointerup', endDrag);
    bar.addEventListener('pointercancel', endDrag);

    render();
    document.documentElement.classList.add('pd-locked');
    sheet.showModal();
    sheet.querySelector('#pd-title').focus({ preventScroll: true });
  };
})();
