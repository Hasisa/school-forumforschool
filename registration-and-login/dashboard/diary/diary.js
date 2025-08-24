// Firebase Configuration
const firebaseConfig = {
    apiKey: "AIzaSyCkU8o1vz4Tmo0yVRFrlq2_1_eDfI_GPaA",
    authDomain: "educonnect-958e2.firebaseapp.com",
    projectId: "educonnect-958e2",
    storageBucket: "educonnect-958e2.firebasestorage.com",
    messagingSenderId: "1044066506835",
    appId: "1:1044066506835:web:ad2866ebfe60aa90978ea6",
};

// Initialize Firebase
let db;
let isFirebaseConfigured = false;
let currentUser = null;

try {
    firebase.initializeApp(firebaseConfig);
    db = firebase.firestore();
    isFirebaseConfigured = true;
} catch (error) {
    console.warn('Firebase not configured properly:', error);
    isFirebaseConfigured = false;
}

// Auth state listener
firebase.auth().onAuthStateChanged(user => {
    if (user) {
        currentUser = user;
        loadEntries();
    } else {
        currentUser = null;
        entries = [];
        updateUI();
    }
});

// DOM Elements
const entryTextarea = document.getElementById('entryText');
const saveBtn = document.getElementById('saveBtn');
const entriesContainer = document.getElementById('entriesContainer');
const emptyState = document.getElementById('emptyState');
const charCount = document.getElementById('charCount');
const totalEntries = document.getElementById('totalEntries');
const loadingOverlay = document.getElementById('loadingOverlay');
const configModal = document.getElementById('configModal');
const configOkBtn = document.getElementById('configOkBtn');

let entries = [];
let isLoading = false;

// Character counter
entryTextarea.addEventListener('input', () => {
    const count = entryTextarea.value.length;
    charCount.textContent = count;
    saveBtn.disabled = count === 0 || isLoading;
});

function showLoading() { isLoading = true; loadingOverlay.classList.remove('hidden'); updateSaveButtonState(); }
function hideLoading() { isLoading = false; loadingOverlay.classList.add('hidden'); updateSaveButtonState(); }
function updateSaveButtonState() { saveBtn.disabled = entryTextarea.value.length === 0 || isLoading; }

// Format date
function formatDate(date) {
    const now = new Date();
    const entryDate = new Date(date);
    const diffMs = now - entryDate;
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins === 1 ? '' : 's'} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
    
    return entryDate.toLocaleDateString('en-US', { year:'numeric', month:'short', day:'numeric', hour:'2-digit', minute:'2-digit' });
}

// Escape HTML
function escapeHtml(text) { const div = document.createElement('div'); div.textContent = text; return div.innerHTML; }

// Create entry HTML
function createEntryHTML(entry) {
    return `
    <div class="entry-card" data-id="${entry.id}">
      <div class="entry-header">
        <div class="entry-date">${formatDate(entry.createdAt)}</div>
        <div class="entry-actions">
          <button class="delete-btn" onclick="deleteEntry('${entry.id}')" title="Delete entry">🗑️</button>
        </div>
      </div>
      <div class="entry-content">${escapeHtml(entry.content)}</div>
    </div>`;
}

// Update UI
function updateUI() {
    totalEntries.textContent = entries.length;
    if (entries.length === 0) {
        emptyState.style.display = 'block';
        entriesContainer.style.display = 'none';
    } else {
        emptyState.style.display = 'none';
        entriesContainer.style.display = 'grid';
        entries.sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt));
        entriesContainer.innerHTML = entries.map(createEntryHTML).join('');
    }
}

// Save entry
async function saveEntry() {
    if (!currentUser) { alert('You must be logged in to save entries.'); return; }

    const content = entryTextarea.value.trim();
    if (!content) { alert('Please write something before saving!'); return; }

    showLoading();

    try {
        const entry = {
            content: content,
            createdAt: new Date().toISOString(),
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        };

        const docRef = await db.collection('users')
            .doc(currentUser.uid)
            .collection('diary-entries')
            .add(entry);

        entries.push({ id: docRef.id, ...entry });
        entryTextarea.value = '';
        charCount.textContent = '0';
        updateUI();
        showSuccessMessage('Entry saved successfully! ✨');
    } catch (error) {
        console.error('Error saving entry:', error);
        alert('Failed to save entry. Please try again.');
    }

    hideLoading();
}

// Delete entry
async function deleteEntry(entryId) {
    if (!currentUser) { alert('You must be logged in.'); return; }
    if (!confirm('Are you sure you want to delete this entry?')) return;

    const entryCard = document.querySelector(`[data-id="${entryId}"]`);
    entryCard.classList.add('deleting');

    try {
        await db.collection('users')
            .doc(currentUser.uid)
            .collection('diary-entries')
            .doc(entryId)
            .delete();

        entries = entries.filter(e=>e.id!==entryId);
        setTimeout(updateUI, 300);
    } catch (error) {
        console.error('Error deleting entry:', error);
        alert('Failed to delete entry.');
        entryCard.classList.remove('deleting');
    }
}

// Load entries
async function loadEntries() {
    if (!currentUser) { return; }

    showLoading();

    try {
        const snapshot = await db.collection('users')
            .doc(currentUser.uid)
            .collection('diary-entries')
            .orderBy('createdAt', 'desc')
            .get();

        entries = [];
        snapshot.forEach(doc=>{
            const data = doc.data();
            entries.push({ id: doc.id, content: data.content, createdAt: data.createdAt || new Date().toISOString() });
        });

        updateUI();
    } catch (error) {
        console.error('Error loading entries:', error);
        alert('Failed to load entries.');
    }

    hideLoading();
}

// Show success message
function showSuccessMessage(message) {
    const successDiv = document.createElement('div');
    successDiv.style.cssText = `
        position: fixed; top: 2rem; right: 2rem; background: linear-gradient(135deg,#10b981,#059669);
        color: white; padding:1rem 2rem; border-radius:.75rem; font-weight:600;
        box-shadow:0 10px 15px -3px rgb(0 0 0 / 0.1),0 4px 6px -4px rgb(0 0 0 / 0.1);
        z-index:1000; animation: slideInRight 0.3s ease-out, fadeOut 0.3s ease-out 2.7s forwards; max-width:300px;`;
    successDiv.textContent = message;
    document.body.appendChild(successDiv);
    setTimeout(()=>document.body.removeChild(successDiv),3000);
}

// Event listeners
saveBtn.addEventListener('click', saveEntry);
entryTextarea.addEventListener('keydown', e=>{ if((e.ctrlKey||e.metaKey)&&e.key==='Enter'){e.preventDefault(); if(!saveBtn.disabled) saveEntry(); } });

// Auto-resize textarea
entryTextarea.addEventListener('input', function() { this.style.height='auto'; this.style.height=Math.max(150,this.scrollHeight)+'px'; });

// Make deleteEntry globally accessible
window.deleteEntry = deleteEntry;

// Initialize UI
document.addEventListener('DOMContentLoaded', ()=>{
    updateSaveButtonState();
});
