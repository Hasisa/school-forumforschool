// Firebase Configuration
const firebaseConfig = {
    apiKey: "AIzaSyCkU8o1vz4Tmo0yVRFrlq2_1_eDfI_GPaA",
    authDomain: "educonnect-958e2.firebaseapp.com",
    projectId: "educonnect-958e2",
    storageBucket: "educonnect-958e2.appspot.com",
    messagingSenderId: "1044066506835",
    appId: "1:1044066506835:web:ad2866ebfe60aa90978ea6"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// DOM Elements
const searchInput = document.getElementById('searchInput');
const searchBtn = document.getElementById('searchBtn');
const resultsContainer = document.getElementById('resultsContainer');
const loadingSpinner = document.getElementById('loadingSpinner');
const noResultsContainer = document.getElementById('noResultsContainer');
const aiExplainBtn = document.getElementById('aiExplainBtn');
const autocompleteList = document.getElementById('autocompleteList');
const historyBtn = document.getElementById('historyBtn');
const historyList = document.getElementById('historyList');

// Global variables
let searchTimeout;
let allTerms = [];
let searchHistory = JSON.parse(localStorage.getItem('searchHistory')) || [];

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    loadAllTerms();
    setupEventListeners();
    displaySearchHistory();
});

// Setup event listeners
function setupEventListeners() {
    searchInput.addEventListener('input', handleSearchInput);
    searchInput.addEventListener('keydown', handleKeyDown);
    searchBtn.addEventListener('click', performSearch);
    aiExplainBtn.addEventListener('click', explainWithAI);
    historyBtn.addEventListener('click', toggleSearchHistory);
    
    document.addEventListener('click', function(e) {
        if (!e.target.closest('.search-wrapper')) hideAutocomplete();
        if (!e.target.closest('.search-history')) hideSearchHistory();
    });
}

// Handle search input with debouncing
function handleSearchInput(e) {
    const query = e.target.value.trim();
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
        if (query.length > 0) {
            showAutocomplete(query);
            if (query.length >= 2) performSearch();
        } else {
            hideAutocomplete();
            clearResults();
        }
    }, 300);
}

// Handle keyboard navigation
function handleKeyDown(e) {
    if (e.key === 'Enter') { e.preventDefault(); performSearch(); hideAutocomplete(); }
    else if (e.key === 'Escape') { hideAutocomplete(); }
}

// Load all terms from Firebase for autocomplete
async function loadAllTerms() {
    try {
        const snapshot = await db.collection('dictionary').get();
        allTerms = [];
        snapshot.forEach(doc => {
            const data = doc.data();
            allTerms.push({
                id: doc.id,
                term: data.term,
                keywords: data.keywords || []
            });
        });
    } catch (error) {
        console.error('Error loading terms:', error);
    }
}

// Show autocomplete suggestions
function showAutocomplete(query) {
    const suggestions = fuzzySearch(query, 5);
    if (suggestions.length > 0) {
        autocompleteList.innerHTML = suggestions
            .map(term => `<div class="autocomplete-item" onclick="selectSuggestion('${term.term}')">${term.term}</div>`)
            .join('');
        autocompleteList.style.display = 'block';
    } else {
        hideAutocomplete();
    }
}

function hideAutocomplete() { autocompleteList.style.display = 'none'; }
function selectSuggestion(term) { searchInput.value = term; hideAutocomplete(); performSearch(); }

// Fuzzy search implementation
function fuzzySearch(query, limit = 10) {
    const queryLower = query.toLowerCase();
    const matches = [];
    allTerms.forEach(item => {
        let score = 0;
        const termLower = item.term.toLowerCase();
        if (termLower === queryLower) score = 1000;
        else if (termLower.startsWith(queryLower)) score = 800;
        else if (termLower.includes(queryLower)) score = 600;
        else if (item.keywords) {
            item.keywords.forEach(keyword => {
                if (keyword.toLowerCase().includes(queryLower)) score = Math.max(score, 400);
            });
        }
        if (score === 0) score = calculateLevenshteinScore(queryLower, termLower);
        if (score > 0) matches.push({ ...item, score });
    });
    return matches.sort((a,b)=>b.score-a.score).slice(0, limit);
}

function calculateLevenshteinScore(query, term) {
    const distance = levenshteinDistance(query, term);
    const maxLength = Math.max(query.length, term.length);
    const score = maxLength - distance;
    return score > maxLength*0.3 ? score*10 : 0;
}

function levenshteinDistance(str1, str2) {
    const matrix = Array(str2.length+1).fill(null).map(()=>Array(str1.length+1).fill(null));
    for (let i=0;i<=str1.length;i++) matrix[0][i]=i;
    for (let j=0;j<=str2.length;j++) matrix[j][0]=j;
    for (let j=1;j<=str2.length;j++){
        for (let i=1;i<=str1.length;i++){
            const indicator = str1[i-1]===str2[j-1]?0:1;
            matrix[j][i] = Math.min(matrix[j][i-1]+1, matrix[j-1][i]+1, matrix[j-1][i-1]+indicator);
        }
    }
    return matrix[str2.length][str1.length];
}

// Perform search
async function performSearch() {
    const query = searchInput.value.trim();
    if (!query) { clearResults(); return; }
    addToSearchHistory(query);
    showLoading(true);
    hideNoResults();
    try {
        const results = await searchInFirebase(query);
        if (results.length>0) displayResults(results);
        else showNoResults();
    } catch (error) {
        console.error('Search error:', error);
        showNoResults();
    }
    showLoading(false);
}

