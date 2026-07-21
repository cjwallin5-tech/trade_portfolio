const chipsEl = document.getElementById('trade-chips');
const gridEl = document.getElementById('pro-grid');
const countEl = document.getElementById('result-count');
const searchInput = document.getElementById('search-input');

let activeTrade = '';
let searchTimer = null;

async function loadTrades() {
  const trades = await apiGet('/api/trades');
  trades.forEach((trade) => {
    const chip = document.createElement('span');
    chip.className = 'chip';
    chip.dataset.trade = trade;
    chip.innerHTML = `${iconFor(trade)}<span>${escapeHtml(trade)}</span>`;
    chip.addEventListener('click', () => {
      activeTrade = trade;
      refreshActiveChip();
      loadPros();
    });
    chipsEl.appendChild(chip);
  });
}

function refreshActiveChip() {
  chipsEl.querySelectorAll('.chip').forEach((chip) => {
    chip.classList.toggle('active', chip.dataset.trade === activeTrade);
  });
}

chipsEl.querySelector('.chip[data-trade=""]').addEventListener('click', () => {
  activeTrade = '';
  refreshActiveChip();
  loadPros();
});

function renderCard(pro) {
  const a = document.createElement('a');
  a.className = 'pro-card';
  a.href = `/pro.html?id=${pro.id}`;
  a.style.setProperty('--card-accent', colorFor(pro.trade));
  const thumb = isPlaceholder(pro.cover_photo)
    ? photoTileHTML(pro.trade, seedFromPlaceholder(pro.cover_photo))
    : `<img src="${escapeHtml(pro.cover_photo)}" alt="Work by ${escapeHtml(pro.name)}">`;
  a.innerHTML = `
    <div class="thumb">${thumb}</div>
    <div class="body">
      <div class="trade-tag">${iconFor(pro.trade)}<span>${escapeHtml(pro.trade)}</span></div>
      <h3>${escapeHtml(pro.name)}</h3>
      <div class="loc">${escapeHtml(pro.location)} · ${pro.years_experience || 0} yrs in business</div>
      <p class="tagline">${escapeHtml(pro.tagline || '')}</p>
    </div>
  `;
  return a;
}

async function loadPros() {
  const params = new URLSearchParams();
  if (activeTrade) params.set('trade', activeTrade);
  const q = searchInput.value.trim();
  if (q) params.set('q', q);

  gridEl.innerHTML = '';
  const pros = await apiGet(`/api/pros?${params.toString()}`);

  countEl.textContent = pros.length === 1 ? '1 listed' : `${pros.length} listed`;

  if (pros.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'empty-state';
    empty.style.gridColumn = '1 / -1';
    empty.textContent = "Nobody matches that search yet. Try a different trade or clear the search.";
    gridEl.appendChild(empty);
    return;
  }

  pros.forEach((pro, i) => {
    const card = renderCard(pro);
    card.style.setProperty('--i', i);
    gridEl.appendChild(card);
  });
}

const HERO_SLOTS = [
  { top: '0%', left: '2%', rotate: -6, z: 2 },
  { top: '10%', left: '46%', rotate: 4, z: 3 },
  { top: '52%', left: '0%', rotate: 3, z: 1 },
  { top: '42%', left: '50%', rotate: -4, z: 4 },
];

async function loadHeroVisual() {
  const heroEl = document.getElementById('hero-visual');
  if (!heroEl) return;
  try {
    const pros = await apiGet('/api/pros');
    const picks = pros.slice(0, HERO_SLOTS.length);
    picks.forEach((pro, i) => {
      const slot = HERO_SLOTS[i];
      const card = document.createElement('div');
      card.className = 'hero-photo';
      card.style.top = slot.top;
      card.style.left = slot.left;
      card.style.zIndex = slot.z;
      card.style.transform = `rotate(${slot.rotate}deg)`;
      const thumb = isPlaceholder(pro.cover_photo)
        ? photoTileHTML(pro.trade, seedFromPlaceholder(pro.cover_photo))
        : `<img src="${escapeHtml(pro.cover_photo)}" alt="">`;
      card.innerHTML = `
        <div class="thumb">${thumb}</div>
        <div class="cap">${iconFor(pro.trade)}<span>${escapeHtml(pro.name)} · ${escapeHtml(pro.location)}</span></div>
      `;
      heroEl.appendChild(card);
    });
  } catch (err) {
    /* hero visual is decorative; fail silently */
  }
}

searchInput.addEventListener('input', () => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(loadPros, 250);
});

loadTrades().then(loadPros);
loadHeroVisual();
