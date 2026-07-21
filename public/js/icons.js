// Small hand-drawn line icons, one per trade. No icon font, no emoji.
// Stored as bare path markup so illustrations.js can reuse the same glyphs at other sizes.
const TRADE_ICON_PATHS = {
  Plumbing: `<path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.1 2.1-2.6-.6-.6-2.6 2.1-2.1z"/>`,
  Electrical: `<path d="M13 2 3 14h7l-1 8 10-12h-7z"/>`,
  HVAC: `<circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none"/><path d="M12 12c0-3.5 2-6 5-6 1 0 1.6 1 1 2-1 1.6-3.4 2.4-6 4z"/><path d="M12 12c-3.5 0-6-2-6-5 0-1 1-1.6 2-1 1.6 1 2.4 3.4 4 6z"/><path d="M12 12c0 3.5-2 6-5 6-1 0-1.6-1-1-2 1-1.6 3.4-2.4 6-4z"/>`,
  Carpentry: `<path d="M14.5 3.5 20.5 9.5 18 12l-2.5-2.5"/><path d="M15.5 8.5 5 19a1.5 1.5 0 0 1-2-2L13.5 6.5"/>`,
  Roofing: `<path d="M3 12 12 4l9 8"/><path d="M5.5 10.5V20h13v-9.5"/>`,
  Painting: `<rect x="4" y="5" width="14" height="6" rx="1"/><path d="M11 11v4"/><path d="M11 15h5v5h-5z"/>`,
  Masonry: `<path d="M4 10 12 3l8 7-3.2 1-4.8-4-4.8 4z"/><path d="M8.5 11 5 20"/><path d="M15.5 11 19 20"/>`,
  Landscaping: `<path d="M12 3 7 10h3l-4 6h4v5h4v-5h4l-4-6h3z"/>`,
  Flooring: `<rect x="3" y="5" width="18" height="4.5"/><rect x="3" y="9.5" width="18" height="4.5"/><rect x="3" y="14" width="18" height="4.5"/><path d="M9 5v4.5M15 9.5v4.5M6 14v4.5"/>`,
  'General Contracting': `<path d="M4 15a8 8 0 0 1 16 0z"/><path d="M2.5 15h19"/><path d="M12 7v3"/>`,
};

const DEFAULT_ICON_PATH = `<circle cx="12" cy="12" r="8"/>`;

function iconPathFor(trade) {
  return TRADE_ICON_PATHS[trade] || DEFAULT_ICON_PATH;
}

function iconFor(trade) {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${iconPathFor(trade)}</svg>`;
}

const TRADE_COLORS = {
  Plumbing: '#2f5a72',
  Electrical: '#a8431a',
  HVAC: '#3f6b7a',
  Carpentry: '#6b4a2b',
  Roofing: '#5c4632',
  Painting: '#7a4f8c',
  Masonry: '#7a2f2f',
  Landscaping: '#3f6b3f',
  Flooring: '#8a6a3a',
  'General Contracting': '#263640',
};

function colorFor(trade) {
  return TRADE_COLORS[trade] || '#263640';
}
