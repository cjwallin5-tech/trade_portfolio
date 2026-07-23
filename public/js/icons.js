// Simple solid-silhouette icons, one per trade. No icon font, no emoji.
// Stored as bare path markup so illustrations.js can reuse the same glyphs at other sizes.
const TRADE_ICON_PATHS = {
  Plumbing: `<path d="M12 2.5C8.4 7.3 5.8 10.9 5.8 14.1a6.2 6.2 0 0 0 12.4 0c0-3.2-2.6-6.8-6.2-11.6z"/>`,
  Electrical: `<path d="M13 2 4 14h6l-1 8 9-12h-6l1-8z"/>`,
  HVAC: `<g><path d="M12 12C10.3 9.3 10.3 5.8 12 4c1.7 1.8 1.7 5.3 0 8z"/><path d="M12 12C10.3 9.3 10.3 5.8 12 4c1.7 1.8 1.7 5.3 0 8z" transform="rotate(120 12 12)"/><path d="M12 12C10.3 9.3 10.3 5.8 12 4c1.7 1.8 1.7 5.3 0 8z" transform="rotate(240 12 12)"/><circle cx="12" cy="12" r="2.1"/></g>`,
  Carpentry: `<rect x="6" y="3" width="12" height="5" rx="1.5"/><rect x="10.5" y="8" width="3" height="13" rx="1.4"/>`,
  Roofing: `<path d="M12 3 2 12h3v9h5v-6h4v6h5v-9h3z"/>`,
  Painting: `<rect x="4.3" y="6.3" width="15.4" height="2.4" rx="1.1"/><path d="M5 8.7h14l-1.3 11.5a2 2 0 0 1-2 1.8h-7.4a2 2 0 0 1-2-1.8z"/>`,
  Masonry: `<rect x="4" y="4.5" width="7" height="4.2"/><rect x="12" y="4.5" width="8" height="4.2"/><rect x="4" y="9.9" width="3.4" height="4.2"/><rect x="8.6" y="9.9" width="7" height="4.2"/><rect x="16.8" y="9.9" width="3.2" height="4.2"/><rect x="4" y="15.3" width="7" height="4.2"/><rect x="12" y="15.3" width="8" height="4.2"/>`,
  Landscaping: `<path d="M12 2 4 14h5l-2 3h10l-2-3h5z"/><rect x="10.5" y="19" width="3" height="3" rx="0.5"/>`,
  Flooring: `<rect x="3" y="4.4" width="18" height="4.5" rx="0.6"/><rect x="3" y="9.75" width="18" height="4.5" rx="0.6"/><rect x="3" y="15.1" width="18" height="4.5" rx="0.6"/>`,
  'General Contracting': `<path d="M5 14.6a7 7 0 0 1 14 0z"/><rect x="3" y="14.6" width="18" height="2.4" rx="1.2"/>`,
};

const DEFAULT_ICON_PATH = `<circle cx="12" cy="12" r="8"/>`;

function iconPathFor(trade) {
  return TRADE_ICON_PATHS[trade] || DEFAULT_ICON_PATH;
}

function iconFor(trade) {
  return `<svg viewBox="0 0 24 24" fill="currentColor" stroke="none">${iconPathFor(trade)}</svg>`;
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
