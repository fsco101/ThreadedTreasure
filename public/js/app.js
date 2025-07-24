// Configuration
const CONFIG = {
    API_BASE_URL: 'http://localhost:3000/api',
    JWT_TOKEN: localStorage.getItem('jwt_token') || ''
};

// Global state
let currentPage = 'dashboard';
let currentData = {};
let currentPagination = {};

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

function initializeApp() {
    setupEventListeners();
    loadDashboard();
    
    // Load saved settings
    const savedApiUrl = localStorage.getItem('api_url');
    const savedToken = localStorage.getItem('jwt_token');
    
    if (savedApiUrl) {
        CONFIG.API_BASE_URL = savedApiUrl;
        document.getElementById('api-url').value = savedApiUrl;
    }
    
    if (savedToken) {
        CONFIG.JWT_TOKEN = savedToken;
        document.getElementById('jwt-token').value = savedToken;
    }
}

function setupEventListeners() {
    // Sidebar navigation
    document.querySelectorAll('.menu-item').forEach(item => {
        item.addEventListener('click', function() {
            const page = this.dataset.page;
            navigateToPage(page);
        });
    });

    // Add button
    document.getElementById('add-btn').addEventListener('click', function() {
        openAddModal();
    });

    // Search functionality
    document.getElementById('users-search').addEventListener('input', debounce(searchUsers, 300));
    document.getElementById('products-search').addEventListener('input', debounce(searchProducts, 300));
    document.getElementById('categories-search').addEventListener('input', debounce(searchCategories, 300));

    // Category filter
    document.getElementById('category-filter').addEventListener('change', filterProductsByCategory);

    // Modal form submission
    document.getElementById('modal-form').addEventListener('submit', handleFormSubmit);

    // Close modal when clicking outside
    document.getElementById('modal').addEventListener('click', function(e) {
        if (e.target === this) {
            closeModal();
        }
    });
}

// Navigation
function navigateToPage(page) {
    // Update active menu item
    document.querySelectorAll('.menu-item').forEach(item => {
        item.classList.remove('active');
    });
    document.querySelector(`[data-page="${page}"]`).classList.add('active');

    // Hide all pages
    document.querySelectorAll('.page').forEach(pageEl => {
        pageEl.style.display = 'none';
    });

    // Show selected page
    document.getElementById(`${page}-page`).style.display = 'block';
    
    // Update page title and add button
    const titles = {
        dashboard: 'Dashboard',
        users: 'Users Management',
        products: 'Products Management',
        categories: 'Categories Management',
        settings: 'Settings'
    };
    
    document.getElementById('page-title').textContent = titles[page];
    
    // Show/hide add button
    const addBtn = document.getElementById('add-btn');
    if (['users', 'products', 'categories'].includes(page)) {
        addBtn.style.display = 'block';
    } else {
        addBtn.style.display = 'none';
    }

    currentPage = page;

    // Load page data
    switch(page) {
        case 'dashboard':
            loadDashboard();
            break;
        case 'users':
            loadUsers();
            break;
        case 'products':
            loadProducts();
            loadCategories('category-filter');
            break;
        case 'categories':
            loadCategories();
            break;
    }
}

// API Helper Functions
async function apiRequest(endpoint, options = {}) {
    try {
        const url = `${CONFIG.API_BASE_URL}${endpoint}`;
        const config = {
            headers: {
                'Content-Type': 'application/json',
                ...(CONFIG.JWT_TOKEN && { 'Authorization': `Bearer ${CONFIG.JWT_TOKEN}` })
            },
            ...options
        };

        const response = await fetch(url, config);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        return await response.json();
    } catch (error) {
        console.error('API request failed:', error);
        showToast('API request failed: ' + error.message, 'error');
        throw error;
    }
}

async function apiRequestWithFile(endpoint, formData, method = 'POST') {
    try {
        const url = `${CONFIG.API_BASE_URL}${endpoint}`;
        const config = {
            method,
            headers: {
                ...(CONFIG.JWT_TOKEN && { 'Authorization': `Bearer ${CONFIG.JWT_TOKEN}` })
            },
            body: formData
        };

        const response = await fetch(url, config);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        return await response.json();
    } catch (error) {
        console.error('API request with file failed:', error);
        showToast('API request failed: ' + error.message, 'error');
        throw error;
    }
}

