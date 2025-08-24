import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import { 
    getFirestore, collection, doc, addDoc, getDocs, updateDoc, deleteDoc, orderBy, query, Timestamp, getDoc 
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";

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
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// DOM Elements
const taskForm = document.getElementById('taskForm');
const editTaskForm = document.getElementById('editTaskForm');
const tasksContainer = document.getElementById('tasksContainer');
const filterTabs = document.querySelectorAll('.filter-tab');
const editModal = document.getElementById('editModal');
const deleteModal = document.getElementById('deleteModal');

// State
let currentFilter = 'all';
let currentEditingTaskId = null;
let currentDeletingTaskId = null;
let currentUserId = null;

// Initialize app after auth
onAuthStateChanged(auth, user => {
    if (user) {
        currentUserId = user.uid;
        loadTasks();
    } else {
        currentUserId = null;
        tasksContainer.innerHTML = '<p>Please log in to see your tasks.</p>';
    }
    setupEventListeners();
    setDefaultDateTime();
});

// Set default date/time
function setDefaultDateTime() {
    const now = new Date();
    document.getElementById('date').value = now.toISOString().split('T')[0];
    document.getElementById('time').value = now.toTimeString().slice(0,5);
}

// Event listeners
function setupEventListeners() {
    taskForm.addEventListener('submit', handleFormSubmit);
    editTaskForm.addEventListener('submit', handleEditFormSubmit);

    filterTabs.forEach(tab => {
        tab.addEventListener('click', function() {
            filterTabs.forEach(t => t.classList.remove('active'));
            this.classList.add('active');
            currentFilter = this.dataset.filter;
            loadTasks();
        });
    });

    setupModalEventListeners();
}

// Modal listeners
function setupModalEventListeners() {
    document.getElementById('cancelEdit').addEventListener('click', closeEditModal);
    document.querySelector('#editModal .close').addEventListener('click', closeEditModal);

    document.getElementById('cancelDelete').addEventListener('click', closeDeleteModal);
    document.getElementById('confirmDelete').addEventListener('click', handleDeleteConfirm);
    document.querySelector('#deleteModal .close').addEventListener('click', closeDeleteModal);

    editModal.addEventListener('click', e => { if(e.target===editModal) closeEditModal(); });
    deleteModal.addEventListener('click', e => { if(e.target===deleteModal) closeDeleteModal(); });

    document.addEventListener('keydown', e => { if(e.key==='Escape'){ closeEditModal(); closeDeleteModal(); }});
}

// Add task
async function handleFormSubmit(e){
    e.preventDefault();
    if(!currentUserId) return alert('You must be logged in');

    const title = document.getElementById('title').value.trim();
    const description = document.getElementById('description').value.trim();
    const type = document.getElementById('type').value;
    const date = document.getElementById('date').value;
    const time = document.getElementById('time').value;

    if(!title || !type || !date || !time) return alert('Please fill in all required fields');

    const dueDate = new Date(`${date}T${time}`);
    const taskData = {
        title,
        description,
        type,
        dueDate: Timestamp.fromDate(dueDate),
        completed: false,
        createdAt: Timestamp.now()
    };

    try {
        await addDoc(collection(db, 'users', currentUserId, 'tasks'), taskData);
        taskForm.reset();
        setDefaultDateTime();
        loadTasks();
    } catch(e){ console.error(e); alert('Failed to add task'); }
}

// Load tasks
async function loadTasks(){
    if(!currentUserId) return;
    try{
        tasksContainer.innerHTML = '<div class="loading">Loading your tasks...</div>';
        const q = query(collection(db, 'users', currentUserId, 'tasks'), orderBy('dueDate','asc'));
        const snapshot = await getDocs(q);
        const tasks = snapshot.docs.map(doc=>({id:doc.id,...doc.data()}));
        displayTasks(tasks);
    } catch(e){ console.error(e); tasksContainer.innerHTML = '<div class="empty-state"><h3>Error loading tasks</h3></div>'; }
}

// Display tasks
function displayTasks(tasks){
    if(!tasks.length){ tasksContainer.innerHTML='<div class="empty-state"><h3>No tasks yet</h3></div>'; return; }
    const filtered = filterTasks(tasks);
    if(!filtered.length){ tasksContainer.innerHTML='<div class="empty-state"><h3>No tasks match the filter</h3></div>'; return; }

    tasksContainer.innerHTML = filtered.map(createTaskHTML).join('');

    document.querySelectorAll('.checkbox-wrapper').forEach(el=>{
        el.addEventListener('click', function(){
            const taskId=this.dataset.taskId;
            const completed=this.dataset.completed==='true';
            toggleTaskCompletion(taskId,!completed);
        });
    });

    document.querySelectorAll('.btn-edit').forEach(btn=>{ btn.addEventListener('click',()=>openEditModal(btn.dataset.taskId)); });
    document.querySelectorAll('.btn-delete').forEach(btn=>{ btn.addEventListener('click',()=>openDeleteModal(btn.dataset.taskId,btn.dataset.taskTitle,btn.dataset.taskType)); });
}

// Filter tasks
function filterTasks(tasks){
    const now=new Date();
    const threeDays=new Date(now.getTime()+3*24*60*60*1000);
    switch(currentFilter){
        case 'task': case 'exam': case 'event': return tasks.filter(t=>t.type===currentFilter);
        case 'completed': return tasks.filter(t=>t.completed);
        case 'upcoming': return tasks.filter(t=>!t.completed && t.dueDate.toDate()>=now && t.dueDate.toDate()<=threeDays);
        default: return tasks;
    }
}

// Task HTML
function createTaskHTML(task){
    const due=task.dueDate.toDate();
    const now=new Date();
    const threeDays=new Date(now.getTime()+3*24*60*60*1000);
    let taskClass='task-item', dueClass='task-due', badge='';

    if(task.completed) taskClass+=' completed';
    else if(due<now){ taskClass+=' overdue'; dueClass+=' overdue'; badge='<div class="overdue-badge">Overdue</div>'; }
    else if(due<=threeDays){ taskClass+=' upcoming'; dueClass+=' upcoming'; badge='<div class="upcoming-badge">Due Soon</div>'; }

    const fDate=due.toLocaleDateString('en-US',{weekday:'short',year:'numeric',month:'short',day:'numeric'});
    const fTime=due.toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit'});

    return `
        <div class="${taskClass}">
            ${badge}
            <div class="task-header">
                <div>
                    <div class="task-title">${escapeHtml(task.title)}</div>
                    ${task.description?`<div class="task-description">${escapeHtml(task.description)}</div>`:''}
                </div>
                <div class="task-type ${task.type}">${task.type}</div>
            </div>
            <div class="task-footer">
                <div class="${dueClass}">Due: ${fDate} at ${fTime}</div>
                <div class="task-actions">
                    <button class="btn-small btn-edit" data-task-id="${task.id}">Edit</button>
                    <button class="btn-small btn-delete" data-task-id="${task.id}" data-task-title="${escapeHtml(task.title)}" data-task-type="${task.type}">Delete</button>
                    <div class="checkbox-wrapper" data-task-id="${task.id}" data-completed="${task.completed}">
                        <div class="custom-checkbox ${task.completed?'checked':''}">${task.completed?'<span class="checkmark">✓</span>':''}</div>
                        <span>${task.completed?'Completed':'Mark as complete'}</span>
                    </div>
                </div>
            </div>
        </div>
    `;
}

// Toggle completion
async function toggleTaskCompletion(taskId,completed){
    if(!currentUserId) return;
    try{
        const taskRef = doc(db, 'users', currentUserId, 'tasks', taskId);
        await updateDoc(taskRef, {completed});
        loadTasks();
    } catch(e){ console.error(e); alert('Failed to update task'); }
}

// Edit modal
async function openEditModal(taskId){
    if(!currentUserId) return;
    try{
        const taskRef = doc(db, 'users', currentUserId, 'tasks', taskId);
        const taskSnap = await getDoc(taskRef); // ✅ используем getDoc для одного документа
        if(!taskSnap.exists()) return alert('Task not found');

        const task = taskSnap.data();
        currentEditingTaskId = taskId;

        document.getElementById('editTitle').value = task.title;
        document.getElementById('editDescription').value = task.description||'';
        document.getElementById('editType').value = task.type;
        const due = task.dueDate.toDate();
        document.getElementById('editDate').value = due.toISOString().split('T')[0];
        document.getElementById('editTime').value = due.toTimeString().slice(0,5);

        editModal.classList.add('show'); 
        document.body.style.overflow='hidden';
    } catch(e){ console.error(e); alert('Failed to load task'); }
}
function closeEditModal(){ 
    editModal.classList.remove('show'); 
    document.body.style.overflow=''; 
    currentEditingTaskId=null; 
    editTaskForm.reset(); 
}

async function handleEditFormSubmit(e){
    e.preventDefault();
    if(!currentEditingTaskId || !currentUserId) return;

    const title=document.getElementById('editTitle').value.trim();
    const description=document.getElementById('editDescription').value.trim();
    const type=document.getElementById('editType').value;
    const date=document.getElementById('editDate').value;
    const time=document.getElementById('editTime').value;
    const dueDate=new Date(`${date}T${time}`);

    try{
        const taskRef = doc(db, 'users', currentUserId, 'tasks', currentEditingTaskId);
        await updateDoc(taskRef, {title,description,type,dueDate: Timestamp.fromDate(dueDate),updatedAt: Timestamp.now()});
        closeEditModal(); 
        loadTasks();
    } catch(e){ console.error(e); alert('Failed to update task'); }
}

// Delete modal
function openDeleteModal(taskId,title,type){
    currentDeletingTaskId=taskId;
    document.getElementById('deleteTaskTitle').textContent=title;
    const el=document.getElementById('deleteTaskType');
    el.textContent=type;
    el.className=`task-type ${type}`;
    deleteModal.classList.add('show'); document.body.style.overflow='hidden';
}
function closeDeleteModal(){ deleteModal.classList.remove('show'); document.body.style.overflow=''; currentDeletingTaskId=null; }
async function handleDeleteConfirm(){
    if(!currentDeletingTaskId || !currentUserId) return;
    try{
        const taskRef = doc(db, 'users', currentUserId, 'tasks', currentDeletingTaskId);
        await deleteDoc(taskRef);
        closeDeleteModal(); loadTasks();
    } catch(e){ console.error(e); alert('Failed to delete task'); }
}

// Escape HTML
function escapeHtml(text){ const div=document.createElement('div'); div.textContent=text; return div.innerHTML; }
