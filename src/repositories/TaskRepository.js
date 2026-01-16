if (typeof require !== 'undefined' && typeof module !== 'undefined') {
    // Hanya import jika kita benar-benar di Node.js environment (untuk Testing)
    if (typeof EnhancedTask === 'undefined') {
        EnhancedTask = require('../models/EnhancedTask');
    }
}
/**
 * Task Repository - Mengelola penyimpanan dan pengambilan data Task
 * * Repository Pattern untuk Task dengan fitur:
 * - CRUD operations
 * - Query methods (filter, search, sort)
 * - User-specific operations
 * - Statistics dan reporting
 */
class TaskRepository {
    constructor(storageManager) {
        this.storage = storageManager;
        this.tasks = new Map(); // Cache in-memory
        this.storageKey = 'tasks';

        // Load existing tasks dari storage
        this._loadTasksFromStorage();
    }

    /**
     * Buat task baru
     */
    create(taskData) {
        try {
            const task = new EnhancedTask(
                taskData.title,
                taskData.description,
                taskData.ownerId,
                taskData
            );

            this.tasks.set(task.id, task);
            this._saveTasksToStorage();
            return task;
        } catch (error) {
            console.error('Error creating task:', error);
            throw error;
        }
    }

    findById(id) {
        return this.tasks.get(id) || null;
    }

    findAll() {
        return Array.from(this.tasks.values());
    }

    findByOwner(ownerId) {
        return this.findAll().filter(task => task.ownerId === ownerId);
    }

    // --- DAY 4 CATEGORY METHODS START ---

    /**
     * Find tasks by category
     * @param {string} category - Category to filter by
     * @returns {EnhancedTask[]} - Array of tasks in category
     */
    findByCategory(category) {
        return this.findAll().filter(task => task.category === category);
    }

    /**
     * Get task statistics by category
     * @param {string} userId - User ID (optional)
     * @returns {Object} - Statistics grouped by category
     */
    getCategoryStats(userId = null) {
        let tasks = userId ? this.findByOwner(userId) : this.findAll();

        const stats = {};
        const categories = EnhancedTask.getAvailableCategories();

        // Initialize all categories with 0
        categories.forEach(category => {
            stats[category] = {
                total: 0,
                completed: 0,
                pending: 0,
                overdue: 0
            };
        });

        // Count tasks in each category
        tasks.forEach(task => {
            const category = task.category;
            if (stats[category]) {
                stats[category].total++;

                if (task.isCompleted) {
                    stats[category].completed++;
                } else {
                    stats[category].pending++;
                }

                if (task.isOverdue) {
                    stats[category].overdue++;
                }
            }
        });

        return stats;
    }

    /**
     * Get most used categories
     * @param {string} userId - User ID (optional)
     * @param {number} limit - Number of categories to return
     * @returns {Array} - Array of categories sorted by usage
     */
    getMostUsedCategories(userId = null, limit = 5) {
        const stats = this.getCategoryStats(userId);

        return Object.entries(stats)
            .sort(([, a], [, b]) => b.total - a.total)
            .slice(0, limit)
            .map(([category, data]) => ({
                category,
                count: data.total,
                displayName: EnhancedTask.prototype.getCategoryDisplayName.call({ _category: category })
            }));
    }

    // --- DAY 4 CATEGORY METHODS END ---

    findByAssignee(assigneeId) {
        return this.findAll().filter(task => task.assigneeId === assigneeId);
    }

    findByStatus(status) {
        return this.findAll().filter(task => task.status === status);
    }

    findByPriority(priority) {
        return this.findAll().filter(task => task.priority === priority);
    }

    findOverdue() {
        return this.findAll().filter(task => task.isOverdue);
    }

    update(id, updates) {
        const task = this.findById(id);
        if (!task) return null;

        try {
            if (updates.title !== undefined) task.updateTitle(updates.title);
            if (updates.description !== undefined) task.updateDescription(updates.description);
            if (updates.category !== undefined) task.updateCategory(updates.category);
            if (updates.priority !== undefined) task.updatePriority(updates.priority);
            if (updates.status !== undefined) task.updateStatus(updates.status);
            if (updates.dueDate !== undefined) task.setDueDate(updates.dueDate);
            if (updates.assigneeId !== undefined) task.assignTo(updates.assigneeId);
            if (updates.estimatedHours !== undefined) task.setEstimatedHours(updates.estimatedHours);
            if (updates.addTimeSpent !== undefined) task.addTimeSpent(updates.addTimeSpent);
            if (updates.addTag !== undefined) task.addTag(updates.addTag);
            if (updates.removeTag !== undefined) task.removeTag(updates.removeTag);
            if (updates.addNote !== undefined) task.addNote(updates.addNote);

            this._saveTasksToStorage();
            return task;
        } catch (error) {
            console.error('Error updating task:', error);
            throw error;
        }
    }

    delete(id) {
        if (this.tasks.has(id)) {
            this.tasks.delete(id);
            this._saveTasksToStorage();
            return true;
        }
        return false;
    }

    getStats(userId = null) {
        let tasks = userId ? this.findByOwner(userId) : this.findAll();

        const stats = {
            total: tasks.length,
            byStatus: {},
            byPriority: {},
            byCategory: {},
            overdue: tasks.filter(task => task.isOverdue).length,
            completed: tasks.filter(task => task.isCompleted).length
        };

        // Menggunakan helper statis dari EnhancedTask untuk konsistensi kategori
        const categories = EnhancedTask.getAvailableCategories();
        categories.forEach(category => {
            stats.byCategory[category] = tasks.filter(task => task.category === category).length;
        });

        // Count by status & priority
        ['pending', 'in-progress', 'blocked', 'completed', 'cancelled'].forEach(s => {
            stats.byStatus[s] = tasks.filter(task => task.status === s).length;
        });
        ['low', 'medium', 'high', 'urgent'].forEach(p => {
            stats.byPriority[p] = tasks.filter(task => task.priority === p).length;
        });

        return stats;
    }

    // Private methods
    _loadTasksFromStorage() {
        try {
            const tasksData = this.storage.load(this.storageKey, []);
            tasksData.forEach(taskData => {
                const task = EnhancedTask.fromJSON(taskData);
                this.tasks.set(task.id, task);
            });
        } catch (error) {
            console.error('Error loading tasks:', error);
        }
    }

    _saveTasksToStorage() {
        try {
            const tasksData = Array.from(this.tasks.values()).map(task => task.toJSON());
            this.storage.save(this.storageKey, tasksData);
        } catch (error) {
            console.error('Error saving tasks:', error);
        }
    }
}

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = TaskRepository;
} else {
    window.TaskRepository = TaskRepository;
}