/**
 * Task View - Mengatur tampilan dan interaksi task
 * * View dalam MVC Pattern:
 * - Mengatur DOM manipulation
 * - Handle user interactions (Day 4: Category Filters)
 * - Display data dari Controller
 * - Tidak mengandung business logic
 */
class TaskView {
    constructor(taskController, userController) {
        this.taskController = taskController;
        this.userController = userController;

        // DOM elements
        this.taskForm = null;
        this.taskList = null;
        this.taskStats = null;
        this.categoryStats = null; // NEW: Day 4
        this.filterButtons = null;
        this.categoryButtons = null; // NEW: Day 4
        this.searchInput = null;
        this.messagesContainer = null;

        // Current state
        this.currentFilter = 'all';
        this.currentCategory = null; // NEW: Day 4
        this.currentSort = 'createdAt';
        this.currentSortOrder = 'desc';

        this._initializeElements();
        this._setupEventListeners();
    }

    /**
     * Initialize DOM elements
     */
    _initializeElements() {
        this.taskForm = document.getElementById('taskForm');
        this.taskList = document.getElementById('taskList');
        this.taskStats = document.getElementById('taskStats');
        this.categoryStats = document.getElementById('categoryStats'); // NEW: Day 4
        this.filterButtons = document.querySelectorAll('.filter-btn');
        this.categoryButtons = document.querySelectorAll('.category-btn'); // NEW: Day 4
        this.searchInput = document.getElementById('searchInput');
        this.messagesContainer = document.getElementById('messages');

        if (!this.messagesContainer) {
            this.messagesContainer = this._createMessagesContainer();
        }
    }

    /**
     * Setup event listeners
     */
    _setupEventListeners() {
        if (this.taskForm) {
            this.taskForm.addEventListener('submit', (e) => this._handleTaskFormSubmit(e));
        }

        // Status filters
        this.filterButtons.forEach(btn => {
            btn.addEventListener('click', (e) => this._handleFilterChange(e));
        });

        // Search input
        if (this.searchInput) {
            this.searchInput.addEventListener('input', (e) => this._handleSearch(e));
        }

        // Sort dropdown
        const sortSelect = document.getElementById('sortSelect');
        if (sortSelect) {
            sortSelect.addEventListener('change', (e) => this._handleSortChange(e));
        }

        // Clear all tasks
        const clearAllBtn = document.getElementById('clearAllTasks');
        if (clearAllBtn) {
            clearAllBtn.addEventListener('click', () => this._handleClearAllTasks());
        }
    }

    /**
     * Render task list (Day 4: Updated to handle category filters)
     * @param {Object} externalFilters - Filter tambahan dari app.js
     */
    renderTasks(externalFilters = {}) {
        if (!this.taskList) return;

        // Gabungkan state internal dengan filter eksternal (seperti kategori)
        const filters = { ...externalFilters };

        // Handle Status Filter
        if (this.currentFilter !== 'all') {
            filters.status = this.currentFilter;
        }

        // Get tasks dari controller
        const response = this.taskController.getTasks({
            ...filters,
            sortBy: this.currentSort,
            sortOrder: this.currentSortOrder
        });

        if (!response.success) {
            this.showMessage(response.error, 'error');
            return;
        }

        const tasks = response.data;

        if (tasks.length === 0) {
            this.taskList.innerHTML = this._getEmptyStateHTML();
            return;
        }

        const tasksHTML = tasks.map(task => this._createTaskHTML(task)).join('');
        this.taskList.innerHTML = tasksHTML;

        this._setupTaskEventListeners();
    }

    /**
     * Render task statistics (Umum)
     */
    renderStats() {
        if (!this.taskStats) return;

        const response = this.taskController.getTaskStats();
        if (!response.success) return;

        const stats = response.data;

        this.taskStats.innerHTML = `
            <div class="stats-grid">
                <div class="stat-item">
                    <span class="stat-number">${stats.total}</span>
                    <span class="stat-label">Total Tasks</span>
                </div>
                <div class="stat-item">
                    <span class="stat-number">${stats.completed}</span>
                    <span class="stat-label">Completed</span>
                </div>
                <div class="stat-item priority-high">
                    <span class="stat-number">${stats.byPriority.high || 0}</span>
                    <span class="stat-label">High Priority</span>
                </div>
                <div class="stat-item ${stats.overdue > 0 ? 'overdue' : ''}">
                    <span class="stat-number">${stats.overdue}</span>
                    <span class="stat-label">Overdue</span>
                </div>
            </div>
        `;
    }

    /**
     * Refresh all views (Day 4: Updated to accept filters)
     */
    refresh(filters = {}) {
        this.renderTasks(filters);
        this.renderStats();
        // Statistik kategori di-render melalui app.js renderCategoryStats()
    }

