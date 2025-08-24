// Main Application Controller
class App {
  constructor() {
    this.elements = {
      loadingScreen: document.getElementById('loading-screen'),
      dashboard: document.getElementById('dashboard')
    };
    
    this.init();
  }

  // Initialize the application
  init() {
    this.setupAuthStateListener();
    dashboardManager.init();
  }

  // Set up authentication state listener
  setupAuthStateListener() {
    firebaseAuth.onAuthStateChanged((user) => {
      if (user) {
        // User is signed in
        this.showDashboard();
        dashboardManager.loadUserData(user.uid);
      } else {
        // No user is signed in - show loading screen
        this.showLoading();
        console.log('No user authenticated. Please ensure a user is signed in.');
      }
    });
  }

  // Show loading screen
  showLoading() {
    this.elements.loadingScreen.classList.remove('hidden');
    this.elements.dashboard.classList.add('hidden');
  }

  // Show dashboard
  showDashboard() {
    this.elements.loadingScreen.classList.add('hidden');
    this.elements.dashboard.classList.remove('hidden');
  }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  new App();
});