// Search in Firebase
async function searchInFirebase(query) {
    try {
        const results = [];
        const directSearch = await db.collection('dictionary')
            .where('term', '>=', query)
            .where('term', '<=', query+'\uf8ff')
            .get();
        directSearch.forEach(doc=>results.push({id:doc.id,...doc.data()}));

        if (results.length===0) {
            const fuzzyResults = fuzzySearch(query,10);
            for (const match of fuzzyResults) {
                try {
                    const doc = await db.collection('dictionary').doc(match.id).get();
                    if (doc.exists) results.push({id:doc.id,...doc.data()});
                } catch(e){ console.error('Error fetching document:', e);}
            }
        }
        return results;
    } catch(e){ console.error('Firebase search error:', e); return [];}
}

// Display results
function displayResults(results){
    resultsContainer.innerHTML = results.map(r=>createResultCard(r)).join('');
    if(window.MathJax) MathJax.typesetPromise([resultsContainer]).catch(err=>console.error(err));
    resultsContainer.style.display='grid';
    resultsContainer.classList.add('fade-in');
}

function createResultCard(result,isAI=false){
    const cardClass = isAI ? 'result-card ai-result-card' : 'result-card';
    const relatedTermsHTML = result.relatedTerms && result.relatedTerms.length>0
        ? `<div class="related-terms"><h4>Related Terms</h4>${
            result.relatedTerms.map(t=>`<span class="related-tag" onclick="searchRelatedTerm('${t}')">${t}</span>`).join('')
          }</div>` : '';
    const formulaHTML = result.formula ? `<div class="formula-container tex2jax_process">$$${result.formula}$$</div>` : '';
    return `<div class="${cardClass}"><div class="card-header"><h2 class="term-title">${result.term}</h2>${formulaHTML}</div><div class="definition">${result.definition}</div>${relatedTermsHTML}</div>`;
}

function searchRelatedTerm(term){ searchInput.value=term; performSearch(); window.scrollTo({top:0,behavior:'smooth'}); }
function showLoading(show){ loadingSpinner.style.display = show?'block':'none'; }
function showNoResults(){ noResultsContainer.style.display='block'; resultsContainer.style.display='none'; }
function hideNoResults(){ noResultsContainer.style.display='none'; }
function clearResults(){ resultsContainer.innerHTML=''; resultsContainer.style.display='none'; hideNoResults(); }

// AI explanation via Render endpoint
async function explainWithAI() {
    const query = searchInput.value.trim();
    if (!query) return;
    showLoading(true);
    hideNoResults();
    try {
        const explanation = await fetch('https://school-forumforschool.onrender.com/api/ai-explain', {  // ваш Render endpoint
            method:'POST',
            headers:{'Content-Type':'application/json'},
            body:JSON.stringify({term:query})
        }).then(res=>res.json());
        if (explanation) displayResults([explanation]);
        else showNoResults();
    } catch(e){ console.error('AI error:', e); alert('Error generating AI explanation'); showNoResults(); }
    showLoading(false);
}

// Search history
function addToSearchHistory(query){
    if(!searchHistory.includes(query)){
        searchHistory.unshift(query);
        searchHistory = searchHistory.slice(0,10);
        localStorage.setItem('searchHistory', JSON.stringify(searchHistory));
        displaySearchHistory();
    }
}

function displaySearchHistory(){
    historyList.innerHTML = searchHistory.length>0
        ? searchHistory.map(t=>`<div class="history-item" onclick="searchHistoryTerm('${t}')">${t}</div>`).join('')
        : '<div class="history-item">No recent searches</div>';
}

function searchHistoryTerm(term){ searchInput.value=term; hideSearchHistory(); performSearch(); }
function toggleSearchHistory(){ historyList.style.display = historyList.style.display==='block'?'none':'block'; }
function hideSearchHistory(){ historyList.style.display='none'; }

// Sample data insertion
async function insertSampleData(){
    const sampleTerms = [
        { term:"Quadratic Formula", formula:"x = \\frac{-b \\pm \\sqrt{b^2-4ac}}{2a}", definition:"The <strong>quadratic formula</strong> is a formula that solves ax²+bx+c=0.", relatedTerms:["Quadratic Equation","Discriminant","Parabola","Vertex Form"], keywords:["algebra","polynomial","roots","x-intercepts"] },
        { term:"Photosynthesis", formula:"6CO_2+6H_2O+\\text{light energy} \\rightarrow C_6H_{12}O_6+6O_2", definition:"<strong>Photosynthesis</strong> converts sunlight into chemical energy.", relatedTerms:["Chloroplast","Calvin Cycle","Light Reactions","Glucose","ATP"], keywords:["biology","plants","energy","sunlight","oxygen"] },
        { term:"Newton's Second Law", formula:"F=ma", definition:"<strong>Newton's Second Law</strong> states F=ma.", relatedTerms:["Force","Mass","Acceleration","Newton's First Law","Momentum"], keywords:["physics","mechanics","force","motion","dynamics"] }
    ];
    try { for(const t of sampleTerms) await db.collection('dictionary').add(t); console.log('Sample data inserted'); loadAllTerms(); }
    catch(e){ console.error('Error inserting sample data:',e);}
}

// insertSampleData(); // раскомментируйте для однократного запуска
