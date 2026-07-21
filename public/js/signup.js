const form = document.getElementById('signup-form');
const notice = document.getElementById('signup-notice');
const submitBtn = document.getElementById('signup-submit');

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  notice.innerHTML = '';

  const email = document.getElementById('sf-email').value.trim();
  const password = document.getElementById('sf-password').value;
  const passwordConfirm = document.getElementById('sf-password-confirm').value;

  if (password !== passwordConfirm) {
    notice.innerHTML = `<div class="notice error">Passwords don't match.</div>`;
    return;
  }

  submitBtn.disabled = true;
  submitBtn.textContent = 'Creating account…';

  try {
    await apiSend('/api/auth/signup', 'POST', { email, password }, false);
    window.location.href = '/join.html';
  } catch (err) {
    notice.innerHTML = `<div class="notice error">${escapeHtml(err.message)}</div>`;
    submitBtn.disabled = false;
    submitBtn.textContent = 'Create account';
  }
});