// Dashboard Functions
async function loadDashboard() {
    try {
        // Load dashboard statistics
        const [usersResponse, productsResponse, categoriesResponse, lowStockResponse] = await Promise.all([
            apiRequest('/users').catch(() => ({ data: [], pagination: { total: 0 } })),
            apiRequest('/products').catch(() => ({ data: [], pagination: { total: 0 } })),
            apiRequest('/categories').catch(() => ({ data: [] })),
            apiRequest('/products/low-stock').catch(() => ({ data: [] }))
        ]);

        document.getElementById('total-users').textContent = usersResponse.pagination?.total || 0;
        document.getElementById('total-products').textContent = productsResponse.pagination?.total || 0;
        document.getElementById('total-categories').textContent = categoriesResponse.data?.length || 0;
        document.getElementById('low-stock-count').textContent = lowStockResponse.data?.length || 0;

    } catch (error) {
        console.error('Failed to load dashboard:', error);
    }
}

// Users Functions
async function loadUsers(page = 1) {
    try {
        showLoading('users-table-body');
        const response = await apiRequest(`/users?page=${page}&limit=10`);
        
        if (response.success) {
            renderUsersTable(response.data);
            renderPagination(response.pagination, 'users-pagination', loadUsers);
        }
    } catch (error) {
        document.getElementById('users-table-body').innerHTML = '<tr><td colspan="6">Failed to load users</td></tr>';
    }
}

function renderUsersTable(users) {
    const tbody = document.getElementById('users-table-body');
    
    if (users.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6">No users found</td></tr>';
        return;
    }

    tbody.innerHTML = users.map(user => `
        <tr>
            <td>${user.id}</td>
            <td>${user.name}</td>
            <td>${user.email}</td>
            <td><span class="status-badge ${user.role === 'admin' ? 'active' : 'inactive'}">${user.role}</span></td>
            <td>${formatDate(user.created_at)}</td>
            <td>
                <button class="btn btn-warning" onclick="editUser(${user.id})">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn btn-danger" onclick="deleteUser(${user.id})">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        </tr>
    `).join('');
}

async function searchUsers() {
    const query = document.getElementById('users-search').value;
    if (query.trim() === '') {
        loadUsers();
        return;
    }

    try {
        showLoading('users-table-body');
        const response = await apiRequest(`/users/search?q=${encodeURIComponent(query)}`);
        
        if (response.success) {
            renderUsersTable(response.data);
            document.getElementById('users-pagination').innerHTML = '';
        }
    } catch (error) {
        document.getElementById('users-table-body').innerHTML = '<tr><td colspan="6">Search failed</td></tr>';
    }
}

async function deleteUser(id) {
    if (!confirm('Are you sure you want to delete this user?')) return;

    try {
        const response = await apiRequest(`/users/${id}`, { method: 'DELETE' });
        
        if (response.success) {
            showToast('User deleted successfully', 'success');
            loadUsers();
        }
    } catch (error) {
        showToast('Failed to delete user', 'error');
    }
}

async function editUser(id) {
    try {
        const response = await apiRequest(`/users/${id}`);
        
        if (response.success) {
            openEditModal('user', response.data);
        }
    } catch (error) {
        showToast('Failed to load user data', 'error');
    }
}

// Products Functions
async function loadProducts(page = 1, categoryId = '') {
    try {
        showLoading('products-table-body');
        let url = `/products?page=${page}&limit=10`;
        if (categoryId) url += `&category_id=${categoryId}`;
        
        const response = await apiRequest(url);
        
        if (response.success) {
            renderProductsTable(response.data);
            renderPagination(response.pagination, 'products-pagination', loadProducts);
        }
    } catch (error) {
        document.getElementById('products-table-body').innerHTML = '<tr><td colspan="7">Failed to load products</td></tr>';
    }
}

