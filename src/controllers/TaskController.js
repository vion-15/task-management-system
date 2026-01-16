/**
 * Task Controller - Mengatur alur kerja task management
 * * Controller dalam MVC Pattern:
 * - Menerima input dari user (via View)
 * - Memproses dengan bantuan Model dan Repository
 * - Mengirim response kembali ke View
 * - Tidak mengandung business logic (itu ada di Model/Service)
 */
class TaskController {
    constructor(taskRepository, userRepository) {
        this.taskRepository = taskRepository;
        this.userRepository = userRepository;
        this.currentUser = null; // User yang sedang login
    }
    
    /**
     * Set current user (simulasi login)
     * @param {string} userId - User ID
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
            if (!this.currentUser) {
                return { success: false, error: 'User harus login terlebih dahulu' };
            }
            
            if (!taskData.title || taskData.title.trim() === '') {
                return { success: false, error: 'Judul task wajib diisi' };
            }
            
            const taskToCreate = {
                ...taskData,
                ownerId: this.currentUser.id,
                assigneeId: taskData.assigneeId || this.currentUser.id
            };
            
            if (taskToCreate.assigneeId !== this.currentUser.id) {
                const assignee = this.userRepository.findById(taskToCreate.assigneeId);
                if (!assignee) {
                    return { success: false, error: 'User yang di-assign tidak ditemukan' };
                }
            }
            
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
     * Ambil semua task user
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

    // --- DAY 4 CATEGORY METHODS START ---

    /**
     * Get tasks by category
     * @param {string} category - Category to filter by
     * @returns {Object} - Response dengan filtered tasks
     */
    getTasksByCategory(category) {
        try {
            if (!this.currentUser) {
                return { success: false, error: 'User harus login terlebih dahulu' };
            }
            
            // Validate category
            const validCategories = EnhancedTask.getAvailableCategories();
            if (!validCategories.includes(category)) {
                return { success: false, error: 'Kategori tidak valid' };
            }
            
            // Get user's tasks in specific category
            const userTasks = this.taskRepository.findByOwner(this.currentUser.id);
            const categoryTasks = userTasks.filter(task => task.isInCategory(category));
            
            // Sort by priority and due date
            const sortedTasks = this.taskRepository.sort(categoryTasks, 'priority', 'desc');
            
            return {
                success: true,
                data: sortedTasks,
                count: sortedTasks.length,
                category: category,
                categoryDisplayName: EnhancedTask.prototype.getCategoryDisplayName.call({ _category: category })
            };
            
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    /**
     * Get category statistics for current user
     * @returns {Object} - Response dengan category statistics
     */
    getCategoryStats() {
        try {
            if (!this.currentUser) {
                return { success: false, error: 'User harus login terlebih dahulu' };
            }
            
            const stats = this.taskRepository.getCategoryStats(this.currentUser.id);
            const mostUsed = this.taskRepository.getMostUsedCategories(this.currentUser.id);
            
            return {
                success: true,
                data: {
                    byCategory: stats,
                    mostUsed: mostUsed,
                    totalCategories: Object.keys(stats).filter(cat => stats[cat].total > 0).length
                }
            };
            
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    /**
     * Update task category
     * @param {string} taskId - Task ID
     * @param {string} newCategory - New category
     * @returns {Object} - Response dengan updated task
     */
    updateTaskCategory(taskId, newCategory) {
        try {
            if (!this.currentUser) {
                return { success: false, error: 'User harus login terlebih dahulu' };
            }
            
            const task = this.taskRepository.findById(taskId);
            
            if (!task) {
                return { success: false, error: 'Task tidak ditemukan' };
            }
            
            // Check permission
            if (task.ownerId !== this.currentUser.id) {
                return { success: false, error: 'Hanya owner yang bisa mengubah kategori task' };
            }
            
            // Validate category
            const validCategories = EnhancedTask.getAvailableCategories();
            if (!validCategories.includes(newCategory)) {
                return { success: false, error: 'Kategori tidak valid' };
            }
            
            // Update category
            const updatedTask = this.taskRepository.update(taskId, { category: newCategory });
            
            return {
                success: true,
                data: updatedTask,
                message: `Kategori task berhasil diubah ke ${EnhancedTask.prototype.getCategoryDisplayName.call({ _category: newCategory })}`
            };
            
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    /**
     * Get available categories
     * @returns {Object} - Response dengan available categories
     */
    getAvailableCategories() {
        try {
            const categories = EnhancedTask.getAvailableCategories();
            const categoriesWithDisplay = categories.map(category => ({
                value: category,
                label: EnhancedTask.prototype.getCategoryDisplayName.call({ _category: category })
            }));
            
            return { success: true, data: categoriesWithDisplay };
            
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    // --- DAY 4 CATEGORY METHODS END ---

    toggleTaskStatus(taskId) {
        try {
            const task = this.taskRepository.findById(taskId);
            if (!task) return { success: false, error: 'Task tidak ditemukan' };
            
            if (task.ownerId !== this.currentUser.id && task.assigneeId !== this.currentUser.id) {
                return { success: false, error: 'Anda tidak memiliki akses ke task ini' };
            }
            
            const newStatus = task.isCompleted ? 'pending' : 'completed';
            const updatedTask = this.taskRepository.update(taskId, { status: newStatus });
            
            return {
                success: true,
                data: updatedTask,
                message: `Task ${newStatus === 'completed' ? 'selesai' : 'belum selesai'}`
            };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    getTaskStats() {
        try {
            if (!this.currentUser) return { success: false, error: 'User harus login terlebih dahulu' };
            const stats = this.taskRepository.getStats(this.currentUser.id);
            return { success: true, data: stats };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    // ... (Method getOverdueTasks, getTasksDueSoon, dll tetap sama)
}

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = TaskController;
} else {
    window.TaskController = TaskController;
}