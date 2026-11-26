(() => {
  // Full-screen celebration popups with the animated Pinch purse:
  //   bought – "Congratulations! You earned it" when an item is marked as bought (Figma 313:3166)
  //   saved  – "Congratulations, You're saving!" when an item is deleted (Figma 308:5391)
  // Each purse keeps its Figma layer structure, using the shared assets in assets/purse/, so the Figma
  // animation in css/purse-popup.css can be copied layer for layer: a 2s loop that repeats while it's up.
  const A = './assets/purse';
  const coinTop = `<div class="pb-coin-top"><img src="${A}/coin-top.svg" alt=""></div>`;
  const coinBottom = `<div class="pb-coin-bottom"><img src="${A}/coin-bottom.svg" alt=""></div>`;
  const coin = `<div class="pb-coin"><div><img src="${A}/coin-fly.svg" alt=""></div></div>`;
  const clasp = '<div class="pb-clasp"></div>';
  const body = `<img class="pb-body" src="${A}/body.svg" alt="">`;
  const smile = `<div class="pb-smile"><div><img src="${A}/smile.svg" alt=""></div></div>`;
  const eyes = '<div class="pb-eye pb-eye-right"></div><div class="pb-eye pb-eye-left"></div>';

  const VARIANTS = {
    bought: {
      label: 'Item bought',
      text: 'Congratulations!<br>You earned it',
      purse: `${coinTop}<div class="pb-cutout">${clasp}${body}${smile}</div>${coinBottom}${eyes}${coin}
        <div class="pb-blush pb-blush-right"><div></div></div><div class="pb-blush pb-blush-left"><div></div></div>`
    },
    saved: {
      label: 'Item removed',
      text: 'Congratulations,<br>You’re saving!',
      purse: `${coinTop}<div class="pb-cutout">${clasp}${body}${smile}${eyes}</div>${coin}${coinBottom}`
    }
  };

  const HOLD_MS = 5000; // how long the popup stays before closing itself
  const LEAVE_MS = 410; // matches the slide-out in css/purse-popup.css

  function pursePopup(kind) {
    const variant = VARIANTS[kind];
    document.querySelector('.pb-pop')?.remove();
    const dialog = document.createElement('dialog');
    dialog.className = `pj-sheet pb-pop pb-pop--${kind}`;
    dialog.setAttribute('aria-label', variant.label);
    dialog.innerHTML = `<div class="pb-panel"><div class="pb-art"><div class="pb-purse" aria-hidden="true">${variant.purse}</div></div><p class="pb-text" role="status">${variant.text}</p></div>`;
    document.body.append(dialog);
    let timer = 0;
    const close = () => {
      clearTimeout(timer);
      if (!dialog.isConnected || dialog.classList.contains('is-leaving')) return;
      dialog.classList.add('is-leaving');
      setTimeout(() => dialog.remove(), LEAVE_MS);
    };
    dialog.addEventListener('click', close);
    dialog.addEventListener('cancel', (event) => { event.preventDefault(); close(); });
    dialog.showModal();
    timer = setTimeout(close, HOLD_MS);
    return dialog;
  }

  window.pinchBoughtPopup = () => pursePopup('bought');
  window.pinchSavedPopup = () => pursePopup('saved');
})();
