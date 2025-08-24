class DashboardManager {
  constructor() {
    this.currentUserData = null;
    this.saveTimeout = null;
    this.elements = {};

    // Для доступа к Firebase compat (если глобальный объект доступен)
    this.firebaseInstance = window.firebase || firebase;
  }

  // Initialize dashboard
  init() {
    this.cacheElements();
    this.setupEventListeners();
  }

  // Cache DOM elements for performance
  cacheElements() {
    this.elements = {
      userAvatar: document.getElementById('user-avatar'),
      avatarFallback: document.getElementById('avatar-fallback'),
      avatarInitials: document.getElementById('avatar-initials'),
      userFullname: document.getElementById('user-fullname'),
      userEmail: document.getElementById('user-email'),
      userDescription: document.getElementById('user-description'),
      saveDescriptionBtn: document.getElementById('save-description-btn'),
      saveStatus: document.getElementById('save-status')
    };
  }

  // Set up event listeners
  setupEventListeners() {
    this.elements.saveDescriptionBtn.addEventListener('click', () => {
      this.saveDescription();
    });

    this.elements.userDescription.addEventListener('input', () => {
      this.debounceSave();
    });

    this.elements.userDescription.addEventListener('keydown', (e) => {
      if (e.ctrlKey && e.key === 'Enter') {
        e.preventDefault();
        this.saveDescription();
      }
    });
  }

  // Load user data from Firestore
  async loadUserData(userId) {
    try {
      const userDocRef = window.firebaseDb.collection('users').doc(userId);
      const userDoc = await userDocRef.get();

      if (userDoc.exists) {
        this.currentUserData = userDoc.data();
        this.displayUserData();
        this.setupRealtimeListener(userId);
      } else {
        // Если документа нет, создаем новый
        await userDocRef.set({
          firstName: '',
          lastName: '',
          email: window.firebaseAuth.currentUser.email || '',
          avatarURL: '',
          description: '',
          createdAt: new Date()
        });
        this.currentUserData = {
          firstName: '',
          lastName: '',
          email: window.firebaseAuth.currentUser.email || '',
          avatarURL: '',
          description: ''
        };
        this.displayUserData();
        this.setupRealtimeListener(userId);
      }
    } catch (error) {
      console.error('Error loading user data:', error);
      this.showError('Failed to load user profile');
    }
  }

  // Set up real-time listener
  setupRealtimeListener(userId) {
    window.firebaseDb.collection('users').doc(userId).onSnapshot((doc) => {
      if (doc.exists) {
        this.currentUserData = doc.data();
        this.displayUserData(false);
      }
    });
  }

  // Display user info
  displayUserData(updateDescription = true) {
    const { firstName = '', lastName = '', email = '', description = '', avatarURL = '' } = this.currentUserData;

    const fullName = `${firstName} ${lastName}`.trim() || 'User Name';
    this.elements.userFullname.textContent = fullName;

    this.elements.userEmail.textContent = email || 'No email';

    if (updateDescription && !this.elements.userDescription.matches(':focus')) {
      this.elements.userDescription.value = description || '';
    }

    this.updateAvatar(avatarURL, firstName, lastName);
  }

  // Avatar logic
  updateAvatar(avatarUrl, firstName, lastName) {
    const initials = this.getInitials(firstName, lastName);
    this.elements.avatarInitials.textContent = initials;

    if (avatarUrl) {
      this.elements.userAvatar.src = avatarUrl;
      this.elements.userAvatar.style.display = 'block';
      this.elements.avatarFallback.style.display = 'none';

      this.elements.userAvatar.onerror = () => {
        this.elements.userAvatar.style.display = 'none';
        this.elements.avatarFallback.style.display = 'flex';
        this.elements.userAvatar.onerror = null; // Чтобы обработчик сработал один раз
      };
    } else {
      this.elements.userAvatar.style.display = 'none';
      this.elements.avatarFallback.style.display = 'flex';
    }
  }

  getInitials(firstName, lastName) {
    const first = (firstName || '').charAt(0).toUpperCase();
    const last = (lastName || '').charAt(0).toUpperCase();
    return (first + last) || 'U';
  }

  debounceSave() {
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
    }
    this.saveTimeout = setTimeout(() => {
      this.saveDescription(false);
    }, 2000);
  }

  async saveDescription(showFeedback = true) {
    const user = window.firebaseAuth.currentUser;
    if (!user) {
      this.showError('No user authenticated');
      return;
    }

    const description = this.elements.userDescription.value.trim();

    try {
      if (showFeedback) {
        this.elements.saveDescriptionBtn.disabled = true;
        this.elements.saveDescriptionBtn.textContent = 'Saving...';
      }

      await window.firebaseDb.collection('users').doc(user.uid).update({
        description,
        updatedAt: this.firebaseInstance.firestore.FieldValue.serverTimestamp()
      });

      if (showFeedback) {
        this.showSaveStatus('Description saved successfully!', 'success');
        this.elements.saveDescriptionBtn.disabled = false;
        this.elements.saveDescriptionBtn.textContent = 'Save Description';
      }

      if (this.saveTimeout) {
        clearTimeout(this.saveTimeout);
        this.saveTimeout = null;
      }
    } catch (error) {
      console.error('Error saving description:', error);
      if (showFeedback) {
        this.showSaveStatus('Failed to save description', 'error');
        this.elements.saveDescriptionBtn.disabled = false;
        this.elements.saveDescriptionBtn.textContent = 'Save Description';
      }
    }
  }

  showSaveStatus(message, type) {
    this.elements.saveStatus.textContent = message;
    this.elements.saveStatus.className = `save-status ${type}`;
    this.elements.saveStatus.classList.remove('hidden');
    setTimeout(() => {
      this.elements.saveStatus.classList.add('hidden');
    }, 3000);
  }

  showError(message) {
    this.showSaveStatus(message, 'error');
  }

  reset() {
    this.currentUserData = null;
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
      this.saveTimeout = null;
    }
  }
}

// Инициализация DashboardManager
document.addEventListener('DOMContentLoaded', () => {
  const dashboardManager = new DashboardManager();
  dashboardManager.init();

  window.firebaseAuth.onAuthStateChanged(user => {
    if (user) {
      dashboardManager.loadUserData(user.uid);
      document.getElementById('loading-screen').classList.add('hidden');
      document.getElementById('dashboard').classList.remove('hidden');
    } else {
      window.location.href = '/registration-and-login/signin.html';
    }
  });
});