function renderProductsTable(products) {
    const tbody = document.getElementById('products-table-body');
    
    if (products.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7">No products found</td></tr>';
        return;
    }

    tbody.innerHTML = products.map(product => `
        <tr>
            <td>${product.id}</td>
            <td>
                ${product.image ? `<img src="${CONFIG.API_BASE_URL.replace('/api', '')}/${product.image}" alt="${product.name}">` : '<i class="fas fa-image"></i>'}
            </td>
            <td>${product.name}</td>
            <td>${product.category_name || 'N/A'}</td>
            <td>$${parseFloat(product.price).toFixed(2)}</td>
            <td>
                <span class="status-badge ${product.stock_quantity <= 10 ? 'low-stock' : 'active'}">
                    ${product.stock_quantity}
                </span>
            </td>
            <td>
                <button class="btn btn-warning" onclick="editProduct(${product.id})">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn btn-danger" onclick="deleteProduct(${product.id})">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        </tr>
    `).join('');
}

async function searchProducts() {
    const query = document.getElementById('products-search').value;
    if (query.trim() === '') {
        loadProducts();
        return;
    }

    try {
        showLoading('products-table-body');
        const response = await apiRequest(`/products/search?q=${encodeURIComponent(query)}`);
        
        if (response.success) {
            renderProductsTable(response.data);
            document.getElementById('products-pagination').innerHTML = '';
        }
    } catch (error) {
        document.getElementById('products-table-body').innerHTML = '<tr><td colspan="7">Search failed</td></tr>';
    }
}

async function filterProductsByCategory() {
    const categoryId = document.getElementById('category-filter').value;
    loadProducts(1, categoryId);
}

async function deleteProduct(id) {
    if (!confirm('Are you sure you want to delete this product?')) return;

    try {
        const response = await apiRequest(`/products/${id}`, { method: 'DELETE' });
        
        if (response.success) {
            showToast('Product deleted successfully', 'success');
            loadProducts();
        }
    } catch (error) {
        showToast('Failed to delete product', 'error');
    }
}

async function editProduct(id) {
    try {
        const response = await apiRequest(`/products/${id}`);
        
        if (response.success) {
            openEditModal('product', response.data);
        }
    } catch (error) {
        showToast('Failed to load product data', 'error');
    }
}

// Categories Functions
async function loadCategories(selectId = null) {
    try {
        const response = await apiRequest('/categories/with-count');
        
        if (response.success) {
            if (selectId) {
                renderCategoriesSelect(response.data, selectId);
            } else {
                showLoading('categories-table-body');
                renderCategoriesTable(response.data);
            }
        }
    } catch (error) {
        if (!selectId) {
            document.getElementById('categories-table-body').innerHTML = '<tr><td colspan="6">Failed to load categories</td></tr>';
        }
    }
}

function renderCategoriesTable(categories) {
    const tbody = document.getElementById('categories-table-body');
    
    if (categories.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6">No categories found</td></tr>';
        return;
    }

    tbody.innerHTML = categories.map(category => `
        <tr>
            <td>${category.id}</td>
            <td>
                ${category.image ? `<img src="${CONFIG.API_BASE_URL.replace('/api', '')}/${category.image}" alt="${category.name}">` : '<i class="fas fa-image"></i>'}
            </td>
            <td>${category.name}</td>
            <td>${category.description || 'N/A'}</td>
            <td>${category.product_count || 0}</td>
            <td>
                <button class="btn btn-warning" onclick="editCategory(${category.id})">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn btn-danger" onclick="deleteCategory(${category.id})">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        </tr>
    `).join('');
}

function renderCategoriesSelect(categories, selectId) {
    const select = document.getElementById(selectId);
    const currentValue = select.value;
    
    select.innerHTML = '<option value="">All Categories</option>' + 
        categories.map(category => `
            <option value="${category.id}">${category.name}</option>
        `).join('');
    
    if (currentValue) {
        select.value = currentValue;
    }
}

async function searchCategories() {
    const query = document.getElementById('categories-search').value;
    if (query.trim() === '') {
        loadCategories();
        return;
    }

    try {
        showLoading('categories-table-body');
        const response = await apiRequest(`/categories/search?q=${encodeURIComponent(query)}`);
        
        if (response.success) {
            renderCategoriesTable(response.data);
        }
    } catch (error) {
        document.getElementById('categories-table-body').innerHTML = '<tr><td colspan="6">Search failed</td></tr>';
    }
}

