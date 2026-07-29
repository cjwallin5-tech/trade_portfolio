const params = new URLSearchParams(window.location.search);
const proId = params.get('id');
const token = params.get('token');
const root = document.getElementById('dash-root');

const MAX_PORTFOLIO_ITEMS = 12;

function renderError(message) {
  root.innerHTML = `<div class="empty-state">${escapeHtml(message)}</div>`;
}

function bookingRow(booking) {
  const div = document.createElement('div');
  div.className = 'booking-row';
  div.innerHTML = `
    <div style="flex: 1; min-width: 220px;">
      <div class="who">${escapeHtml(booking.client_name)}</div>
      <div style="font-size: 13px; color: var(--ink-faint); margin-top: 2px;">
        <a href="mailto:${escapeHtml(booking.client_email)}">${escapeHtml(booking.client_email)}</a>
        ${booking.client_phone ? ` · <a href="tel:${escapeHtml(booking.client_phone)}">${escapeHtml(booking.client_phone)}</a>` : ''}
      </div>
      ${booking.preferred_date ? `<div style="font-size: 13px; color: var(--ink-faint); margin-top: 2px;">Preferred date: ${escapeHtml(booking.preferred_date)}</div>` : ''}
      <div class="job">${escapeHtml(booking.job_description || '')}</div>
      <div style="font-size: 12px; color: var(--ink-faint); margin-top: 8px;">Received ${formatDate(booking.created_at)}</div>
      <div class="booking-actions">
        <select data-id="${booking.id}" class="status-select">
          <option value="new" ${booking.status === 'new' ? 'selected' : ''}>New</option>
          <option value="contacted" ${booking.status === 'contacted' ? 'selected' : ''}>Contacted</option>
          <option value="booked" ${booking.status === 'booked' ? 'selected' : ''}>Booked</option>
          <option value="declined" ${booking.status === 'declined' ? 'selected' : ''}>Declined</option>
        </select>
      </div>
    </div>
    <span class="status-pill ${booking.status}">${escapeHtml(booking.status)}</span>
  `;

  const select = div.querySelector('.status-select');
  const pill = div.querySelector('.status-pill');
  select.addEventListener('change', async () => {
    try {
      await apiSend(`/api/bookings/${booking.id}`, 'PATCH', { token, status: select.value }, false);
      pill.textContent = select.value;
      pill.className = `status-pill ${select.value}`;
    } catch (err) {
      alert(err.message);
    }
  });

  return div;
}

// Reserved, validated status colors — always paired with a direct text label,
// never used as the sole way to tell statuses apart.
const STATUS_COLORS = { new: '#a8431a', contacted: '#3a6ea5', booked: '#2f7d4f', declined: '#9b9284' };
const STATUS_LABELS = { new: 'New', contacted: 'Contacted', booked: 'Booked', declined: 'Declined' };
const STATUS_ORDER = ['new', 'contacted', 'booked', 'declined'];

function statTile(value, label) {
  return `<div class="stat-tile"><div class="stat-value">${escapeHtml(value)}</div><div class="stat-label">${escapeHtml(label)}</div></div>`;
}

function statusBreakdownChart(bookings) {
  const counts = STATUS_ORDER.map((s) => bookings.filter((b) => b.status === s).length);
  const max = Math.max(1, ...counts);
  const rows = STATUS_ORDER.map((s, i) => {
    const count = counts[i];
    const pct = Math.round((count / max) * 100);
    return `
      <div class="bar-row">
        <div class="bar-row-label"><span class="swatch" style="background:${STATUS_COLORS[s]}"></span>${STATUS_LABELS[s]}</div>
        <div class="bar-track"><div class="bar-fill" style="width:${pct}%; background:${STATUS_COLORS[s]}"></div></div>
        <div class="bar-row-value">${count}</div>
      </div>`;
  }).join('');
  return `<div class="bar-chart" role="img" aria-label="Booking requests by status">${rows}</div>`;
}

