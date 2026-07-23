// Procedural "blueprint scene" illustrations that stand in for real job photos.
// Every pro/photo gets a deterministic scene from their trade + a seed string,
// so the same listing always renders the same art, but different photos of the
// same trade don't look identical.

function hashSeed(seed) {
  const s = String(seed || 'default');
  let h = 0;
  for (let i = 0; i < s.length; i += 1) {
    h = (Math.imul(h, 31) + s.charCodeAt(i)) >>> 0;
  }
  return h;
}

function clamp01(n) {
  return Math.max(0, Math.min(1, n));
}

// amt > 0 lightens toward white, amt < 0 darkens toward black.
function shadeHex(hex, amt) {
  const n = hex.replace('#', '');
  const num = parseInt(n.length === 3 ? n.split('').map((c) => c + c).join('') : n, 16);
  let r = (num >> 16) & 0xff;
  let g = (num >> 8) & 0xff;
  let b = num & 0xff;
  const t = amt > 0 ? 255 : 0;
  const p = clamp01(Math.abs(amt));
  r = Math.round(r + (t - r) * p);
  g = Math.round(g + (t - g) * p);
  b = Math.round(b + (t - b) * p);
  return `#${[r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('')}`;
}

function variantFor(seed) {
  const hash = hashSeed(seed);
  return {
    hash,
    rotation: [-6, -2, 3, 7][hash % 4],
    flip: ((hash >> 2) % 2) === 1,
    shadeStep: (((hash >> 4) % 5) - 2) * 0.05,
    code: String(10 + (hash % 90)),
  };
}

function iconGroup(trade, { x, y, size = 96, rotation = 0, flip = false, opacity = 0.9, color }) {
  const scale = size / 24;
  return `<g transform="translate(${x},${y}) rotate(${rotation}) scale(${flip ? -scale : scale},${scale}) translate(-12,-12)"
      fill="${color}" stroke="none" opacity="${opacity}">
    ${iconPathFor(trade)}
  </g>`;
}

function gridBackdrop(base) {
  const line = shadeHex(base, 0.3);
  let rows = '';
  for (let x = 0; x <= 400; x += 25) rows += `<line x1="${x}" y1="0" x2="${x}" y2="300"/>`;
  for (let y = 0; y <= 300; y += 25) rows += `<line x1="0" y1="${y}" x2="400" y2="${y}"/>`;
  return `<g stroke="${line}" stroke-width="1" opacity="0.5">${rows}</g>`;
}

function cornerTicks(color) {
  const mk = (x, y, dx, dy) => `<path d="M${x} ${y} l${dx} 0 M${x} ${y} l0 ${dy}"/>`;
  return `<g stroke="${color}" stroke-width="2" opacity="0.55" stroke-linecap="round">
    ${mk(14, 14, 16, 0)}${mk(14, 14, 0, 16)}
    ${mk(386, 14, -16, 0)}${mk(386, 14, 0, 16)}
    ${mk(14, 286, 16, 0)}${mk(14, 286, 0, -16)}
    ${mk(386, 286, -16, 0)}${mk(386, 286, 0, -16)}
  </g>`;
}

// ---------- scene body (400x300 local canvas) ----------
// One consistent layout for every trade: a big, unambiguous icon on a soft
// badge. Trying to depict a whole mini job-site scene per trade produced
// clutter that didn't read at thumbnail size, so the icon itself — already
// legible on its own — carries the recognition instead.

function sceneBody(trade, v, base, ink) {
  return `
    <circle cx="200" cy="150" r="92" fill="${shadeHex(base, 0.6)}" stroke="${ink}" stroke-width="3"/>
    ${iconGroup(trade, { x: 200, y: 150, size: 130, rotation: v.rotation, color: base, opacity: 0.95 })}
  `;
}

function sceneFor(trade, seed) {
  const v = variantFor(seed);
  const base = colorFor(trade);
  const ink = shadeHex(base, -0.28 + v.shadeStep);
  const bg = shadeHex(base, 0.86 + v.shadeStep * 0.3);
  return `
    <svg class="scene-illustration" viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice" role="img" aria-label="${escapeHtml(trade)} work">
      <rect width="400" height="300" fill="${bg}"/>
      ${gridBackdrop(base)}
      <g>${sceneBody(trade, v, base, ink)}</g>
      ${cornerTicks(base)}
      <text x="24" y="278" font-size="11" letter-spacing="1" fill="${ink}" opacity="0.65" style="font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;">NO. ${v.code} — ${trade.toUpperCase()}</text>
    </svg>
  `;
}

function avatarPatternDataUri(trade, seed) {
  const v = variantFor(seed);
  const base = colorFor(trade);
  const dark = shadeHex(base, -0.32);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
    <rect width="100" height="100" fill="${dark}"/>
    <rect width="100" height="100" fill="${base}" opacity="0.5"/>
    ${iconGroup(trade, { x: 50, y: 50, size: 90, rotation: v.rotation, flip: v.flip, color: '#ffffff', opacity: 0.22, strokeWidth: 2.4 })}
  </svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}
