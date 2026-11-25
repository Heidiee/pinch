(() => {
  // Wishlist calendar card: week strip or month grid, paging, today, and a list of what happens on the selected day.
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
    // `cursor` decides which week/month is on screen; `selected` is the day the user picked (black square).
    // Paging only moves the cursor, so a date number never turns black just because the period changed.
    let cursor = today;
    let selected = today;
    let focusDay = false;

    const periodStart = () => (view === 'week' ? mondayOf(cursor) : new Date(cursor.getFullYear(), cursor.getMonth(), 1));
    const inPeriod = (date) => (view === 'week'
      ? sameDay(mondayOf(date), periodStart())
      : date.getFullYear() === cursor.getFullYear() && date.getMonth() === cursor.getMonth());
    const showingToday = () => inPeriod(today);
    // When the period changes, keep the picked day only if it is still on screen; otherwise fall back to today if visible.
    const settleSelection = () => {
      if (selected && inPeriod(selected)) return;
      selected = inPeriod(today) ? today : null;
    };

    function periodLabel() {
      const start = periodStart();
      if (view === 'month') return start.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
      const end = addDays(start, 6);
      const sameMonth = start.getMonth() === end.getMonth();
      const left = start.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
      const right = end.toLocaleDateString(undefined, sameMonth ? { day: 'numeric' } : { month: 'short', day: 'numeric' });
      return `${left} – ${right}, ${end.getFullYear()}`;
    }

    function dayButton(date, outside) {
      // Days from the neighbouring months stay blank, as in the design.
      if (outside) return '<span class="pj-cal-day is-outside" aria-hidden="true"></span>';
      const key = keyOf(date);
      const event = events.get(key);
      const isToday = sameDay(date, today);
      const isSelected = Boolean(selected) && sameDay(date, selected);
      const parts = [date.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })];
      if (isToday) parts.push('today');
      const unlocked = date <= today; // the unlock day has arrived
      if (event && event.unlocks.length) parts.push(`${event.unlocks.length} ${unlocked ? 'unlocked' : 'unlocking'}`);
      if (event && event.added.length) parts.push(`${event.added.length} added`);
      const cls = ['pj-cal-day', isToday && 'is-today', isSelected && 'is-selected',
        event && event.unlocks.length && 'has-unlock', event && event.added.length && 'has-added'].filter(Boolean).join(' ');
      // Unlock days carry a lock: closed until the day arrives, open from then on.
      // Olive on white; light on the black selected square.
      const lockIcon = (unlocked ? 'month-lock-open' : 'month-lock') + (isSelected ? (unlocked ? '-light' : '') : (unlocked ? '' : '-olive'));
      const marker = event && event.unlocks.length ? `<img src="${asset(lockIcon)}" alt="">` : '';
      return `<button type="button" class="${cls}" data-cal="day" data-date="${key}" aria-pressed="${isSelected}" aria-label="${esc(parts.join(', '))}" tabindex="${isSelected || (!selected && date.getDate() === periodStart().getDate()) ? 0 : -1}"><span>${date.getDate()}</span>${marker}</button>`;
    }

    function grid() {
      const start = periodStart();
      if (view === 'week') return Array.from({ length: 7 }, (_, i) => dayButton(addDays(start, i), false)).join('');
      const first = mondayOf(start);
      const last = addDays(mondayOf(new Date(start.getFullYear(), start.getMonth() + 1, 0)), 6);
      const days = [];
      for (let d = first; d <= last; d = addDays(d, 1)) days.push(dayButton(d, d.getMonth() !== start.getMonth()));
      return days.join('');
    }

    function agenda() {
      if (!selected) return '<p class="pj-cal-empty">Tap a day to see what locks or unlocks.</p>';
      const event = events.get(keyOf(selected));
      const title = sameDay(selected, today) ? 'Today' : selected.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' });
      const row = (item, kind) => `<li><button type="button" class="pj-cal-entry is-${kind}" data-cal="open" data-id="${esc(item.id)}"><img src="${asset(kind === 'unlock' ? (selected <= today ? 'month-lock-open' : 'month-lock-olive') : 'lock')}" alt=""><span><strong>${esc(item.name)}</strong> ${kind === 'unlock' ? (selected <= today ? 'unlocked' : 'unlocks') : 'was added and locked'}</span><span class="pj-cal-chevron" aria-hidden="true">›</span></button></li>`;
      const rows = event ? [...event.unlocks.map((item) => row(item, 'unlock')), ...event.added.map((item) => row(item, 'added'))] : [];
      return `<p class="pj-cal-agenda-title">${esc(title)}</p>${rows.length ? `<ul class="pj-cal-list">${rows.join('')}</ul>` : '<p class="pj-cal-empty">Nothing locks or unlocks on this day.</p>'}`;
    }

    function render() {
      const monthView = view === 'month';
      card.innerHTML = `<div class="pj-card-heading"><h2>Calendar</h2><div class="pj-calendar-icons" role="group" aria-label="Calendar view">
          <button type="button" class="pj-calendar-toggle" data-cal="view" data-view="month" aria-label="Month view" aria-pressed="${monthView}"><img src="${asset(monthView ? 'calendar-today' : 'calendar-month')}" alt=""></button>
          <button type="button" class="pj-calendar-toggle" data-cal="view" data-view="week" aria-label="Week view" aria-pressed="${!monthView}"><img src="${asset(monthView ? 'calendar-month' : 'calendar-today')}" alt=""></button></div></div>
        <p>${esc(nextUnlockMessage(items, today))}</p>
        <div class="pj-cal-nav"><button type="button" class="pj-cal-arrow" data-cal="prev" aria-label="Previous ${view}">‹</button>
          <p class="pj-cal-period" aria-live="polite">${esc(periodLabel())}</p>
          ${showingToday() ? '' : '<button type="button" class="pj-cal-today" data-cal="today">Today</button>'}
          <button type="button" class="pj-cal-arrow" data-cal="next" aria-label="Next ${view}">›</button></div>
        <div class="pj-cal-grid is-${view}" aria-label="${esc(periodLabel())}">${WEEKDAYS.map((d) => `<span class="pj-cal-weekday" aria-hidden="true">${d}</span>`).join('')}${grid()}</div>
        <div class="pj-cal-agenda" aria-live="polite">${agenda()}</div>`;
      if (focusDay) {
        const target = card.querySelector('.pj-cal-day.is-selected') || card.querySelector('.pj-cal-day[tabindex="0"]');
        if (target) target.focus({ preventScroll: true });
        focusDay = false;
      }
    }

    function shift(direction) {
      cursor = view === 'week' ? addDays(periodStart(), 7 * direction) : new Date(cursor.getFullYear(), cursor.getMonth() + direction, 1);
      settleSelection();
      render();
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
        case 'view': view = button.dataset.view; if (selected) cursor = selected; settleSelection(); render(); break;
        case 'prev': shift(-1); break;
        case 'next': shift(1); break;
        case 'today': cursor = today; selected = today; render(); break;
        case 'day': select(fromKey(button.dataset.date)); break;
        case 'open': onOpen(button.dataset.id); break;
      }
    });

    // Arrow keys move the selected day (and page the calendar when needed); Home/End jump within the week.
    card.addEventListener('keydown', (event) => {
      if (!event.target.matches('.pj-cal-day')) return;
      const from = selected || fromKey(event.target.dataset.date);
      const moves = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 };
      let next;
      if (event.key in moves) next = addDays(from, moves[event.key]);
      else if (event.key === 'Home') next = mondayOf(from);
      else if (event.key === 'End') next = addDays(mondayOf(from), 6);
      else return;
      event.preventDefault();
      select(next);
    });

    render();
  };

  window.pinchNextUnlockMessage = (items) => nextUnlockMessage(items, startOfDay(new Date()));
})();