async function deleteCategory(id) {
    if (!confirm('Are you sure you want to delete this category?')) return;

    try {
        const response = await apiRequest(`/categories/${id}`, { method: 'DELETE' });
        
        if (response.success) {
            showToast('Category deleted successfully', 'success');
            loadCategories();
        }
    } catch (error) {
        showToast('Failed to delete category', 'error');
    }
}

async function editCategory(id) {
    try {
        const response = await apiRequest(`/categories/${id}`);
        
        if (response.success) {
            openEditModal('category', response.data);
        }
    } catch (error) {
        showToast('Failed to load category data', 'error');
    }
}

// Modal Functions
function openAddModal() {
    const modal = document.getElementById('modal');
    const title = document.getElementById('modal-title');
    const form = document.getElementById('modal-form');
    
    title.textContent = `Add New ${currentPage.slice(0, -1)}`;
    form.innerHTML = generateForm(currentPage.slice(0, -1));
    
    modal.classList.add('active');
    currentData = {};
}

function openEditModal(type, data) {
    const modal = document.getElementById('modal');
    const title = document.getElementById('modal-title');
    const form = document.getElementById('modal-form');
    
    title.textContent = `Edit ${type}`;
    form.innerHTML = generateForm(type, data);
    
    modal.classList.add('active');
    currentData = data;
}

function closeModal() {
    document.getElementById('modal').classList.remove('active');
    currentData = {};
}

function generateForm(type, data = {}) {
    switch(type) {
        case 'user':
            return `
                <div class="form-group">
                    <label>Name</label>
                    <input type="text" name="name" value="${data.name || ''}" required>
                </div>
                <div class="form-group">
                    <label>Email</label>
                    <input type="email" name="email" value="${data.email || ''}" required>
                </div>
                ${!data.id ? `
                <div class="form-group">
                    <label>Password</label>
                    <input type="password" name="password" required>
                </div>
                ` : ''}
                <div class="form-group">
                    <label>Phone</label>
                    <input type="tel" name="phone" value="${data.phone || ''}">
                </div>
                <div class="form-group">
                    <label>Address</label>
                    <textarea name="address">${data.address || ''}</textarea>
                </div>
                <div class="form-group">
                    <label>Role</label>
                    <select name="role" required>
                        <option value="customer" ${data.role === 'customer' ? 'selected' : ''}>Customer</option>
                        <option value="admin" ${data.role === 'admin' ? 'selected' : ''}>Admin</option>
                    </select>
                </div>
            `;
            
        case 'product':
            return `
                <div class="form-group">
                    <label>Name</label>
                    <input type="text" name="name" value="${data.name || ''}" required>
                </div>
                <div class="form-group">
                    <label>Description</label>
                    <textarea name="description">${data.description || ''}</textarea>
                </div>
                <div class="form-group">
                    <label>Price</label>
                    <input type="number" step="0.01" name="price" value="${data.price || ''}" required>
                </div>
                <div class="form-group">
                    <label>Category</label>
                    <select name="category_id" id="modal-category-select" required>
                        <option value="">Select Category</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Stock Quantity</label>
                    <input type="number" name="stock_quantity" value="${data.stock_quantity || ''}" required>
                </div>
                <div class="form-group">
                    <label>SKU</label>
                    <input type="text" name="sku" value="${data.sku || ''}" required>
                </div>
                <div class="form-group">
                    <label>Image</label>
                    <input type="file" name="image" accept="image/*">
                </div>
                <div class="form-group">
                    <label>Status</label>
                    <select name="is_active">
                        <option value="1" ${data.is_active === 1 ? 'selected' : ''}>Active</option>
                        <option value="0" ${data.is_active === 0 ? 'selected' : ''}>Inactive</option>
                    </select>
                </div>
            `;
            
        case 'category':
            return `
                <div class="form-group">
                    <label>Name</label>
                    <input type="text" name="name" value="${data.name || ''}" required>
                </div>
                <div class="form-group">
                    <label>Description</label>
                    <textarea name="description">${data.description || ''}</textarea>
                </div>
                <div class="form-group">
                    <label>Image</label>
                    <input type="file" name="image" accept="image/*">
                </div>
            `;
    }
}

