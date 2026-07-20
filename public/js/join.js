const tradeSelect = document.getElementById('jf-trade');
const photoRows = document.getElementById('photo-rows');
const addPhotoBtn = document.getElementById('add-photo');
const form = document.getElementById('join-form');
const notice = document.getElementById('join-notice');
const submitBtn = document.getElementById('join-submit');

let rowCount = 0;

function addPhotoRow() {
  rowCount += 1;
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
    <button type="button" class="remove-photo" title="Remove this photo">&times;</button>
  `;
  row.querySelector('.remove-photo').addEventListener('click', () => row.remove());
  photoRows.appendChild(row);
}

async function loadTrades() {
  const trades = await apiGet('/api/trades');
  trades.forEach((trade) => {
    const opt = document.createElement('option');
    opt.value = trade;
    opt.textContent = trade;
    tradeSelect.appendChild(opt);
  });
}

addPhotoBtn.addEventListener('click', addPhotoRow);

for (let i = 0; i < 3; i += 1) addPhotoRow();

function renderConfirmation(id, token) {
  const profileUrl = `${window.location.origin}/pro.html?id=${id}`;
  const dashboardUrl = `${window.location.origin}/dashboard.html?id=${id}&token=${token}`;

  document.getElementById('form-page').innerHTML = `
    <div class="confirm-card">
      <h2 style="font-size: 22px;">You're listed.</h2>
      <p>Your profile is live. Share it however you'd like, and check the dashboard link for booking requests as they come in.</p>
      <p style="margin-bottom: 4px;"><strong>Your profile</strong></p>
      <div class="token-box"><a href="${profileUrl}">${profileUrl}</a></div>
      <p style="margin-bottom: 4px;"><strong>Your dashboard (bookmark this — it's not shared anywhere else)</strong></p>
      <div class="token-box"><a href="${dashboardUrl}">${dashboardUrl}</a></div>
      <a class="btn" href="${profileUrl}">View my profile</a>
    </div>
  `;
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  notice.innerHTML = '';
  submitBtn.disabled = true;
  submitBtn.textContent = 'Creating listing…';

  const fd = new FormData();
  fd.append('name', document.getElementById('jf-name').value.trim());
  fd.append('trade', tradeSelect.value);
  fd.append('tagline', document.getElementById('jf-tagline').value.trim());
  fd.append('bio', document.getElementById('jf-bio').value.trim());
  fd.append('location', document.getElementById('jf-location').value.trim());
  fd.append('years_experience', document.getElementById('jf-years').value || '0');
  fd.append('phone', document.getElementById('jf-phone').value.trim());
  fd.append('email', document.getElementById('jf-email').value.trim());
  fd.append('license_number', document.getElementById('jf-license').value.trim());

  const avatarFile = document.getElementById('jf-avatar').files[0];
  if (avatarFile) fd.append('avatar', avatarFile);

  document.querySelectorAll('.photo-row').forEach((row) => {
    const file = row.querySelector('.photo-file').files[0];
    const caption = row.querySelector('.photo-caption').value.trim();
    if (file) {
      fd.append('photos', file);
      fd.append('captions', caption);
    }
  });

  try {
    const result = await apiSend('/api/pros', 'POST', fd, true);
    renderConfirmation(result.id, result.dashboard_token);
  } catch (err) {
    notice.innerHTML = `<div class="notice error">${escapeHtml(err.message)}</div>`;
    submitBtn.disabled = false;
    submitBtn.textContent = 'Create my listing';
  }
});

loadTrades();
