// Authentication Management
class AuthManager {
    constructor() {
        this.currentUser = null;
        this.init();
    }

    init() {
        // Listen for auth state changes
        auth.onAuthStateChanged((user) => {
            this.currentUser = user;
            this.updateUI(user);
        });

        // Setup event listeners
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Auth toggle buttons
        document.querySelectorAll('.auth-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const formType = e.target.dataset.form;
                this.showAuthForm(formType);
            });
        });

        // Login form
        document.getElementById('loginForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.login();
        });

        // Signup form
        document.getElementById('signupForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.signup();
        });

        // Logout button
        document.getElementById('logoutBtn').addEventListener('click', () => {
            this.logout();
        });
    }

    showAuthForm(formType) {
        // Update toggle buttons
        document.querySelectorAll('.auth-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.form === formType);
        });

        // Show/hide forms
        document.querySelectorAll('.auth-form').forEach(form => {
            form.classList.toggle('active', form.id === `${formType}Form`);
        });
    }

    async login() {
        const email = document.getElementById('loginEmail').value;
        const password = document.getElementById('loginPassword').value;

        try {
            this.showLoading(true);
            await auth.signInWithEmailAndPassword(email, password);
            this.showNotification('Login successful!', 'success');
        } catch (error) {
            this.showNotification(error.message, 'error');
        } finally {
            this.showLoading(false);
        }
    }

    async signup() {
        const name = document.getElementById('signupName').value;
        const email = document.getElementById('signupEmail').value;
        const password = document.getElementById('signupPassword').value;

        try {
            this.showLoading(true);
            const result = await auth.createUserWithEmailAndPassword(email, password);
            
            // Update user profile with name
            await result.user.updateProfile({
                displayName: name
            });

            // Create user document in Firestore
            await db.collection('users').doc(result.user.uid).set({
                name: name,
                email: email,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });

            this.showNotification('Account created successfully!', 'success');
        } catch (error) {
            this.showNotification(error.message, 'error');
        } finally {
            this.showLoading(false);
        }
    }

    async logout() {
        try {
            await auth.signOut();
            this.showNotification('Logged out successfully!', 'success');
        } catch (error) {
            this.showNotification(error.message, 'error');
        }
    }

    updateUI(user) {
        const authSection = document.getElementById('authSection');
        const authForms = document.getElementById('authForms');
        const userInfo = document.getElementById('userInfo');
        const mainContent = document.getElementById('mainContent');

        if (user) {
            // Show user info, hide auth forms
            authForms.style.display = 'none';
            userInfo.style.display = 'flex';
            mainContent.style.display = 'block';

            // Update user info
            document.getElementById('userName').textContent = user.displayName || 'User';
            document.getElementById('userEmail').textContent = user.email;
            
            // Set user avatar
            const userAvatar = document.getElementById('userAvatar');
            userAvatar.innerHTML = user.photoURL ? 
                `<img src="${user.photoURL}" alt="Avatar" style="width: 100%; height: 100%; border-radius: 50%;">` :
                `<i class="fas fa-user"></i>`;

            // Initialize app data
            window.app?.init();
        } else {
            // Show auth forms, hide user info
            authForms.style.display = 'block';
            userInfo.style.display = 'none';
            mainContent.style.display = 'none';
        }
    }

    showLoading(show) {
        const spinner = document.getElementById('loadingSpinner');
        spinner.classList.toggle('active', show);
    }

    showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
                <span>${message}</span>
            </div>
        `;

        // Add styles
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 1rem 1.5rem;
            border-radius: 8px;
            color: white;
            font-weight: 500;
            z-index: 3000;
            animation: slideIn 0.3s ease-out;
            background: ${type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#3b82f6'};
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        `;

        document.body.appendChild(notification);

        // Remove after 3 seconds
        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease-in';
            setTimeout(() => {
                notification.remove();
            }, 300);
        }, 3000);

        // Add animation styles if not already present
        if (!document.querySelector('#notification-styles')) {
            const styles = document.createElement('style');
            styles.id = 'notification-styles';
            styles.textContent = `
                @keyframes slideIn {
                    from {
                        transform: translateX(100%);
                        opacity: 0;
                    }
                    to {
                        transform: translateX(0);
                        opacity: 1;
                    }
                }
                @keyframes slideOut {
                    from {
                        transform: translateX(0);
                        opacity: 1;
                    }
                    to {
                        transform: translateX(100%);
                        opacity: 0;
                    }
                }
                .notification-content {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                }
            `;
            document.head.appendChild(styles);
        }
    }
}

// Initialize auth manager
const authManager = new AuthManager();
window.authManager = authManager;