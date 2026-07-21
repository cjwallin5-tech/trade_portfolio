function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function initials(name) {
  return String(name)
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join('');
}

function avatarHTML(pro) {
  if (pro.avatar_path && !isPlaceholder(pro.avatar_path)) {
    return `<img src="${escapeHtml(pro.avatar_path)}" alt="Photo of ${escapeHtml(pro.name)}">`;
  }
  const seed = seedFromPlaceholder(pro.avatar_path) || pro.name;
  const pattern = avatarPatternDataUri(pro.trade, seed);
  return `<div class="avatar" style="background-image:url('${pattern}')">${escapeHtml(initials(pro.name))}</div>`;
}

function isPlaceholder(path) {
  return !path || String(path).startsWith('placeholder:');
}

function seedFromPlaceholder(path) {
  const s = String(path || '');
  return s.startsWith('placeholder:') ? s.slice('placeholder:'.length) : s;
}

function photoTileHTML(trade, seed) {
  return sceneFor(trade, seed);
}

function formatDate(value) {
  if (!value) return '';
  const d = new Date(value.includes(' ') ? value.replace(' ', 'T') + 'Z' : value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

async function apiGet(url) {
  const res = await fetch(url);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Request failed (${res.status})`);
  }
  return res.json();
}

async function apiSend(url, method, body, isForm) {
  const res = await fetch(url, {
    method,
    headers: isForm ? undefined : { 'Content-Type': 'application/json' },
    body: isForm ? body : JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `Request failed (${res.status})`);
  }
  return data;
}
