/**
 * Task Controller - Mengatur alur kerja task management
 * Merupakan jembatan antara View dan Model/Repository
 */
class TaskController {
    constructor(taskRepository, userRepository) {
        this.taskRepository = taskRepository;
        this.userRepository = userRepository;
        this.currentUser = null;
    }
    
    /**
     * Set current user (simulasi login)
     */
    setCurrentUser(userId) {
        this.currentUser = this.userRepository.findById(userId);
        if (!this.currentUser) {
            throw new Error('User tidak ditemukan');
        }
    }
    
    /**
     * Buat task baru
     */
    createTask(taskData) {
        try {
            // 1. Validasi: user harus login
            if (!this.currentUser) {
                return { success: false, error: 'User harus login terlebih dahulu' };
            }
            
            // 2. Validasi: judul wajib diisi
            if (!taskData.title || taskData.title.trim() === '') {
                return { success: false, error: 'Judul task wajib diisi' };
            }

            // 3. FIX: Validasi assignee jika di-set ke user lain (Mencegah error test)
            if (taskData.assigneeId && taskData.assigneeId !== this.currentUser.id) {
                const assignee = this.userRepository.findById(taskData.assigneeId);
                if (!assignee) {
                    return { success: false, error: 'User yang di-assign tidak ditemukan' };
                }
            }
            
            const taskToCreate = {
                ...taskData,
                ownerId: this.currentUser.id,
                assigneeId: taskData.assigneeId || this.currentUser.id
            };
            
            const task = this.taskRepository.create(taskToCreate);
            return {
                success: true,
                data: task,
                message: `Task "${task.title}" berhasil dibuat`
            };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }
    
    /**
     * Ambil semua task milik current user
     */
    getTasks(filters = {}) {
        try {
            if (!this.currentUser) {
                return { success: false, error: 'User harus login terlebih dahulu' };
            }
            const userFilters = { ...filters, ownerId: this.currentUser.id };
            let tasks = this.taskRepository.filter(userFilters);
            
            const sortBy = filters.sortBy || 'createdAt';
            const sortOrder = filters.sortOrder || 'desc';
            tasks = this.taskRepository.sort(tasks, sortBy, sortOrder);
            
            return { success: true, data: tasks, count: tasks.length };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    /**
     * Ambil satu task berdasarkan ID
     */
    getTask(taskId) {
        try {
            if (!this.currentUser) return { success: false, error: 'User harus login terlebih dahulu' };
            
            const task = this.taskRepository.findById(taskId);
            if (!task) return { success: false, error: 'Task tidak ditemukan' };
            
            if (task.ownerId !== this.currentUser.id && task.assigneeId !== this.currentUser.id) {
                return { success: false, error: 'Anda tidak memiliki akses ke task ini' };
            }
            
            return { success: true, data: task };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }
    
    /**
     * Update task
     */
    updateTask(taskId, updates) {
        try {
            if (!this.currentUser) return { success: false, error: 'User harus login terlebih dahulu' };
            
            const task = this.taskRepository.findById(taskId);
            if (!task) return { success: false, error: 'Task tidak ditemukan' };
            if (task.ownerId !== this.currentUser.id) return { success: false, error: 'Hanya owner yang bisa mengubah task' };
            
            // Validasi assignee jika ada update ke user lain
            if (updates.assigneeId && updates.assigneeId !== this.currentUser.id) {
                const assignee = this.userRepository.findById(updates.assigneeId);
                if (!assignee) {
                    return { success: false, error: 'User yang di-assign tidak ditemukan' };
                }
            }

            const updatedTask = this.taskRepository.update(taskId, updates);
            return { success: true, data: updatedTask, message: 'Task berhasil diupdate' };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }
    
    /**
     * Hapus task
     */
    deleteTask(taskId) {
        try {
            if (!this.currentUser) return { success: false, error: 'User harus login terlebih dahulu' };
            
            const task = this.taskRepository.findById(taskId);
            if (!task) return { success: false, error: 'Task tidak ditemukan' };
            if (task.ownerId !== this.currentUser.id) return { success: false, error: 'Hanya owner yang bisa menghapus task' };
            
            const deleted = this.taskRepository.delete(taskId);
            return deleted ? { success: true, message: 'Task berhasil dihapus' } : { success: false, error: 'Gagal menghapus task' };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    /**
     * Search tasks
     */
    searchTasks(query) {
        try {
            if (!this.currentUser) return { success: false, error: 'User harus login terlebih dahulu' };
            if (!query || query.trim() === '') return { success: false, error: 'Query pencarian tidak boleh kosong' };
            
            const results = this.taskRepository.search(query).filter(t => t.ownerId === this.currentUser.id);
            return { success: true, data: results, count: results.length, query };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    /**
     * Get Overdue tasks
     */
    getOverdueTasks() {
        try {
            if (!this.currentUser) return { success: false, error: 'User harus login terlebih dahulu' };
            const tasks = this.taskRepository.findOverdue().filter(t => t.ownerId === this.currentUser.id);
            return { success: true, data: tasks, count: tasks.length };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    /**
     * Get Tasks Due Soon
     */
    getTasksDueSoon(days = 3) {
        try {
            if (!this.currentUser) return { success: false, error: 'User harus login terlebih dahulu' };
            const tasks = this.taskRepository.findDueSoon(days).filter(t => t.ownerId === this.currentUser.id);
            return { success: true, data: tasks, count: tasks.length };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    // --- DAY 4: CATEGORY METHODS ---
    getTasksByCategory(category) {
        try {
            if (!this.currentUser) return { success: false, error: 'User harus login terlebih dahulu' };
            
            const validCategories = EnhancedTask.getAvailableCategories();
            if (!validCategories.includes(category)) {
                return { success: false, error: 'Kategori tidak valid' };
            }

            const tasks = this.taskRepository.findByCategory(category).filter(t => t.ownerId === this.currentUser.id);
            return {
                success: true, 
                data: tasks, 
                category, 
                categoryDisplayName: EnhancedTask.prototype.getCategoryDisplayName.call({ _category: category })
            };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    getCategoryStats() {
        try {
            if (!this.currentUser) return { success: false, error: 'User harus login terlebih dahulu' };
            const stats = this.taskRepository.getCategoryStats(this.currentUser.id);
            const mostUsed = this.taskRepository.getMostUsedCategories(this.currentUser.id);
            return { success: true, data: { byCategory: stats, mostUsed } };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    updateTaskCategory(taskId, newCategory) {
        try {
            const response = this.updateTask(taskId, { category: newCategory });
            if (response.success) {
                const displayName = EnhancedTask.prototype.getCategoryDisplayName.call({ _category: newCategory });
                response.message = `Kategori task berhasil diubah ke ${displayName}`;
            }
            return response;
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    getAvailableCategories() {
        try {
            const categories = EnhancedTask.getAvailableCategories();
            const data = categories.map(c => ({
                value: c,
                label: EnhancedTask.prototype.getCategoryDisplayName.call({ _category: c })
            }));
            return { success: true, data };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    // --- LAINNYA ---
    toggleTaskStatus(taskId) {
        try {
            const task = this.taskRepository.findById(taskId);
            if (!task) return { success: false, error: 'Task tidak ditemukan' };
            const newStatus = task.isCompleted ? 'pending' : 'completed';
            return this.updateTask(taskId, { status: newStatus });
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    getTaskStats() {
        try {
            if (!this.currentUser) return { success: false, error: 'User harus login terlebih dahulu' };
            return { success: true, data: this.taskRepository.getStats(this.currentUser.id) };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    clearAllTasks() {
        try {
            if (!this.currentUser) return { success: false, error: 'User harus login' };
            this.taskRepository.deleteAllByOwner(this.currentUser.id);
            return { success: true, message: 'Semua task berhasil dihapus' };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = TaskController;
} else {
    window.TaskController = TaskController;
}