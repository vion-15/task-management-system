/**
 * Day 4 Main Application - MVC Implementation
 * * Mengelola alur aplikasi:
 * - Inisialisasi Repositories, Controllers, dan Views
 * - Manajemen Authentication (Login/Logout)
 * - Event Listeners untuk Fitur Kategori (Day 4)
 * - Sinkronisasi Statistik Dashboard
 */

// Global application state
let app = {
    storage: null,
    userRepository: null,
    taskRepository: null,
    userController: null,
    taskController: null,
    taskView: null,
    currentUser: null
};

/**
 * 1. INITIALIZE APPLICATION
 */
function initializeApp() {
    console.log('🚀 Initializing Day 4 Task Management System...');
    
    try {
        // Initialize storage manager
        app.storage = new EnhancedStorageManager('taskAppDay2', '2.0');
        
        // Initialize repositories
        app.userRepository = new UserRepository(app.storage);
        app.taskRepository = new TaskRepository(app.storage);
        
        // Initialize controllers
        app.userController = new UserController(app.userRepository);
        app.taskController = new TaskController(app.taskRepository, app.userRepository);
        
        // Initialize view
        app.taskView = new TaskView(app.taskController, app.userController);
        
        // Setup semua event listener
        setupAuthEventListeners();
        
        // Create demo data jika kosong
        createDemoUserIfNeeded();
        
        // Cek sesi login atau tampilkan halaman login
        showLoginSection();
        
        console.log('✅ Day 4 Application initialized successfully!');
        
    } catch (error) {
        console.error('❌ Failed to initialize application:', error);
        showMessage('Gagal menginisialisasi aplikasi: ' + error.message, 'error');
    }
}

/**
 * 2. EVENT LISTENERS SETUP
 */
function setupAuthEventListeners() {
    // --- Authentication Events ---
    const loginBtn = document.getElementById('loginBtn');
    if (loginBtn) loginBtn.addEventListener('click', handleLogin);
    
    const registerBtn = document.getElementById('registerBtn');
    if (registerBtn) registerBtn.addEventListener('click', showRegisterModal);
    
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) logoutBtn.addEventListener('click', handleLogout);
    
    const registerForm = document.getElementById('registerForm');
    if (registerForm) registerForm.addEventListener('submit', handleRegister);

    // --- Day 4: Category Filter Events (Step 3.6) ---
    // Mencari semua tombol kategori yang baru ditambahkan di index.html
    const categoryButtons = document.querySelectorAll('.category-btn');
    categoryButtons.forEach(btn => {
        btn.addEventListener('click', handleCategoryFilter);
    });
    
    // --- UI Control Events ---
    const showOverdueBtn = document.getElementById('showOverdueBtn');
    const showDueSoonBtn = document.getElementById('showDueSoonBtn');
    const refreshTasks = document.getElementById('refreshTasks');
    
    if (showOverdueBtn) showOverdueBtn.addEventListener('click', showOverdueTasks);
    if (showDueSoonBtn) showDueSoonBtn.addEventListener('click', showDueSoonTasks);
    
    if (refreshTasks) {
        refreshTasks.addEventListener('click', () => {
            app.taskView.refresh();
            renderCategoryStats(); // Perbarui statistik saat refresh
        });
    }
}

/**
 * 3. CATEGORY & FILTER LOGIC (DAY 4)
 */

/**
 * Menangani perubahan filter kategori (Step 3.6)
 * @param {Event} event 
 */
function handleCategoryFilter(event) {
    const category = event.target.dataset.category; // Mengambil data-category dari tombol
    
    // Visual update: Aktifkan tombol yang diklik
    document.querySelectorAll('.category-btn').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
    
    // Reset filter status/prioritas agar tidak tumpang tindih
    document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
    
    // Perintahkan View untuk me-render ulang task berdasarkan kategori
    app.taskView.refresh({ category: category });
}

/**
 * Merender statistik kategori di dashboard (Step 3.6)
 */
