import { getAuth, signInWithEmailAndPassword, setPersistence, browserLocalPersistence, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";

class SchoolForumSignIn {
  constructor() {
    this.form = document.getElementById('signinForm');
    this.passwordToggle = document.getElementById('passwordToggle');
    this.submitBtn = document.getElementById('submitBtn');

    this.initialize();
  }

  async initialize() {
    this.auth = getAuth();

    // Сохраняем пользователя в локальное хранилище браузера
    await setPersistence(this.auth, browserLocalPersistence);

    // Если пользователь уже залогинен — редирект на dashboard
    onAuthStateChanged(this.auth, (user) => {
      if (user) {
        window.location.href = './dashboard/dashboard.html';
      }
    });

    this.initializeEventListeners();
  }

  initializeEventListeners() {
    this.form.addEventListener('submit', this.handleFormSubmit.bind(this));

    const inputs = this.form.querySelectorAll('input[type="email"], input[type="password"]');
    inputs.forEach(input => {
      input.addEventListener('blur', () => this.validateField(input));
      input.addEventListener('input', () => this.clearFieldError(input));
    });

    this.passwordToggle.addEventListener('click', this.togglePasswordVisibility.bind(this));
  }

  togglePasswordVisibility() {
    const passwordInput = document.getElementById('password');
    const eyeIcon = this.passwordToggle.querySelector('.eye-icon');
    if (passwordInput.type === 'password') {
      passwordInput.type = 'text';
      eyeIcon.innerHTML = `<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line>`;
    } else {
      passwordInput.type = 'password';
      eyeIcon.innerHTML = `<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle>`;
    }
  }

  validateField(field) {
    const fieldName = field.name || field.id;
    const value = field.value.trim();
    this.clearFieldError(field);

    switch (fieldName) {
      case 'email':
        if (!value) { this.showFieldError('email', 'Email is required'); return false; }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) { this.showFieldError('email', 'Enter a valid email'); return false; }
        break;
      case 'password':
        if (!value) { this.showFieldError('password', 'Password is required'); return false; }
        if (value.length < 6) { this.showFieldError('password', 'Password must be at least 6 characters'); return false; }
        break;
    }

    field.classList.add('success');
    return true;
  }

  showFieldError(fieldName, message) {
    const errorElement = document.getElementById(`${fieldName}Error`);
    const fieldElement = document.getElementById(fieldName);
    if (errorElement) errorElement.textContent = message;
    if (fieldElement) {
      fieldElement.classList.add('error');
      fieldElement.classList.remove('success');
      const formGroup = fieldElement.closest('.form-group');
      if (formGroup) {
        formGroup.classList.add('shake');
        setTimeout(() => formGroup.classList.remove('shake'), 500);
      }
    }
  }

  clearFieldError(field) {
    const fieldName = field.name || field.id;
    const errorElement = document.getElementById(`${fieldName}Error`);
    if (errorElement) errorElement.textContent = '';
    field.classList.remove('error');
  }

  async handleFormSubmit(e) {
    e.preventDefault();

    const emailField = document.getElementById('email');
    const passwordField = document.getElementById('password');

    let isValid = true;
    if (!this.validateField(emailField)) isValid = false;
    if (!this.validateField(passwordField)) isValid = false;
    if (!isValid) return;

    this.submitBtn.classList.add('loading');
    this.submitBtn.disabled = true;

    try {
      const userCredential = await signInWithEmailAndPassword(this.auth, emailField.value.trim(), passwordField.value);
      this.showSuccessMessage();
    } catch (error) {
      console.error('Sign in failed:', error);
      this.showFieldError('password', 'Invalid email or password');
    } finally {
      this.submitBtn.classList.remove('loading');
      this.submitBtn.disabled = false;
    }
  }

  showSuccessMessage() {
    const successDiv = document.createElement('div');
    successDiv.className = 'success-message';
    successDiv.innerHTML = `<strong>🎉 Welcome back!</strong><br>You have successfully signed in.`;

    this.form.parentNode.insertBefore(successDiv, this.form);

    setTimeout(() => {
      window.location.href = './dashboard/dashboard.html';
    }, 1500);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new SchoolForumSignIn();
});
