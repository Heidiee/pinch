(() => {
  // Desktop preview frame (see css/device.css). Works out how much to shrink the phone so the whole
  // iPhone 18 Pro (434 × 905 pt) fits the window with its real proportions, and where its screen
  // ends up, so pop-ups and the item sheet can be placed on it. At full size nothing is scaled.
  const FRAME = window.matchMedia('(min-width: 700px) and (min-height: 480px)');
  const BODY_W = 434;
  const BODY_H = 905;
  const MARGIN = 24;
  const SCREEN_RADIUS = 62;
  const VARS = ['--device-scale', '--screen-left', '--screen-top', '--screen-right', '--screen-bottom', '--screen-r'];

  function fit() {
    const style = document.documentElement.style;
    if (!FRAME.matches) { VARS.forEach((name) => style.removeProperty(name)); return; }
    const scale = Math.min(1, (window.innerHeight - 2 * MARGIN) / BODY_H, (window.innerWidth - 2 * MARGIN) / BODY_W);
    style.setProperty('--device-scale', String(Math.round(scale * 10000) / 10000));
    const app = document.getElementById('app');
    if (!app) return;
    const r = app.getBoundingClientRect();
    style.setProperty('--screen-left', `${r.left}px`);
    style.setProperty('--screen-top', `${r.top}px`);
    style.setProperty('--screen-right', `${window.innerWidth - r.right}px`);
    style.setProperty('--screen-bottom', `${window.innerHeight - r.bottom}px`);
    style.setProperty('--screen-r', `${SCREEN_RADIUS * scale}px`);
  }

  window.addEventListener('resize', fit);
  FRAME.addEventListener('change', fit);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fit);
  else fit();
  window.pinchFitDevice = fit;
})();
