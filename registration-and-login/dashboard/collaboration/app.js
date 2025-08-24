class App {
    constructor() {
        this.currentSection = 'groups';
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.showSection('groups');
    }

    setupEventListeners() {
        // Navigation items
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', () => {
                const section = item.dataset.section;
                this.showSection(section);
            });
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                document.querySelectorAll('.modal-overlay.active').forEach(modal => modal.classList.remove('active'));
            }
            if (e.ctrlKey && e.key.toLowerCase() === 'n') {
                e.preventDefault();
                this.handleNewItemShortcut();
            }
        });

        // Browser back/forward
        window.addEventListener('popstate', (e) => {
            if (e.state?.section) this.showSection(e.state.section, false);
        });
    }

    showSection(sectionName, updateHistory = true) {
        this.currentSection = sectionName;

        // Navigation highlight
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.toggle('active', item.dataset.section === sectionName);
        });

        // Show/hide sections
        document.querySelectorAll('.section').forEach(section => section.style.display = 'none');
        const target = document.getElementById(`${sectionName}Section`);
        if (target) {
            target.style.display = 'block';
            target.classList.add('fade-in');
        }

        // Update history
        if (updateHistory) history.pushState({ section: sectionName }, '', `#${sectionName}`);

        // Section-specific actions
        if (sectionName === 'groups') this.resetBreadcrumb();
    }

    resetBreadcrumb() {
        const breadcrumb = document.getElementById('breadcrumb');
        breadcrumb.innerHTML = '<span class="breadcrumb-item active">Groups</span>';
    }

    handleNewItemShortcut() {
        switch (this.currentSection) {
            case 'groups':
                groupsManager?.showCreateGroupModal();
                break;
            case 'projects':
                projectsManager?.showCreateProjectModal();
                break;
            case 'tasks':
                tasksManager?.showCreateTaskModal();
                break;
        }
    }

    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
                <span>${message}</span>
            </div>
        `;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 1rem 1.5rem;
            border-radius: 8px;
            color: white;
            font-weight: 500;
            z-index: 3000;
            background: ${type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#3b82f6'};
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            animation: slideIn 0.3s ease-out;
        `;
        document.body.appendChild(notification);

        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease-in';
            setTimeout(() => notification.remove(), 300);
        }, 3000);

        if (!document.getElementById('notification-styles')) {
            const style = document.createElement('style');
            style.id = 'notification-styles';
            style.textContent = `
                @keyframes slideIn {
                    from { transform: translateX(100%); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
                @keyframes slideOut {
                    from { transform: translateX(0); opacity: 1; }
                    to { transform: translateX(100%); opacity: 0; }
                }
                .notification-content { display: flex; align-items: center; gap: 0.5rem; }
            `;
            document.head.appendChild(style);
        }
    }

    showLoading(show) {
        const spinner = document.getElementById('loadingSpinner');
        spinner?.classList.toggle('active', show);
    }

    getCurrentSection() { return this.currentSection; }

    generateId() { return '_' + Math.random().toString(36).substr(2, 9); }

    formatDate(date, includeTime = false) {
        const options = { year: 'numeric', month: 'short', day: 'numeric' };
        if (includeTime) { options.hour = '2-digit'; options.minute = '2-digit'; }
        return new Date(date).toLocaleDateString('en-US', options);
    }

    debounce(func, wait) {
        let timeout;
        return (...args) => {
            clearTimeout(timeout);
            timeout = setTimeout(() => func(...args), wait);
        };
    }
}

// Initialize app
const app = new App();
window.app = app;

// Global error handling
window.addEventListener('error', e => {
    console.error('Global Error:', e.error);
    app.showNotification('An error occurred. Please try again.', 'error');
});
window.addEventListener('unhandledrejection', e => {
    console.error('Unhandled Promise Rejection:', e.reason);
    app.showNotification('An error occurred. Please try again.', 'error');
});

console.log('Collaboration Hub initialized successfully!');
