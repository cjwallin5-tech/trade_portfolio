const root = document.getElementById('pro-root');
const params = new URLSearchParams(window.location.search);
const proId = params.get('id');

function renderNotFound() {
  root.innerHTML = `
    <div class="empty-state" style="margin: 60px 0;">
      This listing doesn't exist or has been removed.
      <div style="margin-top: 14px;"><a href="/index.html">Back to the directory</a></div>
    </div>
  `;
}

function galleryHTML(pro) {
  if (!pro.portfolio.length) {
    return `<p style="color: var(--ink-faint);">No photos posted yet.</p>`;
  }
  return `
    <div class="gallery">
      ${pro.portfolio
        .map((item, i) => {
          const media = isPlaceholder(item.image_path)
            ? photoTileHTML(pro.trade)
            : `<img src="${escapeHtml(item.image_path)}" alt="${escapeHtml(item.caption || pro.trade + ' work')}">`;
          return `
        <figure data-index="${i}">
          ${media}
          ${item.caption ? `<figcaption>${escapeHtml(item.caption)}</figcaption>` : ''}
        </figure>
      `;
        })
        .join('')}
    </div>
  `;
}

function factsHTML(pro) {
  const facts = [
    { label: 'Location', value: pro.location },
    { label: 'Experience', value: `${pro.years_experience || 0} years` },
  ];
  if (pro.license_number) {
    facts.push({ label: 'License', value: pro.license_number });
  }
  return facts
    .map((f) => `<div class="fact"><strong>${escapeHtml(f.label)}</strong>${escapeHtml(f.value)}</div>`)
    .join('');
}

function renderPro(pro) {
  document.title = `${pro.name} — Fieldsheet`;

  root.innerHTML = `
    <div class="pro-header">
      <div class="avatar-wrap">${avatarHTML(pro)}</div>
      <div class="meta">
        <div class="trade-tag">${iconFor(pro.trade)}<span>${escapeHtml(pro.trade)}</span></div>
        <h1>${escapeHtml(pro.name)}</h1>
        <p class="tagline">${escapeHtml(pro.tagline || '')}</p>
        <div class="fact-row">${factsHTML(pro)}</div>
      </div>
      <div class="actions">
        <a class="btn" href="tel:${escapeHtml(pro.phone)}">Call ${escapeHtml(pro.phone)}</a>
        <a class="btn secondary" href="mailto:${escapeHtml(pro.email)}">Email</a>
      </div>
    </div>

    <div class="two-pane">
      <div>
        <h2 style="font-size: 19px;">Recent work</h2>
        ${galleryHTML(pro)}
        <div class="bio-block">
          <h2>About</h2>
          <p>${escapeHtml(pro.bio || 'No background written up yet.')}</p>
        </div>
      </div>

      <div class="booking-box">
        <h2>Request a booking</h2>
        <div class="sub">Sent straight to ${escapeHtml(pro.name.split(' ')[0])}. They'll follow up by phone or email.</div>
        <div id="booking-notice"></div>
        <form id="booking-form">
          <div class="field">
            <label for="bf-name">Your name</label>
            <input type="text" id="bf-name" required>
          </div>
          <div class="field">
            <label for="bf-email">Email</label>
            <input type="email" id="bf-email" required>
          </div>
          <div class="field">
            <label for="bf-phone">Phone (optional)</label>
            <input type="tel" id="bf-phone">
          </div>
          <div class="field">
            <label for="bf-date">Preferred date</label>
            <input type="date" id="bf-date">
          </div>
          <div class="field">
            <label for="bf-job">What's the job?</label>
            <textarea id="bf-job" placeholder="Briefly describe what needs doing…" required></textarea>
          </div>
          <button type="submit" class="btn block">Send booking request</button>
        </form>
      </div>
    </div>
  `;

  wireGallery(pro);
  wireBookingForm(pro);
}

function wireGallery(pro) {
  const lightbox = document.getElementById('lightbox');
  const lightboxImg = document.getElementById('lightbox-img');
  const lightboxCap = document.getElementById('lightbox-cap');

  document.querySelectorAll('.gallery figure').forEach((fig) => {
    const item = pro.portfolio[Number(fig.dataset.index)];
    if (isPlaceholder(item.image_path)) {
      fig.style.cursor = 'default';
      return;
    }
    fig.addEventListener('click', () => {
      lightboxImg.src = item.image_path;
      lightboxImg.alt = item.caption || '';
      lightboxCap.textContent = item.caption || '';
      lightbox.classList.add('open');
    });
  });

  const close = () => lightbox.classList.remove('open');
  document.getElementById('lightbox-close').addEventListener('click', close);
  lightbox.addEventListener('click', (e) => {
    if (e.target === lightbox) close();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') close();
  });
}

function wireBookingForm(pro) {
  const form = document.getElementById('booking-form');
  const notice = document.getElementById('booking-notice');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    notice.innerHTML = '';

    const payload = {
      pro_id: pro.id,
      client_name: document.getElementById('bf-name').value.trim(),
      client_email: document.getElementById('bf-email').value.trim(),
      client_phone: document.getElementById('bf-phone').value.trim(),
      preferred_date: document.getElementById('bf-date').value,
      job_description: document.getElementById('bf-job').value.trim(),
    };

    try {
      await apiSend('/api/bookings', 'POST', payload, false);
      form.reset();
      notice.innerHTML = `<div class="notice">Request sent. ${escapeHtml(
        pro.name.split(' ')[0]
      )} will reach out to ${escapeHtml(payload.client_email)} soon.</div>`;
    } catch (err) {
      notice.innerHTML = `<div class="notice error">${escapeHtml(err.message)}</div>`;
    }
  });
}

async function init() {
  if (!proId) return renderNotFound();
  try {
    const pro = await apiGet(`/api/pros/${encodeURIComponent(proId)}`);
    renderPro(pro);
  } catch (err) {
    renderNotFound();
  }
}

init();
