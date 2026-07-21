const tradeSelect = document.getElementById('jf-trade');
const photoRows = document.getElementById('photo-rows');
const addPhotoBtn = document.getElementById('add-photo');
const form = document.getElementById('join-form');
const notice = document.getElementById('join-notice');
const submitBtn = document.getElementById('join-submit');
const loginFieldset = document.getElementById('jf-login-fieldset');
const emailInput = document.getElementById('jf-email');
const passwordInput = document.getElementById('jf-password');
const passwordConfirmInput = document.getElementById('jf-password-confirm');

let rowCount = 0;
let completingProId = null;

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
  const dashboardUrl = token
    ? `${window.location.origin}/dashboard.html?id=${id}&token=${token}`
    : `${window.location.origin}/dashboard.html?id=${id}`;

  document.getElementById('form-page').innerHTML = `
    <div class="confirm-card">
      <h2 style="font-size: 22px;">You're listed.</h2>
      <p>Your profile is live. Share it however you'd like, and log in anytime with your email and password to check booking requests.</p>
      <p style="margin-bottom: 4px;"><strong>Your profile</strong></p>
      <div class="token-box"><a href="${profileUrl}">${profileUrl}</a></div>
      ${token ? `
      <p style="margin-bottom: 4px;"><strong>Your dashboard (bookmark this — it's not shared anywhere else)</strong></p>
      <div class="token-box"><a href="${dashboardUrl}">${dashboardUrl}</a></div>
      ` : ''}
      <a class="btn" href="${profileUrl}">View my profile</a>
      <a class="btn" href="${dashboardUrl}" style="margin-left: 8px;">Go to my dashboard</a>
    </div>
  `;
}

function enterCompleteProfileMode(pro) {
  completingProId = pro.id;
  loginFieldset.style.display = 'none';
  passwordInput.required = false;
  passwordConfirmInput.required = false;

  emailInput.value = pro.email;
  emailInput.readOnly = true;

  document.getElementById('join-kicker').textContent = 'Finish signing up';
  document.getElementById('join-title').textContent = "You're almost done.";
  document.getElementById('join-intro').textContent = 'Add a few details and some photos of finished work so people can find and book you.';
  submitBtn.textContent = 'Finish my listing';
}

async function checkExistingSession() {
  let me;
  try {
    me = await apiGet('/api/auth/me');
  } catch {
    return;
  }
  const pro = await apiGet(`/api/pros/${me.id}`);
  if (pro.profile_complete) {
    window.location.href = `/dashboard.html?id=${pro.id}`;
    return;
  }
  enterCompleteProfileMode(pro);
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  notice.innerHTML = '';

  const password = passwordInput.value;
  const passwordConfirm = passwordConfirmInput.value;
  if (!completingProId && password !== passwordConfirm) {
    notice.innerHTML = `<div class="notice error">Passwords don't match.</div>`;
    return;
  }

  submitBtn.disabled = true;
  submitBtn.textContent = completingProId ? 'Saving…' : 'Creating listing…';

  const avatarFile = document.getElementById('jf-avatar').files[0];
  const photoFiles = [];
  document.querySelectorAll('.photo-row').forEach((row) => {
    const file = row.querySelector('.photo-file').files[0];
    const caption = row.querySelector('.photo-caption').value.trim();
    if (file) photoFiles.push({ file, caption });
  });

  const fd = new FormData();
  fd.append('name', document.getElementById('jf-name').value.trim());
  fd.append('trade', tradeSelect.value);
  fd.append('tagline', document.getElementById('jf-tagline').value.trim());
  fd.append('bio', document.getElementById('jf-bio').value.trim());
  fd.append('location', document.getElementById('jf-location').value.trim());
  fd.append('years_experience', document.getElementById('jf-years').value || '0');
  fd.append('phone', document.getElementById('jf-phone').value.trim());
  fd.append('email', emailInput.value.trim());
  fd.append('license_number', document.getElementById('jf-license').value.trim());
  if (avatarFile) fd.append('avatar', avatarFile);

  try {
    if (completingProId) {
      await apiSend(`/api/pros/${completingProId}`, 'PATCH', fd, true);

      if (photoFiles.length) {
        const photoFd = new FormData();
        photoFiles.forEach(({ file, caption }) => {
          photoFd.append('photos', file);
          photoFd.append('captions', caption);
        });
        await apiSend(`/api/pros/${completingProId}/photos`, 'POST', photoFd, true);
      }

      renderConfirmation(completingProId, null);
    } else {
      fd.append('password', password);
      photoFiles.forEach(({ file, caption }) => {
        fd.append('photos', file);
        fd.append('captions', caption);
      });
      const result = await apiSend('/api/pros', 'POST', fd, true);
      renderConfirmation(result.id, result.dashboard_token);
    }
  } catch (err) {
    notice.innerHTML = `<div class="notice error">${escapeHtml(err.message)}</div>`;
    submitBtn.disabled = false;
    submitBtn.textContent = completingProId ? 'Finish my listing' : 'Create my listing';
  }
});

loadTrades();
checkExistingSession();
