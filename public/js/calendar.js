(() => {
  // Wishlist calendar card: a sideways-scrolling week strip or a month grid, today, and a list of what happens on the selected day.
  // Marks the day each item was added and the day it unlocks.
  const asset = (name) => `./assets/journey/${name}.svg`;
  const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const addDays = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
  const sameDay = (a, b) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  const keyOf = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const fromKey = (key) => { const [y, m, d] = key.split('-').map(Number); return new Date(y, m - 1, d); };
  const mondayOf = (d) => addDays(startOfDay(d), -((d.getDay() + 6) % 7));
  const ordinal = (n) => `${n}${n % 100 >= 11 && n % 100 <= 13 ? 'th' : ({ 1: 'st', 2: 'nd', 3: 'rd' }[n % 10] || 'th')}`;

  // Map of YYYY-MM-DD -> { added: [items], unlocks: [items] }.
  function eventsFor(items) {
    const events = new Map();
    const at = (date) => {
      const key = keyOf(date);
      if (!events.has(key)) events.set(key, { added: [], unlocks: [] });
      return events.get(key);
    };
    items.forEach((item) => {
      const added = typeof item.createdAt === 'string' ? new Date(item.createdAt) : null;
      if (added && Number.isFinite(added.getTime())) at(added).added.push(item);
      const unlock = window.pinchUnlockDate ? window.pinchUnlockDate(item) : null;
      if (unlock) at(unlock).unlocks.push(item);
    });
    return events;
  }

  function nextUnlockMessage(items, today) {
    const next = items.map((item) => (window.pinchUnlockDate ? window.pinchUnlockDate(item) : null))
      .filter((date) => date && date >= today).sort((a, b) => a - b)[0];
    if (!next) return items.length ? 'Nothing is waiting to unlock right now.' : 'Your upcoming unlocks will appear here.';
    if (sameDay(next, today)) return 'An item unlocks today, congratulations!';
    return `Your next item unlocks on the ${ordinal(next.getDate())} of ${next.toLocaleDateString(undefined, { month: 'long' })}, congratulations!`;
  }

  window.pinchCalendar = function pinchCalendar(card, { items = [], onOpen = () => {} } = {}) {
    const today = startOfDay(new Date());
    const events = eventsFor(items);
    let view = 'week';
    // Month view: `cursor` decides which month is on screen; paging only moves the cursor, so a date
    // number never turns black just because the month changed. `selected` is the day the user picked.
    let cursor = today;
    let selected = today;
    let focusDay = false;
    let centerOn = today;   // week strip: day to scroll into the middle after the next render
    let stripScroll = null; // week strip: scroll position to keep across re-renders

    // The week strip scrolls sideways over a long run of days: from a few weeks back to half a year
    // ahead, stretched to include every add and unlock date.
    const eventDates = [...events.keys()].map(fromKey);
    const stripStart = mondayOf(new Date(Math.min(addDays(today, -28), ...eventDates.map((d) => addDays(d, -7)))));
    const stripEnd = new Date(Math.max(addDays(today, 182), ...eventDates.map((d) => addDays(d, 7))));

    const monthStart = () => new Date(cursor.getFullYear(), cursor.getMonth(), 1);
    const inMonth = (date) => date.getFullYear() === cursor.getFullYear() && date.getMonth() === cursor.getMonth();
    const settleSelection = () => {
      if (selected && inMonth(selected)) return;
      selected = inMonth(today) ? today : null;
    };

    function dayInfo(date) {
      const key = keyOf(date);
      const event = events.get(key);
      const isToday = sameDay(date, today);
      const isSelected = Boolean(selected) && sameDay(date, selected);
      const unlocked = date <= today; // the unlock day has arrived
      const parts = [date.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })];
      if (isToday) parts.push('today');
      if (event && event.unlocks.length) parts.push(`${event.unlocks.length} ${unlocked ? 'unlocked' : 'unlocking'}`);
      if (event && event.added.length) parts.push(`${event.added.length} added`);
      const cls = [isToday && 'is-today', isSelected && 'is-selected', event && event.unlocks.length && 'has-unlock',
        event && event.added.length && 'has-added'].filter(Boolean).join(' ');
      // Unlock days carry a lock: closed until the day arrives, open from then on.
      // Olive on light backgrounds; light on the black selected square.
      const lockIcon = (unlocked ? 'month-lock-open' : 'month-lock') + (isSelected ? (unlocked ? '-light' : '') : (unlocked ? '' : '-olive'));
      const marker = event && event.unlocks.length ? `<img src="${asset(lockIcon)}" alt="">` : '';
      return { key, isSelected, cls, marker, label: esc(parts.join(', ')) };
    }

    // Month grid day (Figma 35:6405): plain number, black square when chosen.
    function monthDay(date, outside) {
      if (outside) return '<span class="pj-cal-day is-outside" aria-hidden="true"></span>';
      const d = dayInfo(date);
      const tab = d.isSelected || (!selected && date.getDate() === 1) ? 0 : -1;
      return `<button type="button" class="pj-cal-day ${d.cls}" data-cal="day" data-date="${d.key}" aria-pressed="${d.isSelected}" aria-label="${d.label}" tabindex="${tab}"><span>${date.getDate()}</span>${d.marker}</button>`;
    }

    // Week strip day (Figma 284:4313): weekday label above a grey rounded box.
    function stripDay(date) {
      const d = dayInfo(date);
      const tab = d.isSelected || (!selected && sameDay(date, today)) ? 0 : -1;
      return `<button type="button" class="pj-cal-cell ${d.cls}" data-cal="day" data-date="${d.key}" aria-pressed="${d.isSelected}" aria-label="${d.label}" tabindex="${tab}"><span class="pj-cal-wd" aria-hidden="true">${WEEKDAYS[(date.getDay() + 6) % 7]}</span><span class="pj-cal-box"><span>${date.getDate()}</span>${d.marker}</span></button>`;
    }

    function monthGrid() {
      const start = monthStart();
      const first = mondayOf(start);
      const last = addDays(mondayOf(new Date(start.getFullYear(), start.getMonth() + 1, 0)), 6);
      const days = [];
      for (let d = first; d <= last; d = addDays(d, 1)) days.push(monthDay(d, d.getMonth() !== start.getMonth()));
      return `<div class="pj-cal-grid" aria-label="${esc(start.toLocaleDateString(undefined, { month: 'long', year: 'numeric' }))}">${WEEKDAYS.map((w) => `<span class="pj-cal-weekday" aria-hidden="true">${w}</span>`).join('')}${days.join('')}</div>`;
    }

    function weekStrip() {
      const days = [];
      for (let d = stripStart; d <= stripEnd; d = addDays(d, 1)) days.push(stripDay(d));
      return `<div class="pj-cal-strip" role="group" aria-label="Days, scroll sideways for more">${days.join('')}</div>`;
    }

    function agenda() {
      if (!selected) return '<p class="pj-cal-empty">Tap a day to see what locks or unlocks.</p>';
      const event = events.get(keyOf(selected));
      const title = sameDay(selected, today) ? 'Today' : selected.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' });
      const row = (item, kind) => `<li><button type="button" class="pj-cal-entry is-${kind}" data-cal="open" data-id="${esc(item.id)}"><img src="${asset(kind === 'unlock' ? (selected <= today ? 'month-lock-open' : 'month-lock-olive') : 'month-lock-grey')}" alt=""><span><strong>${esc(item.name)}</strong> ${kind === 'unlock' ? (selected <= today ? 'unlocked' : 'unlocks') : 'was added and locked'}</span><span class="pj-cal-chevron" aria-hidden="true">›</span></button></li>`;
      const rows = event ? [...event.unlocks.map((item) => row(item, 'unlock')), ...event.added.map((item) => row(item, 'added'))] : [];
      return `<p class="pj-cal-agenda-title">${esc(title)}</p>${rows.length ? `<ul class="pj-cal-list">${rows.join('')}</ul>` : '<p class="pj-cal-empty">Nothing locks or unlocks on this day.</p>'}`;
    }

    // Big month name with the year underneath; arrows only in month view, the strip scrolls instead.
    function header(date, showToday) {
      const arrows = view === 'month'
        ? '<button type="button" class="pj-cal-arrow" data-cal="prev" aria-label="Previous month">‹</button><button type="button" class="pj-cal-arrow" data-cal="next" aria-label="Next month">›</button>'
        : '';
      return `<div class="pj-cal-head"><div class="pj-cal-title" aria-live="polite"><p class="pj-cal-month">${esc(date.toLocaleDateString(undefined, { month: 'long' }))}</p><p class="pj-cal-year">${date.getFullYear()}</p></div>
        <div class="pj-cal-controls"><button type="button" class="pj-cal-today" data-cal="today"${showToday ? '' : ' hidden'}>Today</button>${arrows}</div></div>`;
    }

    function render() {
      const monthView = view === 'month';
      // Read the strip's position straight from the page before replacing it.
      const oldStrip = card.querySelector('.pj-cal-strip');
      if (oldStrip) stripScroll = oldStrip.scrollLeft;
      card.innerHTML = `<div class="pj-card-heading"><h2>Calendar</h2><div class="pj-calendar-icons" role="group" aria-label="Calendar view">
          <button type="button" class="pj-calendar-toggle" data-cal="view" data-view="month" aria-label="Month view" aria-pressed="${monthView}"><img src="${asset(monthView ? 'calendar-today' : 'calendar-month')}" alt=""></button>
          <button type="button" class="pj-calendar-toggle" data-cal="view" data-view="week" aria-label="Week view" aria-pressed="${!monthView}"><img src="${asset(monthView ? 'calendar-month' : 'calendar-today')}" alt=""></button></div></div>
        <p>${esc(nextUnlockMessage(items, today))}</p>
        <hr class="pj-cal-rule">
        ${monthView ? header(monthStart(), !inMonth(today)) + monthGrid() : header(centerOn || selected || today, false) + weekStrip()}
        <div class="pj-cal-agenda" aria-live="polite">${agenda()}</div>`;
      if (!monthView) placeStrip();
      if (focusDay) {
        const target = card.querySelector('[data-cal="day"].is-selected') || card.querySelector('[data-cal="day"][tabindex="0"]');
        if (target) target.focus({ preventScroll: true });
        focusDay = false;
      }
    }

    // Week strip: keep the scroll position, or centre a day, then keep the title in step with scrolling.
    function placeStrip() {
      const strip = card.querySelector('.pj-cal-strip');
      if (centerOn) {
        const cell = strip.querySelector(`[data-date="${keyOf(centerOn)}"]`);
        if (cell) strip.scrollLeft = cell.offsetLeft - (strip.clientWidth - cell.offsetWidth) / 2;
        centerOn = null;
      } else if (stripScroll !== null) {
        strip.scrollLeft = stripScroll;
      }
      syncStripHeader(strip);
      // Update the month and year on every scroll step, not on a later frame, so they never lag.
      strip.addEventListener('scroll', () => syncStripHeader(strip), { passive: true });
      enableMouseScrolling(strip);
    }

    // Desktop: a normal (vertical) mouse wheel scrolls the dates sideways while the pointer is over
    // them, and the strip can be dragged with the mouse. Touch and trackpads scroll natively.
    function enableMouseScrolling(strip) {
      strip.addEventListener('wheel', (event) => {
        if (event.ctrlKey || Math.abs(event.deltaX) >= Math.abs(event.deltaY)) return; // pinch-zoom or a sideways trackpad swipe
        const max = strip.scrollWidth - strip.clientWidth;
        const atEdge = (event.deltaY < 0 && strip.scrollLeft <= 0) || (event.deltaY > 0 && strip.scrollLeft >= max - 1);
        if (atEdge) return; // let the page scroll on past the ends
        event.preventDefault();
        const step = event.deltaMode === 1 ? event.deltaY * 16 : event.deltaMode === 2 ? event.deltaY * strip.clientWidth : event.deltaY;
        strip.scrollLeft += step;
      }, { passive: false });

      let drag = null;
      let ignoreClicksUntil = 0;
      strip.addEventListener('click', (event) => {
        if (Date.now() < ignoreClicksUntil) { event.stopPropagation(); event.preventDefault(); }
      }, { capture: true });
      strip.addEventListener('pointerdown', (event) => {
        if (event.pointerType !== 'mouse' || event.button !== 0) return;
        drag = { x: event.clientX, left: strip.scrollLeft, moved: false, id: event.pointerId };
      });
      strip.addEventListener('pointermove', (event) => {
        if (!drag) return;
        const dx = event.clientX - drag.x;
        if (!drag.moved && Math.abs(dx) < 5) return;
        if (!drag.moved) {
          drag.moved = true;
          strip.classList.add('is-dragging'); // no snapping while the mouse holds it
          try { strip.setPointerCapture(drag.id); } catch { /* still works without capture */ }
        }
        strip.scrollLeft = drag.left - dx;
      });
      const endDrag = () => {
        if (!drag) return;
        if (drag.moved) {
          // A drag shouldn't also count as a click on the day under the pointer.
          ignoreClicksUntil = Date.now() + 80;
          setTimeout(() => strip.classList.remove('is-dragging'), 0);
        }
        drag = null;
      };
      strip.addEventListener('pointerup', endDrag);
      strip.addEventListener('pointercancel', endDrag);
    }

    function syncStripHeader(strip) {
      if (view !== 'week' || !strip.isConnected) return;
      // Days are evenly spaced, so the one in the middle can be worked out from the scroll position.
      const cells = strip.children;
      const pitch = cells.length > 1 ? cells[1].offsetLeft - cells[0].offsetLeft : 55;
      const middle = strip.scrollLeft + strip.clientWidth / 2 - cells[0].offsetLeft;
      const index = Math.max(0, Math.min(cells.length - 1, Math.floor(middle / pitch)));
      const date = fromKey(cells[index].dataset.date);
      const month = date.toLocaleDateString(undefined, { month: 'long' });
      const monthEl = card.querySelector('.pj-cal-month');
      const yearEl = card.querySelector('.pj-cal-year');
      if (monthEl.textContent !== month) monthEl.textContent = month;
      if (yearEl.textContent !== String(date.getFullYear())) yearEl.textContent = String(date.getFullYear());
      // Only fade an edge while there are more days beyond it.
      strip.classList.toggle('at-start', strip.scrollLeft <= 1);
      strip.classList.toggle('at-end', strip.scrollLeft >= strip.scrollWidth - strip.clientWidth - 1);
      const todayCell = strip.querySelector('.is-today');
      const visible = todayCell && todayCell.offsetLeft + todayCell.offsetWidth > strip.scrollLeft && todayCell.offsetLeft < strip.scrollLeft + strip.clientWidth;
      card.querySelector('.pj-cal-today').hidden = Boolean(visible);
    }

    function select(date) {
      selected = date;
      cursor = date;
      focusDay = true;
      render();
    }

    card.addEventListener('click', (event) => {
      const button = event.target.closest('[data-cal]');
      if (!button || !card.contains(button)) return;
      switch (button.dataset.cal) {
        case 'view':
          if (button.dataset.view === view) return;
          view = button.dataset.view;
          if (view === 'month') { cursor = selected || cursor; settleSelection(); } else { if (!selected) selected = today; centerOn = selected; }
          render();
          break;
        case 'prev': cursor = new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1); settleSelection(); render(); break;
        case 'next': cursor = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1); settleSelection(); render(); break;
        case 'today': cursor = today; selected = today; centerOn = today; render(); break;
        case 'day': select(fromKey(button.dataset.date)); break;
        case 'open': onOpen(button.dataset.id); break;
      }
    });

    // Arrow keys move the selected day. In the strip, left/right move a day and keep it in view;
    // in the month grid, up/down move a week and the month follows.
    card.addEventListener('keydown', (event) => {
      if (!event.target.matches('[data-cal="day"]')) return;
      const from = selected || fromKey(event.target.dataset.date);
      const moves = view === 'week' ? { ArrowLeft: -1, ArrowRight: 1 } : { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 };
      let next;
      if (event.key in moves) next = addDays(from, moves[event.key]);
      else if (event.key === 'Home') next = mondayOf(from);
      else if (event.key === 'End') next = addDays(mondayOf(from), 6);
      else return;
      if (view === 'week' && (next < stripStart || next > stripEnd)) return;
      event.preventDefault();
      if (view === 'week') centerOn = next;
      select(next);
    });

    render();
  };

  window.pinchNextUnlockMessage = (items) => nextUnlockMessage(items, startOfDay(new Date()));
})();
