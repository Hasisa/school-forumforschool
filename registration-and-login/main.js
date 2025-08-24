class SchoolForumRegistration {
  constructor() {
    this.form = document.getElementById('registrationForm');
    this.avatarInput = document.getElementById('avatarInput');
    this.avatarUpload = document.getElementById('avatarUpload');
    this.avatarPreview = document.getElementById('avatarPreview');
    this.passwordToggle = document.getElementById('passwordToggle');
    this.submitBtn = document.getElementById('submitBtn');
    this.passwordStrength = document.getElementById('passwordStrength');

    this.initializeEventListeners();
    this.initializeAvatarUpload();
    this.createPasswordTooltipStyle();
  }

  initializeEventListeners() {
    this.form.addEventListener('submit', this.handleFormSubmit.bind(this));

    const inputs = this.form.querySelectorAll('input[type="text"], input[type="email"], input[type="password"]');
    inputs.forEach(input => {
      input.addEventListener('blur', () => this.validateField(input));
      input.addEventListener('input', () => this.clearFieldError(input));
      input.addEventListener('focus', (e) => e.target.parentElement.classList.add('focused'));
      input.addEventListener('blur', (e) => {
        if (!e.target.value) e.target.parentElement.classList.remove('focused');
      });
    });

    const passwordInput = document.getElementById('password');
    passwordInput.addEventListener('input', this.checkPasswordStrength.bind(this));
    passwordInput.addEventListener('focus', () => this.showPasswordTooltip());
    passwordInput.addEventListener('blur', () => setTimeout(() => this.hidePasswordTooltip(), 200));

    this.passwordToggle.addEventListener('click', this.togglePasswordVisibility.bind(this));

    const confirmPasswordInput = document.getElementById('confirmPassword');
    confirmPasswordInput.addEventListener('input', this.validatePasswordMatch.bind(this));

    const termsCheckbox = document.getElementById('terms');
    termsCheckbox.addEventListener('change', () => this.validateField(termsCheckbox));
  }

  initializeAvatarUpload() {
    this.avatarUpload.addEventListener('click', () => this.avatarInput.click());
    this.avatarInput.addEventListener('change', (e) => this.processAvatarFile(e.target.files[0]));
    this.avatarUpload.addEventListener('dragover', (e) => { e.preventDefault(); this.avatarUpload.classList.add('dragover'); });
    this.avatarUpload.addEventListener('dragleave', (e) => { e.preventDefault(); this.avatarUpload.classList.remove('dragover'); });
    this.avatarUpload.addEventListener('drop', (e) => {
      e.preventDefault();
      this.avatarUpload.classList.remove('dragover');
      if (e.dataTransfer.files.length) this.processAvatarFile(e.dataTransfer.files[0]);
    });
  }

  processAvatarFile(file) {
    if (!file.type.match(/^image\/(jpeg|png|gif|webp)$/)) return this.showFieldError(this.avatarInput.id, 'Select valid image (PNG, JPG, GIF, WebP)');
    if (file.size > 5 * 1024 * 1024) return this.showFieldError(this.avatarInput.id, 'Image size must be <5MB');

    this.clearFieldError(this.avatarInput);

    const reader = new FileReader();
    reader.onload = (e) => {
      this.avatarPreview.innerHTML = `<img src="${e.target.result}" alt="Avatar preview" style="width:100%; height:100%; object-fit:cover; border-radius:50%;">`;
    };
    reader.readAsDataURL(file);
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

  checkPasswordStrength(e) {
    const password = e.target.value;
    const strengthFill = this.passwordStrength.querySelector('.strength-fill');
    const strengthText = this.passwordStrength.querySelector('.strength-text');

    let score = 0;
    if (password.length >= 8) score++;
    if (/[a-z]/.test(password)) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;

    const feedbacks = ['Very weak', 'Weak', 'Fair', 'Good', 'Strong'];
    const colors = ['#ef4444', '#f59e0b', '#eab308', '#22c55e', '#10b981'];
    const idx = Math.min(score - 1, 4);
    const feedback = score ? feedbacks[idx] : 'Very weak';
    const color = score ? colors[idx] : '#ef4444';

    strengthFill.style.width = `${(score/5)*100}%`;
    strengthFill.style.backgroundColor = color;
    strengthText.textContent = `Password strength: ${feedback}`;
    strengthText.style.color = color;
  }

  validatePasswordMatch() {
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    if (confirmPassword && password !== confirmPassword) {
      this.showFieldError('confirmPassword', 'Passwords do not match');
      return false;
    }
    this.clearFieldError(document.getElementById('confirmPassword'));
    return true;
  }

  validateField(field) {
    const value = (field.value || '').trim();
    const fieldName = field.id;
    this.clearFieldError(field);

    switch (fieldName) {
      case 'firstName':
      case 'lastName':
        if (!value) return this.showFieldError(fieldName, 'This field is required'), false;
        if (value.length < 2) return this.showFieldError(fieldName, 'At least 2 characters'), false;
        if (!/^[a-zA-Z\s'-]+$/.test(value)) return this.showFieldError(fieldName, 'Only letters, spaces, hyphens, apostrophes'), false;
        break;
      case 'email':
        if (!value) return this.showFieldError(fieldName, 'Email is required'), false;
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return this.showFieldError(fieldName, 'Invalid email'), false;
        break;
      case 'password':
        if (!value) return this.showFieldError(fieldName, 'Password is required'), false;
        if (value.length < 8) return this.showFieldError(fieldName, 'At least 8 characters'), false;
        break;
      case 'confirmPassword':
        if (!value) return this.showFieldError(fieldName, 'Confirm your password'), false;
        return this.validatePasswordMatch();
      case 'terms':
        if (!field.checked) return this.showFieldError(fieldName, 'You must agree to terms'), false;
    }
    field.classList.add('success');
    return true;
  }

  showFieldError(fieldName, message) {
    const errorEl = document.getElementById(`${fieldName}Error`);
    const fieldEl = document.getElementById(fieldName);
    if (errorEl) errorEl.textContent = message;
    if (fieldEl) {
      fieldEl.classList.add('error'); 
      fieldEl.classList.remove('success');
      const formGroup = fieldEl.closest('.form-group');
      if (formGroup) { formGroup.classList.add('shake'); setTimeout(() => formGroup.classList.remove('shake'), 500); }
    }
  }

  clearFieldError(field) {
    const errorEl = document.getElementById(`${field.id}Error`);
    if (errorEl) errorEl.textContent = '';
    field.classList.remove('error');
  }

  async handleFormSubmit(e) {
    e.preventDefault();
    const fields = ['firstName','lastName','email','password','confirmPassword','terms'].map(id => document.getElementById(id));
    if (!fields.every(f => this.validateField(f))) return;

    this.submitBtn.classList.add('loading'); this.submitBtn.disabled = true;
    try { await this.simulateRegistration(); this.showSuccessMessage(); }
    catch(e){ console.error(e); this.showFieldError('terms','Registration failed'); }
    finally { this.submitBtn.classList.remove('loading'); this.submitBtn.disabled = false; }
  }

  async simulateRegistration() { return new Promise(r => setTimeout(r, 2000)); }

  showSuccessMessage() {
    const data = Object.fromEntries(new FormData(this.form).entries());
    const successDiv = document.createElement('div');
    successDiv.className = 'success-message';
    successDiv.innerHTML = `<strong>🎉 Registration Successful!</strong><br>Welcome ${data.firstName} ${data.lastName}! Email: ${data.email}`;
    this.form.parentNode.insertBefore(successDiv, this.form);
    this.form.reset();
    this.avatarPreview.innerHTML = `<div class="avatar-placeholder"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg></div>`;
    const strengthFill = this.passwordStrength.querySelector('.strength-fill');
    const strengthText = this.passwordStrength.querySelector('.strength-text');
    strengthFill.style.width='0%'; strengthText.textContent='Password strength'; strengthText.style.color='var(--text-light)';
    setTimeout(()=>successDiv.remove(),5000);
    console.log('Registration Data:', {...data, hasAvatar: this.avatarInput.files.length>0, timestamp: new Date().toISOString()});
  }

  createPasswordTooltipStyle() {
    if (document.getElementById('passwordTooltipStyle')) return;
    const style = document.createElement('style');
    style.id='passwordTooltipStyle';
    style.textContent=`
      .password-tooltip {position:absolute; top:100%; left:0; right:0; background:var(--card-background); border:1px solid var(--border-color); border-radius:var(--border-radius); box-shadow:var(--shadow-lg); z-index:10; margin-top:4px; opacity:0; animation:fadeInTooltip 0.2s ease-out forwards;}
      .tooltip-content {padding:12px; font-size:12px; color:var(--text-secondary);}
      .tooltip-content p {margin:0 0 8px 0; font-weight:500; color:var(--text-primary);}
      .tooltip-content ul {margin:0; padding-left:16px;}
      .tooltip-content li {margin-bottom:4px;}
      @keyframes fadeInTooltip {from{opacity:0;transform:translateY(-8px);}to{opacity:1;transform:translateY(0);}}
    `;
    document.head.appendChild(style);
  }

  showPasswordTooltip() {
    if (document.getElementById('passwordTooltip')) return;
    const tooltip = document.createElement('div');
    tooltip.id='passwordTooltip';
    tooltip.className='password-tooltip';
    tooltip.innerHTML=`<div class="tooltip-content">
      <p><strong>Password requirements:</strong></p>
      <ul>
        <li>At least 8 characters long</li>
        <li>Include uppercase and lowercase letters</li>
        <li>Include at least one number</li>
        <li>Include special characters</li>
      </ul>
    </div>`;
    const passwordGroup = document.getElementById('password').closest('.form-group');
    passwordGroup.style.position='relative';
    passwordGroup.appendChild(tooltip);
  }

  hidePasswordTooltip() {
    const tooltip = document.getElementById('passwordTooltip');
    if (tooltip) tooltip.remove();
  }
}

document.addEventListener('DOMContentLoaded', () => new SchoolForumRegistration());
