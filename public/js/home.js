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
  const thumb = isPlaceholder(pro.cover_photo)
    ? photoTileHTML(pro.trade)
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

  pros.forEach((pro) => gridEl.appendChild(renderCard(pro)));
}

searchInput.addEventListener('input', () => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(loadPros, 250);
});

loadTrades().then(loadPros);
