// UI Management System
class UIManager {
    constructor() {
        this.currentMode = 'manual';
        this.initializeEventListeners();
        this.updateOnlineStatus();
        this.initializeTooltips();
    }

    initializeEventListeners() {
        // Mode switching
        document.querySelectorAll('.mode-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const mode = btn.dataset.mode;
                if (mode) this.switchMode(mode);
            });
        });

        // Toast auto-close setup
        this.setupToastAutoClose();
    }

    switchMode(mode) {
        if (!mode || mode === this.currentMode) return;

        this.currentMode = mode;

        // Update mode buttons
        document.querySelectorAll('.mode-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.mode === mode);
        });

        // Update sections
        document.querySelectorAll('.quiz-section').forEach(section => {
            const isActive = (mode === 'manual' && section.classList.contains('manual-section')) ||
                            (mode === 'ai' && section.classList.contains('ai-section'));
            section.classList.toggle('active', isActive);
        });

        // Reset forms
        this.resetCurrentModeForm(mode);
    }

    resetCurrentModeForm(mode) {
        if (mode === 'manual') {
            const quizTitle = document.getElementById('quiz-title');
            const questionsList = document.querySelector('.questions-list');
            if (!window.quizManager.editingQuizId) {
                if (quizTitle) quizTitle.value = '';
                if (questionsList) questionsList.innerHTML = '';
                window.quizManager.currentQuiz = { title: '', questions: [] };
            }
        } else if (mode === 'ai') {
            const aiTitle = document.getElementById('ai-quiz-title');
            const studyMaterial = document.getElementById('study-material');
            const questionCount = document.getElementById('question-count');
            const preview = document.querySelector('.generated-quiz-preview');
            if (aiTitle) aiTitle.value = '';
            if (studyMaterial) studyMaterial.value = '';
            if (questionCount) questionCount.value = '10';
            if (preview) preview.style.display = 'none';
        }
    }

    showLoading(message = 'Loading...') {
        const overlay = document.getElementById('loading-overlay');
        if (!overlay) return;
        const text = overlay.querySelector('.loading-text');
        if (text) text.textContent = message;
        overlay.classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    hideLoading() {
        const overlay = document.getElementById('loading-overlay');
        if (!overlay) return;
        overlay.classList.remove('active');
        document.body.style.overflow = '';
    }

    showToast(message, type = 'info', duration = 5000) {
        const container = document.getElementById('toast-container');
        if (!container) return;

        const icons = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' };
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerHTML = `
            <span class="toast-icon">${icons[type] || icons.info}</span>
            <span class="toast-message">${message}</span>
            <button class="toast-close">×</button>
        `;
        container.appendChild(toast);

        // Auto remove
        if (duration > 0) {
            setTimeout(() => {
                if (toast.parentElement) toast.remove();
            }, duration);
        }

        toast.querySelector('.toast-close')?.addEventListener('click', () => toast.remove());
    }

    setupToastAutoClose() {
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.toast') && !e.target.closest('#toast-container')) return;
        });
    }

    showConfirmDialog(message, callback) {
        if (typeof callback !== 'function') callback = () => {};

        const modal = document.createElement('div');
        modal.className = 'confirm-modal';
        modal.innerHTML = `
            <div class="modal-backdrop"></div>
            <div class="confirm-dialog">
                <div class="confirm-header"><h3>Confirm Action</h3></div>
                <div class="confirm-body"><p>${message}</p></div>
                <div class="confirm-actions">
                    <button class="btn btn-secondary cancel-btn">Cancel</button>
                    <button class="btn btn-primary confirm-btn">Confirm</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);

        modal.querySelector('.cancel-btn')?.addEventListener('click', () => modal.remove());
        modal.querySelector('.modal-backdrop')?.addEventListener('click', () => modal.remove());
        modal.querySelector('.confirm-btn')?.addEventListener('click', () => {
            callback();
            modal.remove();
        });

        if (!document.getElementById('confirm-styles')) {
            const style = document.createElement('style');
            style.id = 'confirm-styles';
            style.textContent = `
                .confirm-modal {position:fixed;top:0;left:0;width:100%;height:100%;z-index:2500;display:flex;align-items:center;justify-content:center;}
                .confirm-dialog {position:relative;background:white;border-radius:12px;max-width:400px;width:90%;box-shadow:0 20px 25px -5px rgba(0,0,0,0.1);}
                .confirm-header {padding:20px 24px 0;}
                .confirm-header h3 {margin:0;color:var(--gray-900);}
                .confirm-body {padding:16px 24px;}
                .confirm-body p {margin:0;color:var(--gray-600);line-height:1.5;}
                .confirm-actions {padding:16px 24px 20px;display:flex;gap:12px;justify-content:flex-end;}
            `;
            document.head.appendChild(style);
        }
    }

    highlightElement(selector, duration = 2000) {
        const element = document.querySelector(selector);
        if (!element) return;
        element.style.transition = 'box-shadow 0.3s ease';
        element.style.boxShadow = '0 0 0 3px rgba(59,130,246,0.5)';
        setTimeout(() => element.style.boxShadow = '', duration);
    }

    smoothScrollTo(selector) {
        const element = document.querySelector(selector);
        if (!element) return;
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    showProgress(current, total, message = 'Processing...') {
        const overlay = document.getElementById('loading-overlay');
        const text = overlay?.querySelector('.loading-text');
        if (!overlay || !text) return;

        const percentage = Math.round((current / total) * 100);
        text.innerHTML = `
            ${message}<br>
            <div style="margin-top:12px;background:rgba(255,255,255,0.2);border-radius:10px;height:6px;">
                <div style="background:var(--primary-blue);height:100%;border-radius:10px;width:${percentage}%;transition:width 0.3s ease;"></div>
            </div>
            <small style="margin-top:8px;display:block;opacity:0.8;">${current} of ${total} completed (${percentage}%)</small>
        `;
    }

    updateOnlineStatus() {
        const showStatus = (online) => this.showToast(
            online ? 'Connection restored' : 'You are offline. Changes will be saved locally.',
            online ? 'success' : 'warning',
            3000
        );

        window.addEventListener('online', () => showStatus(true));
        window.addEventListener('offline', () => showStatus(false));
    }

    initializeTooltips() {
        document.querySelectorAll('[data-tooltip]').forEach(el => {
            el.addEventListener('mouseenter', () => this.showTooltip(el, el.dataset.tooltip));
            el.addEventListener('mouseleave', () => this.hideTooltip());
        });
    }

    showTooltip(element, text) {
        if (!element || !text) return;
        this.hideTooltip();

        const tooltip = document.createElement('div');
        tooltip.className = 'custom-tooltip';
        tooltip.textContent = text;
        tooltip.style.cssText = `
            position:absolute;background:var(--gray-800);color:white;padding:6px 10px;
            border-radius:6px;font-size:0.8rem;z-index:3000;pointer-events:none;white-space:nowrap;
        `;
        document.body.appendChild(tooltip);

        const rect = element.getBoundingClientRect();
        const tooltipRect = tooltip.getBoundingClientRect();
        tooltip.style.left = `${rect.left + (rect.width - tooltipRect.width) / 2}px`;
        tooltip.style.top = `${rect.top - tooltipRect.height - 8}px`;
    }

    hideTooltip() {
        document.querySelector('.custom-tooltip')?.remove();
    }
}

// Global instance
window.uiManager = new UIManager();