function weeklyBookingsChart(bookings) {
  const WEEKS = 8;
  const dayMs = 24 * 60 * 60 * 1000;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dow = (today.getDay() + 6) % 7; // days since Monday
  const thisWeekStart = new Date(today.getTime() - dow * dayMs);

  const buckets = [];
  for (let i = WEEKS - 1; i >= 0; i -= 1) {
    const start = new Date(thisWeekStart.getTime() - i * 7 * dayMs);
    const end = new Date(start.getTime() + 7 * dayMs);
    buckets.push({ start, end, count: 0 });
  }

  bookings.forEach((b) => {
    if (!b.created_at) return;
    const raw = String(b.created_at);
    const d = new Date(raw.includes(' ') ? raw.replace(' ', 'T') + 'Z' : raw);
    const bucket = buckets.find((bk) => d >= bk.start && d < bk.end);
    if (bucket) bucket.count += 1;
  });

  const max = Math.max(1, ...buckets.map((b) => b.count));
  const bars = buckets.map((b) => {
    const h = b.count > 0 ? Math.max(Math.round((b.count / max) * 100), 8) : 2;
    const label = b.start.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    const title = `Week of ${label}: ${b.count} request${b.count === 1 ? '' : 's'}`;
    return `
      <div class="trend-bar" title="${escapeHtml(title)}">
        <div class="trend-bar-value">${b.count > 0 ? b.count : ''}</div>
        <div class="trend-bar-track"><div class="trend-bar-fill" style="height:${h}%"></div></div>
        <div class="trend-bar-label">${escapeHtml(label)}</div>
      </div>`;
  }).join('');
  return `<div class="trend-chart-scroll"><div class="trend-chart" role="img" aria-label="Booking requests received per week, last 8 weeks">${bars}</div></div>`;
}

function statsAndChartsHTML(bookings) {
  const total = bookings.length;
  const newCount = bookings.filter((b) => b.status === 'new').length;
  const bookedCount = bookings.filter((b) => b.status === 'booked').length;
  const conversion = total ? Math.round((bookedCount / total) * 100) : 0;

  return `
    <div class="stats-row">
      ${statTile(total, 'Total requests')}
      ${statTile(newCount, 'New')}
      ${statTile(bookedCount, 'Booked')}
      ${statTile(`${conversion}%`, 'Conversion')}
    </div>
    <div class="charts-row">
      <div class="chart-card">
        <h3>Requests by week</h3>
        ${weeklyBookingsChart(bookings)}
      </div>
      <div class="chart-card">
        <h3>Status breakdown</h3>
        ${statusBreakdownChart(bookings)}
      </div>
    </div>
  `;
}

function renderRequests(bookings) {
  const panel = document.getElementById('panel-requests');
  panel.innerHTML = `
    <div class="section-head">
      <h2>Booking requests</h2>
      <span class="result-count">${bookings.length} total</span>
    </div>
    ${bookings.length > 0 ? statsAndChartsHTML(bookings) : ''}
    <div class="booking-list" id="booking-list"></div>
  `;
  const list = document.getElementById('booking-list');
  if (bookings.length === 0) {
    list.innerHTML = `<div class="empty-state">No booking requests yet. Once your profile gets shared around, they'll show up here.</div>`;
    return;
  }
  bookings.forEach((b) => list.appendChild(bookingRow(b)));
}

function existingPhotoHTML(item, trade) {
  const media = isPlaceholder(item.image_path)
    ? photoTileHTML(trade, seedFromPlaceholder(item.image_path))
    : `<img src="${escapeHtml(item.image_path)}" alt="${escapeHtml(item.caption || '')}">`;
  return `
    <div class="existing-photo" data-id="${item.id}">
      ${media}
      <button type="button" class="remove-existing-photo" title="Delete this photo">&times;</button>
    </div>
  `;
}

