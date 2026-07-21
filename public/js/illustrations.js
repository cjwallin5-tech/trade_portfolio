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
    rotation: [-7, -2, 4, 8][hash % 4],
    flip: ((hash >> 2) % 2) === 1,
    shadeStep: (((hash >> 4) % 5) - 2) * 0.05,
    phase: (hash >> 6) % 3,
    code: String(10 + (hash % 90)),
  };
}

function iconGroup(trade, { x, y, size = 96, rotation = 0, flip = false, opacity = 0.9, color, strokeWidth = 1.6 }) {
  const scale = size / 24;
  return `<g transform="translate(${x},${y}) rotate(${rotation}) scale(${flip ? -scale : scale},${scale}) translate(-12,-12)"
      fill="none" stroke="${color}" stroke-width="${(strokeWidth / scale).toFixed(2)}" stroke-linecap="round" stroke-linejoin="round" opacity="${opacity}">
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

// ---------- per-trade scene bodies (400x300 local canvas) ----------

function sceneElectrical(v, base, ink) {
  const switches = [];
  for (let row = 0; row < 3; row += 1) {
    for (let col = 0; col < 2; col += 1) {
      const sx = 168 + col * 34;
      const sy = 96 + row * 42;
      const on = (row + col + v.phase) % 2 === 0;
      switches.push(`<rect x="${sx}" y="${sy}" width="22" height="30" rx="2" fill="none" stroke="${ink}" stroke-width="2"/>
        <line x1="${sx + 11}" y1="${sy + (on ? 6 : 24)}" x2="${sx + 11}" y2="${sy + (on ? 24 : 6)}" stroke="${ink}" stroke-width="2" stroke-linecap="round"/>`);
    }
  }
  const wires = [80, 110, 320, 350]
    .map((wx, i) => `<path d="M${wx} 60 L${wx} ${230 - i * 4}" stroke="${ink}" stroke-width="2" fill="none" stroke-dasharray="1 9" stroke-linecap="round" opacity="0.6"/>`)
    .join('');
  return `
    <rect x="150" y="70" width="100" height="160" rx="4" fill="${shadeHex(base, 0.7)}" stroke="${ink}" stroke-width="3"/>
    <line x1="150" y1="86" x2="250" y2="86" stroke="${ink}" stroke-width="2"/>
    ${switches.join('')}
    ${wires}
    ${iconGroup('Electrical', { x: 90, y: 220, size: 60, rotation: v.rotation, flip: v.flip, color: base, opacity: 0.85 })}
  `;
}

function scenePlumbing(v, base, ink) {
  const pipeY = [128, 176];
  const pipes = pipeY
    .map((y) => `<rect x="40" y="${y}" width="320" height="16" rx="8" fill="${shadeHex(base, 0.55)}" stroke="${ink}" stroke-width="2.5"/>`)
    .join('');
  const valveX = 210 + v.phase * 10;
  return `
    ${pipes}
    <rect x="${valveX - 8}" y="${pipeY[0] + 14}" width="16" height="${pipeY[1] - pipeY[0] - 12}" fill="${shadeHex(base, 0.55)}" stroke="${ink}" stroke-width="2"/>
    <circle cx="${valveX}" cy="${(pipeY[0] + pipeY[1]) / 2 + 4}" r="22" fill="none" stroke="${ink}" stroke-width="3"/>
    <path d="M${valveX - 22} ${(pipeY[0] + pipeY[1]) / 2 + 4} h44 M${valveX} ${(pipeY[0] + pipeY[1]) / 2 - 18} v44" stroke="${ink}" stroke-width="3" stroke-linecap="round"/>
    ${iconGroup('Plumbing', { x: 310, y: 90, size: 64, rotation: v.rotation, flip: v.flip, color: base, opacity: 0.85 })}
  `;
}

function sceneCarpentry(v, base, ink) {
  let grain = '';
  for (let i = 0; i < 4; i += 1) {
    const gy = 130 + i * 18;
    grain += `<path d="M55 ${gy} Q150 ${gy - (6 + v.phase * 3)} 245 ${gy} T345 ${gy}" fill="none" stroke="${ink}" stroke-width="1.5" opacity="0.55"/>`;
  }
  return `
    <rect x="45" y="118" width="310" height="92" fill="${shadeHex(base, 0.62)}" stroke="${ink}" stroke-width="3"/>
    ${grain}
    <path d="M60 96 L96 60 L108 72 L72 108 Z" fill="${shadeHex(base, 0.4)}" stroke="${ink}" stroke-width="2"/>
    ${iconGroup('Carpentry', { x: 300, y: 80, size: 68, rotation: v.rotation, flip: v.flip, color: base, opacity: 0.85 })}
  `;
}

function sceneRoofing(v, base, ink) {
  let shingles = '';
  const rows = 4;
  const cols = 7;
  for (let r = 0; r < rows; r += 1) {
    const rowOffset = (r % 2 === v.phase % 2) ? 0 : 14;
    for (let c = 0; c < cols; c += 1) {
      const cx = 40 + rowOffset + c * 28;
      const cy = 90 + r * 24;
      shingles += `<path d="M${cx} ${cy} q14 -14 28 0" fill="none" stroke="${ink}" stroke-width="2" opacity="0.7"/>`;
    }
  }
  return `
    <path d="M30 90 L200 30 L370 90 Z" fill="${shadeHex(base, 0.68)}" stroke="${ink}" stroke-width="3"/>
    <rect x="290" y="45" width="24" height="45" fill="${shadeHex(base, 0.4)}" stroke="${ink}" stroke-width="2"/>
    <g clip-path="none">${shingles}</g>
    ${iconGroup('Roofing', { x: 340, y: 250, size: 50, rotation: v.rotation, flip: v.flip, color: base, opacity: 0.8 })}
  `;
}

function scenePainting(v, base, ink) {
  const angle = v.flip ? -18 : 18;
  return `
    <g transform="rotate(${angle} 200 150)">
      <rect x="20" y="130" width="360" height="40" fill="${base}" opacity="0.55"/>
      <rect x="20" y="130" width="360" height="40" fill="none" stroke="${ink}" stroke-width="2" opacity="0.6"/>
    </g>
    <rect x="120" y="70" width="70" height="24" rx="4" fill="${shadeHex(base, 0.5)}" stroke="${ink}" stroke-width="2.5"/>
    <line x1="190" y1="82" x2="240" y2="82" stroke="${ink}" stroke-width="4" stroke-linecap="round"/>
    <circle cx="248" cy="82" r="7" fill="${shadeHex(base, 0.4)}" stroke="${ink}" stroke-width="2"/>
    ${[0, 1, 2].map((i) => `<circle cx="${140 + i * 26 + v.phase * 6}" cy="${210 + i * 8}" r="${5 - i}" fill="${base}" opacity="0.6"/>`).join('')}
    ${iconGroup('Painting', { x: 320, y: 230, size: 60, rotation: v.rotation, flip: v.flip, color: base, opacity: 0.85 })}
  `;
}

function sceneHVAC(v, base, ink) {
  let slats = '';
  for (let i = 0; i < 6; i += 1) {
    slats += `<line x1="${120 + i * 16}" y1="100" x2="${120 + i * 16}" y2="200" stroke="${ink}" stroke-width="2.5" opacity="0.7"/>`;
  }
  return `
    <rect x="110" y="90" width="100" height="120" rx="10" fill="${shadeHex(base, 0.66)}" stroke="${ink}" stroke-width="3"/>
    ${slats}
    <circle cx="290" cy="150" r="46" fill="none" stroke="${ink}" stroke-width="2.5"/>
    ${iconGroup('HVAC', { x: 290, y: 150, size: 68, rotation: v.rotation + v.phase * 20, flip: v.flip, color: base, opacity: 0.9, strokeWidth: 2 })}
  `;
}

function sceneMasonry(v, base, ink) {
  let bricks = '';
  const brickW = 46;
  const brickH = 22;
  for (let r = 0; r < 6; r += 1) {
    const offset = r % 2 === v.phase % 2 ? 0 : brickW / 2;
    for (let c = -1; c < 8; c += 1) {
      const bx = 40 + offset + c * brickW;
      const by = 70 + r * brickH;
      if (bx > 370 || bx + brickW < 40) continue;
      bricks += `<rect x="${bx}" y="${by}" width="${brickW - 3}" height="${brickH - 3}" fill="${shadeHex(base, 0.5 - (r % 2) * 0.08)}" stroke="${ink}" stroke-width="1.5"/>`;
    }
  }
  return `
    <g clip-path="url(#masonry-clip)">${bricks}</g>
    <clipPath id="masonry-clip"><rect x="40" y="70" width="320" height="132"/></clipPath>
    <path d="M300 220 L340 240 L300 250 Z" fill="${shadeHex(base, 0.35)}" stroke="${ink}" stroke-width="2"/>
    ${iconGroup('Masonry', { x: 90, y: 235, size: 60, rotation: v.rotation, flip: v.flip, color: base, opacity: 0.85 })}
  `;
}

function sceneLandscaping(v, base, ink) {
  let hedge = '';
  for (let i = 0; i < 6; i += 1) {
    const hx = 55 + i * 52;
    const hr = 26 + ((i + v.phase) % 3) * 4;
    hedge += `<circle cx="${hx}" cy="150" r="${hr}" fill="${shadeHex(base, 0.5)}" stroke="${ink}" stroke-width="2" opacity="0.9"/>`;
  }
  let wall = '';
  for (let c = 0; c < 8; c += 1) {
    wall += `<rect x="${30 + c * 45}" y="210" width="42" height="26" fill="${shadeHex(base, 0.3)}" stroke="${ink}" stroke-width="1.5"/>`;
  }
  return `
    ${wall}
    ${hedge}
    ${iconGroup('Landscaping', { x: 330, y: 90, size: 60, rotation: v.rotation, flip: v.flip, color: base, opacity: 0.85 })}
  `;
}

function sceneFlooring(v, base, ink) {
  let planks = '';
  const plankW = 90;
  const plankH = 26;
  for (let r = 0; r < 7; r += 1) {
    const offset = ((r + v.phase) % 2 === 0) ? 0 : plankW / 2;
    for (let c = -1; c < 5; c += 1) {
      const px = 40 + offset + c * plankW;
      const py = 55 + r * plankH;
      if (px + plankW < 30 || px > 370) continue;
      planks += `<rect x="${px}" y="${py}" width="${plankW - 3}" height="${plankH - 3}" fill="${shadeHex(base, 0.55 - (r % 2) * 0.06)}" stroke="${ink}" stroke-width="1.5"/>`;
    }
  }
  return `
    <g clip-path="url(#floor-clip)">${planks}</g>
    <clipPath id="floor-clip"><rect x="30" y="55" width="340" height="190"/></clipPath>
    ${iconGroup('Flooring', { x: 330, y: 250, size: 56, rotation: v.rotation, flip: v.flip, color: base, opacity: 0.85 })}
  `;
}

const SCENE_BUILDERS = {
  Electrical: sceneElectrical,
  Plumbing: scenePlumbing,
  Carpentry: sceneCarpentry,
  Roofing: sceneRoofing,
  Painting: scenePainting,
  HVAC: sceneHVAC,
  Masonry: sceneMasonry,
  Landscaping: sceneLandscaping,
  Flooring: sceneFlooring,
};

function sceneBody(trade, v, base, ink) {
  const builder = SCENE_BUILDERS[trade];
  if (builder) return builder(v, base, ink);
  return `
    <path d="M60 220 L200 90 L340 220 Z" fill="none" stroke="${ink}" stroke-width="3"/>
    <line x1="30" y1="220" x2="370" y2="220" stroke="${ink}" stroke-width="3"/>
    ${iconGroup(trade, { x: 200, y: 150, size: 70, rotation: v.rotation, flip: v.flip, color: base, opacity: 0.85 })}
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