function renderCategoryStats() {
    const statsContainer = document.getElementById('categoryStats');
    if (!statsContainer || !app.currentUser) return;
    
    // Ambil data statistik dari Controller
    const response = app.taskController.getCategoryStats();
    
    if (response.success) {
        const { byCategory } = response.data;
        
        // Buat HTML untuk setiap kategori yang memiliki task
        const statsHTML = Object.entries(byCategory)
            .filter(([_, stats]) => stats.total > 0)
            .map(([category, stats]) => {
                // Gunakan helper dari model untuk mendapatkan nama tampilan
                const displayName = EnhancedTask.prototype.getCategoryDisplayName.call({ _category: category });
                
                return `
                    <div class="category-stat-item">
                        <h4>${displayName}</h4>
                        <div class="stat-number">${stats.total}</div>
                        <small>${stats.completed} selesai</small>
                    </div>
                `;
            }).join('');
        
        if (statsHTML) {
            statsContainer.innerHTML = `
                <h3>Statistik per Kategori</h3>
                <div class="category-stats">${statsHTML}</div>
            `;
        } else {
            statsContainer.innerHTML = '<p class="empty-stats">Belum ada data kategori.</p>';
        }
    }
}

/**
 * 4. AUTHENTICATION HANDLERS
 */

function handleLogin() {
    const usernameInput = document.getElementById('usernameInput');
    const username = usernameInput.value.trim();
    
    if (!username) {
        showMessage('Username wajib diisi', 'error');
        return;
    }
    
    const response = app.userController.login(username);
    
    if (response.success) {
        app.currentUser = response.data;
        app.taskController.setCurrentUser(app.currentUser.id);
        
        showMainContent();
        loadUserListForAssign();
        app.taskView.refresh();
        
        // Day 4: Render statistik kategori saat login berhasil
        renderCategoryStats();
        
        showMessage(response.message, 'success');
    } else {
        showMessage(response.error, 'error');
    }
}

function handleLogout() {
    app.userController.logout();
    app.currentUser = null;
    hideMainContent();
    showLoginSection();
    showMessage('Berhasil logout', 'info');
}

/**
 * 5. UI HELPERS
 */

function showLoginSection() {
    document.getElementById('loginSection').style.display = 'flex';
    document.getElementById('userInfo').style.display = 'none';
    document.getElementById('mainContent').style.display = 'none';
    
    const input = document.getElementById('usernameInput');
    if (input) input.focus();
}

function showMainContent() {
    document.getElementById('loginSection').style.display = 'none';
    document.getElementById('userInfo').style.display = 'flex';
    document.getElementById('mainContent').style.display = 'block';
    
    if (app.currentUser) {
        document.getElementById('welcomeMessage').textContent = 
            `Selamat datang, ${app.currentUser.fullName || app.currentUser.username}!`;
    }
}

function hideMainContent() {
    document.getElementById('mainContent').style.display = 'none';
}

function showMessage(message, type = 'info') {
    if (app.taskView) {
        app.taskView.showMessage(message, type);
    } else {
        console.log(`[${type}] ${message}`);
    }
}

// ... (Fungsi pendukung lainnya seperti handleRegister, loadUserList, dll tetap sama)
function handleRegister(event) {
    event.preventDefault();
    const formData = new FormData(event.target);
    const userData = {
        username: formData.get('username')?.trim(),
        email: formData.get('email')?.trim(),
        fullName: formData.get('fullName')?.trim()
    };
    const response = app.userController.register(userData);
    if (response.success) {
        hideRegisterModal();
        showMessage(response.message, 'success');
        document.getElementById('usernameInput').value = userData.username;
    } else {
        showMessage(response.error, 'error');
    }
}

function showRegisterModal() { document.getElementById('registerModal').style.display = 'flex'; }
function hideRegisterModal() { document.getElementById('registerModal').style.display = 'none'; }

function createDemoUserIfNeeded() {
    if (app.userRepository.findAll().length === 0) {
        app.userRepository.create({ username: 'demo', email: 'demo@example.com', fullName: 'Demo User' });
    }
}

function loadUserListForAssign() {
    const response = app.userController.getAllUsers();
    if (response.success) {
        const select = document.getElementById('taskAssignee');
        if (select) {
            select.innerHTML = '<option value="self">Diri Sendiri</option>';
            response.data.forEach(user => {
                if (user.id !== app.currentUser.id) {
                    const opt = document.createElement('option');
                    opt.value = user.id;
                    opt.textContent = user.fullName || user.username;
                    select.appendChild(opt);
                }
            });
        }
    }
}

function showOverdueTasks() {
    const resp = app.taskController.getOverdueTasks();
    if (resp.success) showMessage(`Ada ${resp.count} task overdue!`, 'warning');
}

function showDueSoonTasks() {
    const resp = app.taskController.getTasksDueSoon(3);
    if (resp.success) showMessage(`${resp.count} task akan segera jatuh tempo.`, 'info');
}

// Initialize on load
document.addEventListener('DOMContentLoaded', initializeApp);