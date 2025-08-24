// Tasks Management
class TasksManager {
    constructor() {
        this.tasks = [];
        this.currentTask = null;
        this.draggedTask = null;
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.setupDragAndDrop();
    }

    setupEventListeners() {
        document.getElementById('createTaskBtn').addEventListener('click', () => {
            this.showCreateTaskModal();
        });

        document.getElementById('taskForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveTask();
        });

        document.getElementById('deleteTaskBtn').addEventListener('click', () => {
            this.deleteTask();
        });

        document.getElementById('taskFilter').addEventListener('change', (e) => {
            this.filterTasks(e.target.value);
        });
    }

    setupDragAndDrop() {
        document.querySelectorAll('.column-content').forEach(column => {
            column.addEventListener('dragover', (e) => {
                e.preventDefault();
                column.classList.add('drag-over');
            });

            column.addEventListener('dragleave', () => {
                column.classList.remove('drag-over');
            });

            column.addEventListener('drop', async (e) => {
                e.preventDefault();
                column.classList.remove('drag-over');
                
                if (this.draggedTask) {
                    const newStatus = column.parentElement.dataset.status;
                    await this.updateTaskStatus(this.draggedTask.id, newStatus);
                }
            });
        });
    }

    async loadTasks(projectId) {
        if (!projectId) return;

        try {
            app.showLoading(true);
            const snapshot = await db.collection('tasks')
                .where('projectId', '==', projectId)
                .orderBy('createdAt', 'desc')
                .get();

            this.tasks = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));

            this.renderTasks();
            this.updateTaskCounts();
        } catch (err) {
            console.error('Error loading tasks:', err);
            app.showNotification('Failed to load tasks', 'error');
        } finally {
            app.showLoading(false);
        }
    }

    renderTasks() {
        const currentProject = projectsManager.getCurrentProject();
        if (currentProject) {
            document.getElementById('tasksTitle').textContent = `${currentProject.title} Tasks`;
        }

        ['todo', 'inprogress', 'review', 'done'].forEach(status => {
            const column = document.getElementById(`${status}Tasks`);
            column.innerHTML = '';
        });

        const grouped = {
            todo: this.tasks.filter(t => t.status === 'todo'),
            inprogress: this.tasks.filter(t => t.status === 'inprogress'),
            review: this.tasks.filter(t => t.status === 'review'),
            done: this.tasks.filter(t => t.status === 'done')
        };

        Object.keys(grouped).forEach(status => {
            const column = document.getElementById(`${status}Tasks`);
            const tasks = grouped[status];
            if (tasks.length === 0) {
                column.innerHTML = '<div class="empty-column">No tasks</div>';
                return;
            }
            column.innerHTML = tasks.map(t => this.createTaskCard(t)).join('');
        });

        this.addTaskCardListeners();
    }

    createTaskCard(task) {
        const deadline = new Date(task.deadline);
        const isOverdue = deadline < new Date();
        const assignee = task.assignee || 'Unassigned';
        const initial = assignee.charAt(0).toUpperCase();

        return `
            <div class="task-card" draggable="true" data-task-id="${task.id}" onclick="tasksManager.editTask('${task.id}')">
                <div class="task-header">
                    <div class="task-title">${task.title}</div>
                    <div class="task-priority ${task.priority}">${task.priority}</div>
                </div>
                <div class="task-description">${task.description}</div>
                <div class="task-meta">
                    <div class="task-assignee">
                        <div class="assignee-avatar">${initial}</div>
                        <span>${assignee}</span>
                    </div>
                    <div class="task-deadline ${isOverdue ? 'overdue' : ''}">${this.formatDate(deadline)}</div>
                </div>
            </div>
        `;
    }

    addTaskCardListeners() {
        document.querySelectorAll('.task-card').forEach(card => {
            card.addEventListener('dragstart', () => {
                this.draggedTask = this.tasks.find(t => t.id === card.dataset.taskId);
                card.classList.add('dragging');
            });
            card.addEventListener('dragend', () => {
                card.classList.remove('dragging');
                this.draggedTask = null;
            });
        });
    }

    showCreateTaskModal() {
        this.currentTask = null;
        const modal = document.getElementById('taskModal');
        modal.classList.add('active');
        document.getElementById('taskModalTitle').textContent = 'Add New Task';
        document.getElementById('deleteTaskBtn').style.display = 'none';
        document.getElementById('taskForm').reset();
        document.getElementById('taskTitle').focus();
    }

    editTask(taskId) {
        this.currentTask = this.tasks.find(t => t.id === taskId);
        if (!this.currentTask) return;

        const modal = document.getElementById('taskModal');
        modal.classList.add('active');
        document.getElementById('taskModalTitle').textContent = 'Edit Task';
        document.getElementById('deleteTaskBtn').style.display = 'block';

        document.getElementById('taskTitle').value = this.currentTask.title;
        document.getElementById('taskDescription').value = this.currentTask.description;
        document.getElementById('taskAssignee').value = this.currentTask.assignee || '';
        document.getElementById('taskPriority').value = this.currentTask.priority;
        document.getElementById('taskStatus').value = this.currentTask.status;
        document.getElementById('taskDeadline').value = this.currentTask.deadline;
    }

    async saveTask() {
        const title = document.getElementById('taskTitle').value.trim();
        const description = document.getElementById('taskDescription').value.trim();
        const assignee = document.getElementById('taskAssignee').value.trim();
        const priority = document.getElementById('taskPriority').value;
        const status = document.getElementById('taskStatus').value;
        const deadline = document.getElementById('taskDeadline').value;
        const project = projectsManager.getCurrentProject();
        const group = groupsManager.getCurrentGroup();

        if (!title || !description || !priority || !status || !deadline || !project || !group) {
            app.showNotification('Please fill in all required fields', 'error');
            return;
        }

        try {
            app.showLoading(true);

            const data = {
                title, description, assignee, priority, status,
                deadline, projectId: project.id, groupId: group.id,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            };

            if (this.currentTask) {
                await db.collection('tasks').doc(this.currentTask.id).update(data);
                app.showNotification('Task updated successfully!', 'success');
            } else {
                data.createdAt = firebase.firestore.FieldValue.serverTimestamp();
                await db.collection('tasks').add(data);
                app.showNotification('Task created successfully!', 'success');
            }

            groupsManager.closeModal(document.getElementById('taskModal'));
            this.loadTasks(project.id);
        } catch (err) {
            console.error('Error saving task:', err);
            app.showNotification('Failed to save task', 'error');
        } finally {
            app.showLoading(false);
        }
    }

    async deleteTask() {
        if (!this.currentTask) return;
        if (!confirm('Are you sure you want to delete this task?')) return;

        try {
            app.showLoading(true);
            await db.collection('tasks').doc(this.currentTask.id).delete();
            groupsManager.closeModal(document.getElementById('taskModal'));
            app.showNotification('Task deleted successfully!', 'success');
            this.loadTasks(projectsManager.getCurrentProject().id);
        } catch (err) {
            console.error('Error deleting task:', err);
            app.showNotification('Failed to delete task', 'error');
        } finally {
            app.showLoading(false);
        }
    }

    async updateTaskStatus(taskId, newStatus) {
        try {
            await db.collection('tasks').doc(taskId).update({
                status: newStatus,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            const task = this.tasks.find(t => t.id === taskId);
            if (task) task.status = newStatus;
            this.renderTasks();
            this.updateTaskCounts();
            app.showNotification('Task status updated!', 'success');
        } catch (err) {
            console.error('Error updating task status:', err);
            app.showNotification('Failed to update task status', 'error');
        }
    }

    filterTasks(filter) {
        const original = this.tasks;
        if (filter) this.tasks = original.filter(t => t.priority === filter);
        this.renderTasks();
        this.updateTaskCounts();
        this.tasks = original;
    }

    updateTaskCounts() {
        const counts = ['todo', 'inprogress', 'review', 'done'].reduce((acc, status) => {
            acc[status] = this.tasks.filter(t => t.status === status).length;
            return acc;
        }, {});
        Object.keys(counts).forEach(status => {
            const el = document.getElementById(`${status}Count`);
            if (el) el.textContent = counts[status];
        });
    }

    formatDate(date) {
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
}

// Initialize tasks manager
const tasksManager = new TasksManager();
window.tasksManager = tasksManager;