function addPhotoRow(container) {
  const row = document.createElement('div');
  row.className = 'photo-row';
  row.innerHTML = `
    <div class="field" style="margin-bottom:0;">
      <label>Photo</label>
      <input type="file" class="photo-file" accept="image/png, image/jpeg, image/webp, image/gif">
    </div>
    <div class="field" style="margin-bottom:0;">
      <label>Caption</label>
      <input type="text" class="photo-caption" placeholder="e.g. Panel upgrade, 1950s colonial" maxlength="140">
    </div>
    <button type="button" class="remove-photo" title="Remove this row">&times;</button>
  `;
  row.querySelector('.remove-photo').addEventListener('click', () => row.remove());
  container.appendChild(row);
}

function editPanelHTML(pro) {
  return `
    <div class="section-head">
      <h2>Edit listing</h2>
    </div>
    <div id="edit-notice"></div>
    <form id="edit-form">
      <fieldset>
        <legend>Basics</legend>
        <div class="two-col">
          <div class="field">
            <label for="ef-name">Name or business name</label>
            <input type="text" id="ef-name" required value="${escapeHtml(pro.name)}">
          </div>
          <div class="field">
            <label for="ef-trade">Trade</label>
            <select id="ef-trade" required></select>
          </div>
        </div>
        <div class="field">
          <label for="ef-tagline">One line about what you do</label>
          <input type="text" id="ef-tagline" maxlength="120" value="${escapeHtml(pro.tagline || '')}">
        </div>
        <div class="field">
          <label for="ef-bio">Background</label>
          <textarea id="ef-bio">${escapeHtml(pro.bio || '')}</textarea>
        </div>
      </fieldset>

      <fieldset>
        <legend>Contact & credentials</legend>
        <div class="two-col">
          <div class="field">
            <label for="ef-location">City & state</label>
            <input type="text" id="ef-location" required value="${escapeHtml(pro.location)}">
          </div>
          <div class="field">
            <label for="ef-years">Years in business</label>
            <input type="number" id="ef-years" min="0" max="80" value="${pro.years_experience || 0}">
          </div>
        </div>
        <div class="two-col">
          <div class="field">
            <label for="ef-phone">Phone</label>
            <input type="tel" id="ef-phone" required value="${escapeHtml(pro.phone)}">
          </div>
          <div class="field">
            <label for="ef-email">Email</label>
            <input type="email" id="ef-email" required value="${escapeHtml(pro.email)}">
          </div>
        </div>
        <div class="field">
          <label for="ef-license">License number</label>
          <input type="text" id="ef-license" placeholder="Leave blank if not applicable" value="${escapeHtml(pro.license_number || '')}">
        </div>
      </fieldset>

      <fieldset>
        <legend>Photo of you or your logo</legend>
        <div class="field">
          <div class="current-avatar" id="current-avatar">${avatarHTML(pro)}</div>
          <input type="file" id="ef-avatar" accept="image/png, image/jpeg, image/webp, image/gif">
          <div class="hint">Choose a file only if you want to replace your current photo.</div>
        </div>
      </fieldset>

      <button type="submit" class="btn block" id="ef-submit">Save changes</button>
    </form>

    <fieldset style="margin-top: 28px;">
      <legend>Photos of finished work</legend>
      <div class="existing-photos" id="existing-photos"></div>
      <div id="new-photo-rows"></div>
      <button type="button" class="add-photo-btn" id="add-photo">+ Add another photo</button>
      <div id="photo-notice"></div>
      <button type="button" class="btn" id="upload-photos">Upload new photos</button>
    </fieldset>

    <fieldset style="margin-top: 28px;">
      <legend>Login password</legend>
      <div id="password-notice"></div>
      <form id="password-form">
        <div class="two-col">
          <div class="field">
            <label for="pf-password">New password</label>
            <input type="password" id="pf-password" required minlength="8" autocomplete="new-password">
          </div>
          <div class="field">
            <label for="pf-password-confirm">Confirm new password</label>
            <input type="password" id="pf-password-confirm" required minlength="8" autocomplete="new-password">
          </div>
        </div>
        <div class="hint">Set or change the password you use to log in at /login.html with your email.</div>
        <button type="submit" class="btn" id="pf-submit">Save password</button>
      </form>
    </fieldset>
  `;
}