    /**
     * Handle task form submission
     */
    _handleTaskFormSubmit(event) {
        event.preventDefault();

        const formData = new FormData(event.target);
        const taskData = {
            title: formData.get('title')?.trim(),
            description: formData.get('description')?.trim(),
            category: formData.get('category') || 'personal',
            priority: formData.get('priority') || 'medium',
            dueDate: formData.get('dueDate') || null,
            estimatedHours: parseFloat(formData.get('estimatedHours')) || 0,
            tags: formData.get('tags') ? formData.get('tags').split(',').map(tag => tag.trim()) : []
        };

        const response = this.taskController.createTask(taskData);

        if (response.success) {
            this.showMessage(response.message, 'success');
            event.target.reset();
            this.refresh();
        } else {
            this.showMessage(response.error, 'error');
        }
    }

    /**
     * Handle filter change (Status)
     */
    _handleFilterChange(event) {
        const filterType = event.target.dataset.filter;

        this.filterButtons.forEach(btn => btn.classList.remove('active'));
        // Juga hapus active dari tombol kategori jika ada filter status baru
        document.querySelectorAll('.category-btn').forEach(btn => btn.classList.remove('active'));
        
        event.target.classList.add('active');

        this.currentFilter = filterType;
        this.renderTasks();
    }

    /**
     * Create HTML for single task (Day 4: Added Category Display)
     */
    _createTaskHTML(task) {
        const priorityClass = `priority-${task.priority}`;
        const statusClass = `status-${task.status}`;
        const categoryClass = `category-${task.category}`; // NEW: CSS class per kategori
        const overdueClass = task.isOverdue ? 'overdue' : '';

        const createdDate = new Date(task.createdAt).toLocaleDateString('id-ID');
        const dueDate = task.dueDate ? new Date(task.dueDate).toLocaleDateString('id-ID') : null;

        // Get Display Name Kategori
        const categoryDisplay = task.getCategoryDisplayName ? task.getCategoryDisplayName() : task.category;

        return `
            <div class="task-item ${priorityClass} ${statusClass} ${overdueClass}" data-task-id="${task.id}">
                <div class="task-content">
                    <div class="task-header">
                        <h3 class="task-title">${this._escapeHtml(task.title)}</h3>
                        <div class="task-badges">
                            <span class="task-priority badge-${task.priority}">${task.priority}</span>
                            <span class="task-category ${categoryClass}">${categoryDisplay}</span>
                            <span class="task-status badge-status">${task.status}</span>
                        </div>
                    </div>
                    
                    ${task.description ? `<p class="task-description">${this._escapeHtml(task.description)}</p>` : ''}
                    
                    <div class="task-meta">
                        <small>📅 ${createdDate}</small>
                        ${dueDate ? `<small class="${task.isOverdue ? 'overdue-text' : ''}">⌛ Due: ${dueDate}</small>` : ''}
                    </div>
                </div>
                
                <div class="task-actions">
                    <button class="btn btn-toggle" title="Toggle Status">
                        ${task.isCompleted ? '↶' : '✓'}
                    </button>
                    <button class="btn btn-delete" title="Hapus">
                        🗑️
                    </button>
                </div>
            </div>
        `;
    }

    /**
     * Handle task toggle & delete
     */
    _setupTaskEventListeners() {
        this.taskList.querySelectorAll('.btn-toggle').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const taskId = e.target.closest('.task-item').dataset.taskId;
                const response = this.taskController.toggleTaskStatus(taskId);
                if (response.success) this.refresh();
            });
        });

        this.taskList.querySelectorAll('.btn-delete').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const taskId = e.target.closest('.task-item').dataset.taskId;
                if (confirm('Hapus task ini?')) {
                    const response = this.taskController.deleteTask(taskId);
                    if (response.success) this.refresh();
                }
            });
        });
    }

    _handleSearch(event) {
        const query = event.target.value.trim();
        if (query === '') { this.renderTasks(); return; }
        const response = this.taskController.searchTasks(query);
        if (response.success) {
            const tasksHTML = response.data.map(t => this._createTaskHTML(t)).join('');
            this.taskList.innerHTML = tasksHTML || '<p>Tidak ditemukan.</p>';
            this._setupTaskEventListeners();
        }
    }

    _handleSortChange(event) {
        const [sortBy, sortOrder] = event.target.value.split('-');
        this.currentSort = sortBy;
        this.currentSortOrder = sortOrder;
        this.renderTasks();
    }

    _handleClearAllTasks() {
        if (confirm('Hapus semua task?')) {
            const response = this.taskController.clearAllTasks();
            if (response.success) { this.showMessage(response.message, 'success'); this.refresh(); }
        }
    }

    showMessage(message, type = 'info') {
        const msg = document.createElement('div');
        msg.className = `message message-${type}`;
        msg.textContent = message;
        this.messagesContainer.appendChild(msg);
        setTimeout(() => msg.remove(), 5000);
    }

    _getEmptyStateHTML() {
        return `<div class="empty-state"><p>Belum ada task.</p></div>`;
    }

    _createMessagesContainer() {
        const c = document.createElement('div');
        c.id = 'messages';
        c.className = 'messages-container';
        document.body.appendChild(c);
        return c;
    }

    _escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = TaskView;
} else {
    window.TaskView = TaskView;
}