async function handleFormSubmit(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const type = currentPage.slice(0, -1);
    const isEdit = currentData.id;
    
    try {
        let response;
        
        if (type === 'user') {
            const userData = Object.fromEntries(formData.entries());
            
            if (isEdit) {
                response = await apiRequest(`/users/${currentData.id}`, {
                    method: 'PUT',
                    body: JSON.stringify(userData)
                });
            } else {
                response = await apiRequest('/users/register', {
                    method: 'POST',
                    body: JSON.stringify(userData)
                });
            }
        } else {
            const endpoint = isEdit ? 
                `/${currentPage}/${currentData.id}` : 
                `/${currentPage}`;
            const method = isEdit ? 'PUT' : 'POST';
            
            response = await apiRequestWithFile(endpoint, formData, method);
        }
        
        if (response.success) {
            showToast(`${type} ${isEdit ? 'updated' : 'created'} successfully`, 'success');
            closeModal();
            
            // Reload the current page data
            switch(currentPage) {
                case 'users':
                    loadUsers();
                    break;
                case 'products':
                    loadProducts();
                    break;
                case 'categories':
                    loadCategories();
                    break;
            }
        }
    } catch (error) {
        showToast(`Failed to ${isEdit ? 'update' : 'create'} ${type}`, 'error');
    }
}

// Utility Functions
function showLoading(containerId) {
    const container = document.getElementById(containerId);
    container.innerHTML = `
        <tr>
            <td colspan="10" class="loading">
                <div class="spinner"></div>
            </td>
        </tr>
    `;
}

function renderPagination(pagination, containerId, loadFunction) {
    const container = document.getElementById(containerId);
    
    if (pagination.totalPages <= 1) {
        container.innerHTML = '';
        return;
    }
    
    let html = '';
    
    // Previous button
    if (pagination.page > 1) {
        html += `<button onclick="${loadFunction.name}(${pagination.page - 1})">Previous</button>`;
    }
    
    // Page numbers
    for (let i = 1; i <= pagination.totalPages; i++) {
        if (i === pagination.page) {
            html += `<button class="active">${i}</button>`;
        } else {
            html += `<button onclick="${loadFunction.name}(${i})">${i}</button>`;
        }
    }
    
    // Next button
    if (pagination.page < pagination.totalPages) {
        html += `<button onclick="${loadFunction.name}(${pagination.page + 1})">Next</button>`;
    }
    
    container.innerHTML = html;
}

function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <i class="fas fa-${type === 'success' ? 'check' : type === 'error' ? 'times' : 'info'}"></i>
        <span>${message}</span>
    `;
    
    container.appendChild(toast);
    
    // Trigger animation
    setTimeout(() => toast.classList.add('show'), 100);
    
    // Remove toast after 3 seconds
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => container.removeChild(toast), 300);
    }, 3000);
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
}

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Settings Functions
function saveSettings() {
    const apiUrl = document.getElementById('api-url').value;
    CONFIG.API_BASE_URL = apiUrl;
    localStorage.setItem('api_url', apiUrl);
    showToast('Settings saved successfully', 'success');
}

function saveAuth() {
    const token = document.getElementById('jwt-token').value;
    CONFIG.JWT_TOKEN = token;
    localStorage.setItem('jwt_token', token);
    showToast('Authentication token saved', 'success');
}

// Load categories for product form modal
document.addEventListener('DOMContentLoaded', function() {
    const observer = new MutationObserver(function(mutations) {
        mutations.forEach(function(mutation) {
            if (mutation.type === 'childList') {
                const categorySelect = document.getElementById('modal-category-select');
                if (categorySelect && !categorySelect.hasAttribute('data-loaded')) {
                    categorySelect.setAttribute('data-loaded', 'true');
                    loadCategoriesForSelect(categorySelect);
                }
            }
        });
    });
    
    observer.observe(document.body, {
        childList: true,
        subtree: true
    });
});

async function loadCategoriesForSelect(select) {
    try {
        const response = await apiRequest('/categories');
        if (response.success) {
            const currentValue = currentData.category_id;
            select.innerHTML = '<option value="">Select Category</option>' + 
                response.data.map(category => `
                    <option value="${category.id}" ${category.id == currentValue ? 'selected' : ''}>${category.name}</option>
                `).join('');
        }
    } catch (error) {
        console.error('Failed to load categories for select:', error);
    }
}