async function wireEditPanel(pro) {
  document.getElementById('panel-edit').innerHTML = editPanelHTML(pro);

  const tradeSelect = document.getElementById('ef-trade');
  const trades = await apiGet('/api/trades');
  trades.forEach((trade) => {
    const opt = document.createElement('option');
    opt.value = trade;
    opt.textContent = trade;
    if (trade === pro.trade) opt.selected = true;
    tradeSelect.appendChild(opt);
  });

  const existingPhotos = document.getElementById('existing-photos');

  function renderExistingPhotos() {
    existingPhotos.innerHTML = pro.portfolio.map((item) => existingPhotoHTML(item, pro.trade)).join('');
    existingPhotos.querySelectorAll('.existing-photo').forEach((el) => {
      el.querySelector('.remove-existing-photo').addEventListener('click', async () => {
        if (!confirm('Delete this photo?')) return;
        try {
          await apiSend(`/api/pros/${proId}/photos/${el.dataset.id}`, 'DELETE', { token }, false);
          pro.portfolio = pro.portfolio.filter((p) => String(p.id) !== el.dataset.id);
          el.remove();
        } catch (err) {
          alert(err.message);
        }
      });
    });
  }
  renderExistingPhotos();

  const newPhotoRows = document.getElementById('new-photo-rows');
  document.getElementById('add-photo').addEventListener('click', () => addPhotoRow(newPhotoRows));

  const editForm = document.getElementById('edit-form');
  const editNotice = document.getElementById('edit-notice');
  const editSubmit = document.getElementById('ef-submit');

  editForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    editNotice.innerHTML = '';
    editSubmit.disabled = true;
    editSubmit.textContent = 'Saving…';

    const fd = new FormData();
    fd.append('token', token);
    fd.append('name', document.getElementById('ef-name').value.trim());
    fd.append('trade', tradeSelect.value);
    fd.append('tagline', document.getElementById('ef-tagline').value.trim());
    fd.append('bio', document.getElementById('ef-bio').value.trim());
    fd.append('location', document.getElementById('ef-location').value.trim());
    fd.append('years_experience', document.getElementById('ef-years').value || '0');
    fd.append('phone', document.getElementById('ef-phone').value.trim());
    fd.append('email', document.getElementById('ef-email').value.trim());
    fd.append('license_number', document.getElementById('ef-license').value.trim());

    const avatarFile = document.getElementById('ef-avatar').files[0];
    if (avatarFile) fd.append('avatar', avatarFile);

    try {
      const updated = await apiSend(`/api/pros/${proId}`, 'PATCH', fd, true);
      Object.assign(pro, updated);
      document.getElementById('current-avatar').innerHTML = avatarHTML(pro);
      editNotice.innerHTML = `<div class="notice">Changes saved.</div>`;
    } catch (err) {
      editNotice.innerHTML = `<div class="notice error">${escapeHtml(err.message)}</div>`;
    } finally {
      editSubmit.disabled = false;
      editSubmit.textContent = 'Save changes';
    }
  });

  const photoNotice = document.getElementById('photo-notice');
  document.getElementById('upload-photos').addEventListener('click', async (e) => {
    const rows = Array.from(newPhotoRows.querySelectorAll('.photo-row')).filter(
      (row) => row.querySelector('.photo-file').files[0]
    );
    if (!rows.length) {
      photoNotice.innerHTML = `<div class="notice error">Choose at least one photo first.</div>`;
      return;
    }
    if (pro.portfolio.length + rows.length > MAX_PORTFOLIO_ITEMS) {
      photoNotice.innerHTML = `<div class="notice error">You can have at most ${MAX_PORTFOLIO_ITEMS} photos.</div>`;
      return;
    }

    const btn = e.target;
    btn.disabled = true;
    btn.textContent = 'Uploading…';
    photoNotice.innerHTML = '';

    const fd = new FormData();
    fd.append('token', token);
    rows.forEach((row) => {
      fd.append('photos', row.querySelector('.photo-file').files[0]);
      fd.append('captions', row.querySelector('.photo-caption').value.trim());
    });

    try {
      const photos = await apiSend(`/api/pros/${proId}/photos`, 'POST', fd, true);
      pro.portfolio = photos;
      renderExistingPhotos();
      rows.forEach((row) => row.remove());
      photoNotice.innerHTML = `<div class="notice">Photos added.</div>`;
    } catch (err) {
      photoNotice.innerHTML = `<div class="notice error">${escapeHtml(err.message)}</div>`;
    } finally {
      btn.disabled = false;
      btn.textContent = 'Upload new photos';
    }
  });

  const passwordForm = document.getElementById('password-form');
  const passwordNotice = document.getElementById('password-notice');
  const passwordSubmit = document.getElementById('pf-submit');

  passwordForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    passwordNotice.innerHTML = '';

    const newPassword = document.getElementById('pf-password').value;
    const confirmPassword = document.getElementById('pf-password-confirm').value;
    if (newPassword !== confirmPassword) {
      passwordNotice.innerHTML = `<div class="notice error">Passwords don't match.</div>`;
      return;
    }

    passwordSubmit.disabled = true;
    passwordSubmit.textContent = 'Saving…';
    try {
      await apiSend('/api/auth/set-password', 'POST', { id: proId, token, password: newPassword }, false);
      passwordForm.reset();
      passwordNotice.innerHTML = `<div class="notice">Password saved. You can now log in at /login.html.</div>`;
    } catch (err) {
      passwordNotice.innerHTML = `<div class="notice error">${escapeHtml(err.message)}</div>`;
    } finally {
      passwordSubmit.disabled = false;
      passwordSubmit.textContent = 'Save password';
    }
  });
}

