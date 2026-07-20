const params = new URLSearchParams(window.location.search);
const proId = params.get('id');
const token = params.get('token');
const root = document.getElementById('dash-root');

function renderError(message) {
  root.innerHTML = `<div class="empty-state">${escapeHtml(message)}</div>`;
}

function bookingRow(pro, booking) {
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

async function init() {
  if (!proId || !token) {
    return renderError('This link is missing its access token. Use the exact dashboard link you were given when you signed up.');
  }

  let pro;
  let bookings;
  try {
    pro = await apiGet(`/api/pros/${encodeURIComponent(proId)}`);
    bookings = await apiGet(`/api/pros/${encodeURIComponent(proId)}/bookings?token=${encodeURIComponent(token)}`);
  } catch (err) {
    return renderError("Can't open this dashboard. The link may be wrong or out of date.");
  }

  document.title = `Dashboard — ${pro.name} — Fieldsheet`;

  root.innerHTML = `
    <div class="section-head">
      <h2>Booking requests for ${escapeHtml(pro.name)}</h2>
      <span class="result-count">${bookings.length} total</span>
    </div>
    <div class="booking-list" id="booking-list"></div>
  `;

  const list = document.getElementById('booking-list');
  if (bookings.length === 0) {
    list.innerHTML = `<div class="empty-state">No booking requests yet. Once your profile gets shared around, they'll show up here.</div>`;
    return;
  }
  bookings.forEach((b) => list.appendChild(bookingRow(pro, b)));
}

init();
