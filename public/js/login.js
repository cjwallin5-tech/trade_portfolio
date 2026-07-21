const form = document.getElementById('login-form');
const notice = document.getElementById('login-notice');
const submitBtn = document.getElementById('login-submit');

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  notice.innerHTML = '';
  submitBtn.disabled = true;
  submitBtn.textContent = 'Logging in…';

  const email = document.getElementById('lf-email').value.trim();
  const password = document.getElementById('lf-password').value;

  try {
    const pro = await apiSend('/api/auth/login', 'POST', { email, password }, false);
    window.location.href = `/dashboard.html?id=${pro.id}`;
  } catch (err) {
    notice.innerHTML = `<div class="notice error">${escapeHtml(err.message)}</div>`;
    submitBtn.disabled = false;
    submitBtn.textContent = 'Log in';
  }
});