function wireTabs() {
  document.querySelectorAll('.dash-tab').forEach((tab) => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.dash-tab').forEach((t) => t.classList.remove('active'));
      tab.classList.add('active');
      document.querySelectorAll('.dash-panel').forEach((p) => p.classList.remove('active'));
      document.getElementById(`panel-${tab.dataset.tab}`).classList.add('active');
    });
  });
}

async function init() {
  if (!proId) {
    return renderError('This link is missing the dashboard id. Use the exact dashboard link you were given when you signed up, or log in.');
  }

  let pro;
  let bookings;
  try {
    pro = await apiGet(`/api/pros/${encodeURIComponent(proId)}`);
    const bookingsUrl = token
      ? `/api/pros/${encodeURIComponent(proId)}/bookings?token=${encodeURIComponent(token)}`
      : `/api/pros/${encodeURIComponent(proId)}/bookings`;
    bookings = await apiGet(bookingsUrl);
  } catch (err) {
    return renderError("Can't open this dashboard. Log in or use the exact dashboard link you were given.");
  }

  document.title = `Dashboard — ${pro.name} — Fieldsheet`;

  root.innerHTML = `
    <div class="dash-tabs">
      <button type="button" class="dash-tab active" data-tab="requests">Requests</button>
      <button type="button" class="dash-tab" data-tab="edit">Edit listing</button>
      <button type="button" class="dash-logout" id="logout-btn" style="margin-left: auto;">Log out</button>
    </div>
    <div class="dash-panel active" id="panel-requests"></div>
    <div class="dash-panel" id="panel-edit"></div>
  `;

  wireTabs();
  renderRequests(bookings);
  wireEditPanel(pro);

  document.getElementById('logout-btn').addEventListener('click', async () => {
    try {
      await apiSend('/api/auth/logout', 'POST', {}, false);
    } finally {
      window.location.href = '/login.html';
    }
  });
}

init();
