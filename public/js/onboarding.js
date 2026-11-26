(() => {
  const asset = (name) => `./assets/onboarding/${name}.svg`;
  const image = (name, x, y, extra = '') => `<img class="ob-art-asset ${extra}" src="${asset(name)}" alt="" style="left:${x}px;top:${y}px">`;
  const box = (name, x, y, w, h, extra = '') => `<span class="ob-shape ${name} ${extra}" style="left:${x}px;top:${y}px;width:${w}px;height:${h}px"></span>`;

  function artwork(step) {
    if (step === 0) return `
      ${image('line1',190.5,46.5)}${image('line2',181.5,66.5)}
      <div class="ob-purse">
        ${image('body-shadow',13,112)}${image('coin-top',70,6,'ob-rotate-14')}
        ${image('clasp',12,14)}${image('body',4,40)}
        ${image('coin-left',12.4,75.7,'ob-rotate-14')}${image('coin-bottom',38.65,93.7,'ob-rotate-small')}
      </div>
      ${image('falling1',141,132,'ob-fall1')}${image('falling2',154,-3,'ob-fall2')}${image('falling3',154,102,'ob-fall3')}`;
    if (step === 1) return `
      <div class="ob-purse">
        ${image('purse2',4.2,14.1)}${image('coin2',73,83,'ob-rotate-small')}
        ${image('coin-bottom2',38.65,93.7,'ob-rotate-small')}${image('coin-left2',12.4,75.7,'ob-rotate-14')}
      </div>
      ${box('ob-bubble',203,149,19,17)}${box('ob-bubble',185,112,37,28)}${box('ob-bubble',189,36,89,67.351)}
      ${image('star',210.5,62,'ob-star')}${image('spark',238.5,50.5,'ob-spark')}`;
    return `
      ${box('ob-ground',0,279,332,61)}${box('ob-map',98,45,208,152)}
      ${image('rect5',109,57)}${image('rect6',205.1,57)}${image('rect7',234.9,57,'ob-flip')}${image('rect8',237.9,89.7)}${image('rect9',265.1,57)}
      ${image('pin',159.5,95.5)}${image('pin',251.5,114.5)}${image('pin',205.5,79.5)}${image('vector12',164.75,83.66)}
      ${box('ob-grey',109,142,31,44)}${box('ob-purple',144,142,54,8)}${box('ob-purple',144,153,32,8)}
      ${image('vector13',-25,279)}${image('vector7',39,178)}${image('vector8',38.43,190.25)}${image('vector9',40,292.61)}${image('vector10',63.93,205.39)}${image('dot',115.79,218.36)}${image('dot',139.36,208.93)}${image('vector11',118.14,211.28)}
      ${image('vector18',218.89,163.12)}${box('ob-paper',228.2,161.3,60.73,76.23,'ob-tilt')}
      ${box('ob-purple',235.85,207.8,48.55,10.62,'ob-tilt')}${box('ob-purple',234.1,195.5,48.55,8.64,'ob-tilt')}${box('ob-purple',237.6,221.9,48.55,8.5,'ob-tilt')}
      ${image('vector17',272.8,179.2,'ob-tilt')}${image('vector15',246.8,177.4,'ob-tilt')}${image('vector14',237,170.9,'ob-tilt')}${image('vector16',253.5,171.4,'ob-tilt')}
      ${image('vector21',33,83.5)}${image('vector20',34.25,79.75,'ob-map-tilt')}${image('pin-small',62.45,83.05,'ob-map-tilt')}
      ${box('ob-grey',39,89.6,17,12,'ob-map-tilt')}${box('ob-grey',60,92.1,28,4,'ob-map-tilt')}${box('ob-grey',59.6,99.1,28,4,'ob-map-tilt')}`;
  }

  // The last step ("What does your wish list mean to you?") picks the categories that become the
  // home filters. Several can be picked; the current categories start selected.
  const OPTIONS = [['Essentials', 'purple'], ['Education', 'green'], ['Fashion', 'blue'], ['Pets', 'blue'], ['Travel', 'purple']];

  window.mountOnboarding = function mountOnboarding(root, onComplete, { categories = [] } = {}) {
    let step = 0;
    const current = new Map(categories.map((category) => [category.name.toLowerCase(), category]));
    const selected = new Set(OPTIONS.map(([name]) => name).filter((name) => current.has(name.toLowerCase())));
    const labels = ['A more mindful way of fulfilling your wishlist.', 'Its not about buying less,', 'What does your wish list mean to you?'];
    function render() {
      root.innerHTML = `<section class="ob-screen" aria-label="Onboarding">
        <header class="ob-header"><img src="${asset('logo')}" alt=""><span>Pinch</span></header>
        <div class="ob-content ${step === 2 ? 'ob-last' : ''}">
          <img class="ob-pagination" src="${asset(`page${step + 1}`)}" alt="Step ${step + 1} of 3">
          <div class="ob-card"><div class="ob-art ob-art-${step + 1}" aria-hidden="true"><div class="ob-art-canvas">${artwork(step)}</div></div>
            <h1>${labels[step]}</h1>${step === 1 ? '<p>Pause and consider how certain items make you feel, does it align with your current goals and aspirations?</p>' : step === 2 ? '<p>Pick all that apply.</p>' : ''}</div>
          ${step === 2 ? `<div class="ob-options" aria-label="Wishlist categories">${OPTIONS.map(([label], index) => `<button type="button" class="ob-option ob-option-${index}" data-value="${label}" aria-pressed="${selected.has(label)}">${label}</button>`).join('')}</div>` : ''}
          <div class="ob-actions">${step ? '<button class="ob-back" type="button" aria-label="Go back">Back</button>' : ''}<button class="ob-next" type="button">${step === 0 ? 'Start my journey' : step === 1 ? 'next' : 'Continue'}<img src="${asset('arrow')}" alt=""></button></div>
        </div></section>`;
      root.querySelector('.ob-next').addEventListener('click', () => {
        if (step === 2) {
          // Keep each picked category's existing colour (if the user changed it in settings).
          const picked = OPTIONS.filter(([name]) => selected.has(name)).map(([name, color]) => current.get(name.toLowerCase()) || { name, color });
          if (typeof onComplete === 'function') onComplete(picked);
        }
        else { step += 1; render(); }
      });
      const back = root.querySelector('.ob-back');
      if (back) back.addEventListener('click', () => { step -= 1; render(); });
      root.querySelectorAll('.ob-option').forEach((button) => button.addEventListener('click', () => {
        const value = button.dataset.value;
        if (selected.has(value)) selected.delete(value); else selected.add(value);
        button.setAttribute('aria-pressed', String(selected.has(value)));
      }));
    }
    render();
  };
})();
