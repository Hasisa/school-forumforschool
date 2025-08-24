// Firebase configuration (replace with your keys)
const firebaseConfig = {
   apiKey: "AIzaSyCkU8o1vz4Tmo0yVRFrlq2_1_eDfI_GPaA",
   authDomain: "educonnect-958e2.firebaseapp.com",
   projectId: "educonnect-958e2",
   storageBucket: "educonnect-958e2.appspot.com",
   messagingSenderId: "1044066506835",
   appId: "1:1044066506835:web:ad2866ebfe60aa90978ea6"
};
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// Main Application Entry Point
class QuizGeneratorApp {
    constructor() {
        this.currentUser = null;
        this.init();
    }

    async init() {
        console.log('Initializing Quiz Generator App...');
        
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.start());
        } else {
            this.start();
        }

        auth.onAuthStateChanged(user => {
            this.currentUser = user;
            if (user) {
                console.log(`User logged in: ${user.email}`);
                this.loadSavedQuizzes();
            }
        });
    }

    async start() {
        try {
            this.setupUI();
            uiManager.updateOnlineStatus();
            uiManager.initializeTooltips();
            this.setupKeyboardShortcuts();
            this.setupAutoSave();
            console.log('Quiz Generator App initialized successfully!');
            setTimeout(() => {
                uiManager.showToast('Welcome to Quiz Generator! Create quizzes manually or with AI assistance.', 'info', 4000);
            }, 500);
        } catch (error) {
            console.error('Error initializing app:', error);
            uiManager.showToast('Error initializing app. Some features may not work properly.', 'error');
        }
    }

    // -------------------- Firebase Methods --------------------
    async saveCurrentQuizToFirebase() {
        if (!this.currentUser) return uiManager.showToast("Login required.", "error");
        const title = document.getElementById('quiz-title').value.trim();
        const questions = quizManager.currentQuiz.questions;
        if (!title || questions.length === 0) return uiManager.showToast("Add title and at least one question.", "warning");

        try {
            const ref = db.collection('users').doc(this.currentUser.uid).collection('quizzes');
            await ref.add({ title, questions, createdAt: firebase.firestore.FieldValue.serverTimestamp() });
            uiManager.showToast('Quiz saved successfully!', 'success');
        } catch (e) {
            console.error(e);
            uiManager.showToast('Error saving quiz.', 'error');
        }
    }

    async loadSavedQuizzes() {
        if (!this.currentUser) return;
        try {
            const ref = db.collection('users').doc(this.currentUser.uid).collection('quizzes');
            const snapshot = await ref.orderBy('createdAt', 'desc').get();
            const quizzes = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            quizManager.renderSavedQuizzes(quizzes);
        } catch (e) { console.error(e); }
    }

    // -------------------- UI Methods --------------------
    setupUI() {
        this.addButtonLoadingStates();
        this.setupFormValidation();
        this.setupResponsiveFeatures();
        this.setupAccessibility();
    }

    addButtonLoadingStates() {
        const buttons = document.querySelectorAll('button[type="button"]');
        buttons.forEach(button => {
            button.addEventListener('click', function () {
                const originalText = this.innerHTML;
                this.disabled = true;
                this.innerHTML = `<div style="display:flex;align-items:center;gap:8px;justify-content:center;">
                    <div style="width:12px;height:12px;border:2px solid transparent;border-top:2px solid currentColor;border-radius:50%;animation:spin 1s linear infinite;"></div>
                    <span>Processing...</span></div>`;
                setTimeout(() => {
                    if (this.disabled) { this.innerHTML = originalText; this.disabled = false; }
                }, 3000);
            });
        });
        if (!document.querySelector('#spin-animation')) {
            const style = document.createElement('style');
            style.id = 'spin-animation';
            style.textContent = '@keyframes spin {0%{transform:rotate(0deg);}100%{transform:rotate(360deg);}}';
            document.head.appendChild(style);
        }
    }

    setupFormValidation() {
        const inputs = document.querySelectorAll('input, textarea');
        inputs.forEach(input => {
            input.addEventListener('blur', () => this.validateField(input));
            input.addEventListener('input', () => this.clearFieldValidation(input));
        });
    }

    validateField(field) {
        const value = field.value.trim();
        let isValid = true, message = '';
        if (field.required && !value) { isValid = false; message = 'This field is required'; }
        if (field.type === 'text' && field.id.includes('title') && value.length > 0 && value.length < 3) {
            isValid = false; message = 'Title must be at least 3 characters long';
        }
        if (field.tagName === 'TEXTAREA' && value.length > 0 && value.length < 10) {
            isValid = false; message = 'Please provide more detailed content';
        }
        this.showFieldValidation(field, isValid, message);
        return isValid;
    }

    showFieldValidation(field, isValid, message) {
        this.clearFieldValidation(field);
        if (!isValid && message) {
            field.style.borderColor = 'var(--error)';
            const error = document.createElement('div');
            error.className = 'field-error';
            error.textContent = message;
            error.style.cssText = 'color:var(--error);font-size:0.8rem;margin-top:4px;padding-left:4px;';
            field.parentNode.insertBefore(error, field.nextSibling);
        } else field.style.borderColor = '';
    }

    clearFieldValidation(field) {
        field.style.borderColor = '';
        const error = field.parentNode.querySelector('.field-error');
        if (error) error.remove();
    }

    setupResponsiveFeatures() {
        let resizeTimeout;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => this.handleResize(), 250);
        });
        this.setupTouchGestures();
    }

    handleResize() {
        const container = document.querySelector('.container');
        if (window.innerWidth < 768) container.classList.add('mobile-view');
        else container.classList.remove('mobile-view');
        document.querySelectorAll('.quiz-modal, .confirm-modal').forEach(modal => {
            const content = modal.querySelector('.modal-content, .confirm-dialog');
            if (content) content.style.maxHeight = `${window.innerHeight * 0.9}px`;
        });
    }

    setupTouchGestures() {
        const cards = document.querySelectorAll('.quiz-card, .question-card');
        cards.forEach(card => {
            let startY = 0, currentY = 0;
            card.addEventListener('touchstart', e => startY = e.touches[0].clientY, { passive: true });
            card.addEventListener('touchmove', e => currentY = e.touches[0].clientY, { passive: true });
        });
    }

    setupAccessibility() {
        document.addEventListener('keydown', e => {
            if (e.key === 'Escape') document.querySelectorAll('.quiz-modal, .confirm-modal').forEach(m => m.remove());
        });
        this.addSkipNavigation();
        this.enhanceAccessibility();
    }

    addSkipNavigation() {
        const skip = document.createElement('a');
        skip.href = '#main-content';
        skip.textContent = 'Skip to main content';
        skip.className = 'skip-link';
        skip.style.cssText = 'position:absolute;top:-40px;left:6px;background:var(--primary-blue);color:white;padding:8px;text-decoration:none;border-radius:4px;z-index:100;transition:top 0.3s;';
        skip.addEventListener('focus', () => skip.style.top = '6px');
        skip.addEventListener('blur', () => skip.style.top = '-40px');
        document.body.insertBefore(skip, document.body.firstChild);
        document.querySelector('.main-content').id = 'main-content';
    }

    enhanceAccessibility() {
        document.querySelectorAll('.mode-btn').forEach(btn => btn.setAttribute('aria-label', `Switch to ${btn.dataset.mode} mode`));
        document.querySelector('.header').setAttribute('role', 'banner');
        document.querySelector('.main-content').setAttribute('role', 'main');
    }

    setupKeyboardShortcuts() {
        document.addEventListener('keydown', e => {
            if (e.ctrlKey || e.metaKey) {
                switch (e.key) {
                    case 's': e.preventDefault(); this.saveCurrentQuizToFirebase(); break;
                    case 'n': e.preventDefault(); this.addNewQuestion(); break;
                    case '1': e.preventDefault(); uiManager.switchMode('manual'); break;
                    case '2': e.preventDefault(); uiManager.switchMode('ai'); break;
                }
            }
        });
        this.addKeyboardShortcutsHelp();
    }

    addNewQuestion() {
        const btn = document.querySelector('.add-question-btn');
        if (btn && uiManager.currentMode === 'manual') btn.click();
    }

    addKeyboardShortcutsHelp() {
        const btn = document.createElement('button');
        btn.innerHTML = '⌨️';
        btn.title = 'Keyboard Shortcuts';
        btn.style.cssText = 'position:fixed;bottom:20px;right:20px;width:40px;height:40px;border:none;border-radius:50%;background:var(--primary-blue);color:white;font-size:16px;cursor:pointer;z-index:1000;';
        btn.addEventListener('click', () => this.showKeyboardShortcuts());
        document.body.appendChild(btn);
    }

    showKeyboardShortcuts() {
        const shortcuts = [
            { key: 'Ctrl/Cmd + S', action: 'Save current quiz' },
            { key: 'Ctrl/Cmd + N', action: 'Add new question' },
            { key: 'Ctrl/Cmd + 1', action: 'Switch to Manual mode' },
            { key: 'Ctrl/Cmd + 2', action: 'Switch to AI mode' },
            { key: 'Escape', action: 'Close modal/dialog' }
        ];
        const modal = document.createElement('div');
        modal.className = 'shortcuts-modal';
        modal.innerHTML = `<div class="modal-backdrop" onclick="this.parentElement.remove()"></div>
            <div class="shortcuts-dialog">
                <div class="shortcuts-header">
                    <h3>⌨️ Keyboard Shortcuts</h3>
                    <button class="modal-close" onclick="this.closest('.shortcuts-modal').remove()">×</button>
                </div>
                <div class="shortcuts-body">
                    ${shortcuts.map(s => `<div class="shortcut-item"><kbd>${s.key}</kbd><span>${s.action}</span></div>`).join('')}
                </div>
            </div>`;
        document.body.appendChild(modal);
    }

    setupAutoSave() {
        setInterval(() => this.saveDraft(), 30000);
        window.addEventListener('beforeunload', () => this.saveDraft());
    }

    saveDraft() {
        if (uiManager.currentMode === 'manual') {
            const title = document.getElementById('quiz-title').value.trim();
            const questions = quizManager.currentQuiz.questions;
            if (title || questions.length > 0) {
                localStorage.setItem('quiz-draft', JSON.stringify({ title, questions, mode: 'manual', lastSaved: new Date().toISOString() }));
            }
        }
    }

    loadDraft() {
        const draft = localStorage.getItem('quiz-draft');
        if (!draft) return;
        try {
            const data = JSON.parse(draft);
            if ((new Date() - new Date(data.lastSaved)) / (1000*60*60) < 24) {
                uiManager.showConfirmDialog(`Found a draft saved on ${new Date(data.lastSaved).toLocaleString()}. Restore?`, () => this.restoreDraft(data));
            }
        } catch(e){ console.error(e); }
    }

    restoreDraft(data) {
        uiManager.switchMode(data.mode);
        document.getElementById('quiz-title').value = data.title;
        quizManager.currentQuiz = { title: data.title, questions: data.questions };
        document.querySelector('.questions-list').innerHTML = '';
        data.questions.forEach((q,i) => quizManager.renderQuestion(i,q));
        uiManager.showToast('Draft restored successfully', 'success');
        localStorage.removeItem('quiz-draft');
    }
}

// Initialize application
window.addEventListener('load', () => window.quizApp = new QuizGeneratorApp());
if (typeof module !== 'undefined' && module.exports) module.exports = QuizGeneratorApp;
