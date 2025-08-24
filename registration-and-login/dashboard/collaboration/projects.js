// Projects Management
class ProjectsManager {
    constructor() {
        this.projects = [];
        this.currentProject = null;
        this.init();
    }

    init() {
        this.setupEventListeners();
    }

    setupEventListeners() {
        document.getElementById('createProjectBtn').addEventListener('click', () => this.showCreateProjectModal());
        document.getElementById('createProjectForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.createProject();
        });
    }

    async loadProjects(groupId) {
        if (!groupId) return;

        try {
            if (window.app) app.showLoading(true);

            const projectsSnapshot = await db.collection('projects')
                .where('groupId', '==', groupId)
                .orderBy('createdAt', 'desc')
                .get();

            this.projects = projectsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            this.renderProjects();
        } catch (error) {
            console.error('Error loading projects:', error);
            if (window.app) app.showNotification('Failed to load projects', 'error');
        } finally {
            if (window.app) app.showLoading(false);
        }
    }

    renderProjects() {
        const projectsGrid = document.getElementById('projectsGrid');
        const projectsTitle = document.getElementById('projectsTitle');
        const currentGroup = groupsManager.getCurrentGroup();

        if (currentGroup) {
            projectsTitle.textContent = `${currentGroup.name} Projects`;
        }

        if (this.projects.length === 0) {
            projectsGrid.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-folder-open" style="font-size: 3rem; color: var(--gray); margin-bottom: 1rem;"></i>
                    <h3 style="color: var(--gray); margin-bottom: 0.5rem;">No projects yet</h3>
                    <p style="color: var(--gray);">Create your first project to start organizing tasks</p>
                </div>
            `;
            return;
        }

        projectsGrid.innerHTML = this.projects.map(project => {
    const tasks = tasksManager.tasks.filter(t => t.projectId === project.id); // вот здесь
    const progress = tasks.length === 0 ? 0 : Math.round((tasks.filter(t => t.status === 'done').length / tasks.length) * 100);
    const deadline = new Date(project.deadline);
    const isOverdue = deadline < new Date();
    const daysUntilDeadline = Math.ceil((deadline - new Date()) / (1000 * 60 * 60 * 24));

    return `
        <div class="card project-card fade-in" data-project-id="${project.id}">
            <div class="card-header">
                <div class="card-avatar">
                    <i class="fas fa-folder"></i>
                </div>
                <div class="card-info">
                    <h3>${project.title}</h3>
                    <div class="card-meta">
                        <span class="${isOverdue ? 'text-danger' : ''}">
                            <i class="fas fa-calendar"></i> 
                            ${isOverdue ? 'Overdue' : `${daysUntilDeadline} days left`}
                        </span>
                    </div>
                </div>
            </div>
            <p class="card-description">${project.description}</p>
            <div class="progress-container">
                <div class="progress-bar">
                    <div class="progress-fill" style="width: ${progress}%"></div>
                </div>
                <span class="progress-text">${progress}% complete</span>
            </div>
            <div class="card-actions">
                <button class="card-btn view-project-btn" data-project-id="${project.id}">
                    <i class="fas fa-eye"></i> View Tasks
                </button>
                <button class="card-btn edit-project-btn" data-project-id="${project.id}">
                    <i class="fas fa-edit"></i> Edit
                </button>
            </div>
        </div>
    `;
}).join('');


        document.querySelectorAll('.view-project-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const projectId = e.target.dataset.projectId;
                this.selectProject(projectId);
            });
        });

        document.querySelectorAll('.edit-project-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const projectId = e.target.dataset.projectId;
                this.editProject(projectId);
            });
        });
    }

    showCreateProjectModal() {
        const modal = document.getElementById('createProjectModal');
        modal.classList.add('active');
        document.getElementById('projectTitle').focus();
    }

    async createProject() {
        const title = document.getElementById('projectTitle').value.trim();
        const description = document.getElementById('projectDescription').value.trim();
        const deadline = document.getElementById('projectDeadline').value;
        const currentGroup = groupsManager.getCurrentGroup();

        if (!title || !description || !deadline || !currentGroup) {
            if (window.app) app.showNotification('Please fill in all fields', 'error');
            return;
        }

        try {
            if (window.app) app.showLoading(true);

            const projectData = {
                title,
                description,
                deadline,
                groupId: currentGroup.id,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            };

            await db.collection('projects').add(projectData);

            groupsManager.closeModal(document.getElementById('createProjectModal'));
            if (window.app) app.showNotification('Project created successfully!', 'success');
            this.loadProjects(currentGroup.id);
        } catch (error) {
            console.error('Error creating project:', error);
            if (window.app) app.showNotification('Failed to create project', 'error');
        } finally {
            if (window.app) app.showLoading(false);
        }
    }

    selectProject(projectId) {
        this.currentProject = this.projects.find(project => project.id === projectId);
        if (!this.currentProject) return;

        const currentGroup = groupsManager.getCurrentGroup();

        const breadcrumb = document.getElementById('breadcrumb');
        breadcrumb.innerHTML = `
            <span class="breadcrumb-item" onclick="app.showSection('groups')">Groups</span>
            <span class="breadcrumb-item" onclick="app.showSection('projects'); projectsManager.loadProjects('${currentGroup.id}')">${currentGroup.name}</span>
            <span class="breadcrumb-item active">${this.currentProject.title}</span>
        `;

        if (window.app) window.app.showSection('tasks');
        if (window.tasksManager) window.tasksManager.loadTasks(projectId);
    }

    editProject(projectId) {
        if (window.app) app.showNotification('Edit project feature coming soon!', 'info');
    }

    getCurrentProject() {
        return this.currentProject;
    }
}

// Initialize projects manager
const projectsManager = new ProjectsManager();
window.projectsManager = projectsManager;
