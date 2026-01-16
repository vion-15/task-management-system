if (typeof require !== 'undefined' && typeof module !== 'undefined') {
    if (typeof EnhancedTask === 'undefined') {
        EnhancedTask = require('../models/EnhancedTask');
    }
}

/**
 * Task Repository - Mengelola penyimpanan dan pengambilan data Task
 */
class TaskRepository {
    constructor(storageManager) {
        this.storage = storageManager;
        this.tasks = new Map();
        this.storageKey = 'tasks';
        this._loadTasksFromStorage();
    }

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

    findByCategory(category) {
        return this.findAll().filter(task => task.category === category);
    }

    filter(filters) {
        let results = this.findAll();
        if (filters.ownerId) results = results.filter(t => t.ownerId === filters.ownerId);
        if (filters.category) results = results.filter(t => t.category === filters.category);
        if (filters.status) results = results.filter(t => t.status === filters.status);
        if (filters.priority) results = results.filter(t => t.priority === filters.priority);
        return results;
    }

    sort(tasks, sortBy = 'createdAt', order = 'desc') {
        return tasks.sort((a, b) => {
            let vA = a[sortBy], vB = b[sortBy];
            if (sortBy === 'priority') {
                const p = { 'low': 1, 'medium': 2, 'high': 3, 'urgent': 4 };
                vA = p[a.priority]; vB = p[b.priority];
            }
            return order === 'asc' ? (vA > vB ? 1 : -1) : (vA < vB ? 1 : -1);
        });
    }

    // --- FIX: Memproses semua field update termasuk priority ---
    update(id, updates) {
        const task = this.findById(id);
        if (!task) return null;
        
        if (updates.title !== undefined) task.updateTitle(updates.title);
        if (updates.description !== undefined) task.updateDescription(updates.description);
        if (updates.category !== undefined) task.updateCategory(updates.category);
        if (updates.priority !== undefined) task.updatePriority(updates.priority); // <--- FIX
        if (updates.status !== undefined) task.updateStatus(updates.status);
        if (updates.dueDate !== undefined) task.setDueDate(updates.dueDate);
        if (updates.estimatedHours !== undefined) task.setEstimatedHours(updates.estimatedHours);
        
        this._saveTasksToStorage();
        return task;
    }

    delete(id) {
        if (this.tasks.has(id)) {
            this.tasks.delete(id);
            this._saveTasksToStorage();
            return true;
        }
        return false;
    }

    getCategoryStats(userId = null) {
        let tasks = userId ? this.findByOwner(userId) : this.findAll();
        const stats = {};
        EnhancedTask.getAvailableCategories().forEach(c => {
            stats[c] = { total: 0, completed: 0, pending: 0, overdue: 0 };
        });
        tasks.forEach(t => {
            if (stats[t.category]) {
                stats[t.category].total++;
                if (t.isCompleted) stats[t.category].completed++;
                else stats[t.category].pending++;
                if (t.isOverdue) stats[t.category].overdue++;
            }
        });
        return stats;
    }

    getMostUsedCategories(userId = null, limit = 5) {
        const stats = this.getCategoryStats(userId);
        return Object.entries(stats)
            .sort(([,a], [,b]) => b.total - a.total)
            .slice(0, limit)
            .map(([category, data]) => ({
                category,
                count: data.total,
                displayName: EnhancedTask.prototype.getCategoryDisplayName.call({ _category: category })
            }));
    }

    getStats(userId = null) {
        let tasks = userId ? this.findByOwner(userId) : this.findAll();
        return {
            total: tasks.length,
            completed: tasks.filter(t => t.isCompleted).length,
            overdue: tasks.filter(t => t.isOverdue).length,
            byStatus: {
                pending: tasks.filter(t => t.status === 'pending').length,
                completed: tasks.filter(t => t.status === 'completed').length
            },
            byPriority: { high: tasks.filter(t => t.priority === 'high').length }
        };
    }

    search(query) {
        const term = query.toLowerCase();
        return this.findAll().filter(t => t.title.toLowerCase().includes(term));
    }

    deleteAllByOwner(ownerId) {
        for (const [id, t] of this.tasks.entries()) {
            if (t.ownerId === ownerId) this.tasks.delete(id);
        }
        this._saveTasksToStorage();
        return true;
    }

    _loadTasksFromStorage() {
        const data = this.storage.load(this.storageKey, []);
        data.forEach(d => this.tasks.set(d.id, EnhancedTask.fromJSON(d)));
    }

    _saveTasksToStorage() {
        const data = Array.from(this.tasks.values()).map(t => t.toJSON());
        this.storage.save(this.storageKey, data);
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = TaskRepository;
} else {
    window.TaskRepository = TaskRepository;
}