document.addEventListener('DOMContentLoaded', () => {
  const loginForm = document.getElementById('login-form');
  const errorPanel = document.getElementById('error-panel');
  const errorMessage = document.getElementById('error-message');
  const loginBtn = document.getElementById('login-btn');
  const btnText = loginBtn.querySelector('.btn-text');
  const btnSpinner = loginBtn.querySelector('.btn-spinner');

  // If already logged in, redirect to dashboard
  if (localStorage.getItem('token')) {
    window.location.href = 'dashboard.html';
    return;
  }

  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    errorPanel.classList.add('hidden');

    const registrationIdOrEmail = document.getElementById('registrationIdOrEmail').value.trim();
    const password = document.getElementById('password').value.trim();

    if (!registrationIdOrEmail || !password) {
      showError('Please enter both your Registration ID/Email and Password.');
      return;
    }

    // Disable button & show spinner
    loginBtn.disabled = true;
    btnText.classList.add('hidden');
    btnSpinner.classList.remove('hidden');

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ registrationIdOrEmail, password })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Login failed. Please try again.');
      }

      // Login success
      localStorage.setItem('token', data.token);
      localStorage.setItem('registrationId', data.user.registrationId);
      localStorage.setItem('name', data.user.name);

      // Redirect to dashboard
      window.location.href = 'dashboard.html';

    } catch (error) {
      console.error(error);
      showError(error.message || 'An error occurred during authentication. Please check your network connection.');
      
      // Re-enable button & hide spinner
      loginBtn.disabled = false;
      btnText.classList.remove('hidden');
      btnSpinner.classList.add('hidden');
    }
  });

  const showError = (message) => {
    errorMessage.textContent = message;
    errorPanel.classList.remove('hidden');
  };
});
