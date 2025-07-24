// Users Manager - ThreadedTreasure Admin
// Handles all user-related CRUD operations

class UsersManager {
    constructor() {
        this.currentMode = 'add'; // 'add' or 'edit'
        this.currentId = null;
        this.usersTable = null;
        
        this.init();
    }

    async init() {
        console.log('🚀 Starting Users Manager initialization...');
        
        // Check admin authentication
        if (!window.adminAuth || !window.adminAuth.checkAuth()) {
            console.error('❌ Admin not authenticated');
            window.location.href = '/login';
            return;
        }
        
        console.log('✅ Authentication verified');

        // Initialize components
        this.setupEventListeners();
        
        try {
            await this.initializeTable();
            console.log('🚀 Users Manager initialized successfully');
        } catch (error) {
            console.error('❌ Failed to initialize users table:', error);
            this.showError('Initialization Failed', 'Failed to load users data. Please refresh the page.');
        }
    }

    setupEventListeners() {
        // Save button
        $('#saveUserButton').on('click', () => this.saveUser());

        // Modal close event
        $('#userModal').on('hidden.bs.modal', () => this.resetForm());

        // Select all checkbox
        $('#selectAllUsers').on('change', (e) => {
            $('#usersTable tbody input[type="checkbox"]').prop('checked', e.target.checked);
        });
    }

    async initializeTable() {
        console.log('👥 Initializing Users Table...');
        
        const token = window.adminAuth.getToken();
        
        this.usersTable = $('#usersTable').DataTable({
            ajax: {
                url: '/api/users',
                type: 'GET',
                headers: { 
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                dataSrc: function(json) {
                    console.log('👥 Users API Response:', json);
                    if (json.success && json.data) {
                        return json.data;
                    } else {
                        console.error('❌ Users API Error: Invalid response format', json);
                        return [];
                    }
                },
                error: function(xhr, error, thrown) {
                    console.error('❌ Users API Error:', {
                        status: xhr.status,
                        statusText: xhr.statusText,
                        responseText: xhr.responseText,
                        error: error,
                        thrown: thrown
                    });
                    return [];
                }
            },
            columns: [
                { 
                    data: null,
                    orderable: false,
                    searchable: false,
                    render: (data, type, row) => `<input type="checkbox" value="${row.id}">`
                },
                { data: 'id' },
                { 
                    data: 'profile_photo',
                    orderable: false,
                    searchable: false,
                    render: (data, type, row) => {
                        const initial = row.name ? row.name.charAt(0).toUpperCase() : 'U';
                        if (data) {
                            const imgSrc = data.startsWith('/') ? data : `/uploads/users/${data}`;
                            return `<img src="${imgSrc}" alt="Avatar" style="width: 40px; height: 40px; object-fit: cover; border-radius: 50%;" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                                    <div style="width: 40px; height: 40px; background: linear-gradient(135deg, #667eea, #764ba2); color: white; border-radius: 50%; display: none; align-items: center; justify-content: center; font-weight: bold;">${initial}</div>`;
                        }
                        return `<div style="width: 40px; height: 40px; background: linear-gradient(135deg, #667eea, #764ba2); color: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold;">${initial}</div>`;
                    }
                },
                { data: 'name' },
                { data: 'email' },
                { 
                    data: 'role',
                    render: (data) => {
                        const roleClass = data === 'admin' ? 'status-active' : 'status-pending';
                        return `<span class="status-badge ${roleClass}">${data || 'customer'}</span>`;
                    }
                },
                { 
                    data: 'is_active',
                    render: (data) => {
                        // Accept 1, '1', true as active
                        const isActive = data == 1 || data === true || data === '1';
                        return `<span class="status-badge ${isActive ? 'status-active' : 'status-inactive'}">${isActive ? 'Active' : 'Inactive'}</span>`;
                    }
                },
                { 
                    data: 'last_login',
                    render: (data) => data ? new Date(data).toLocaleDateString() : 'Never'
                },
                {
                    data: null,
                    orderable: false,
                    searchable: false,
                    render: (data, type, row) => this.getActionButtons(row.id)
                }
            ],
            ...this.getTableConfig()
        });
    }

    getTableConfig() {
        return {
            responsive: true,
            processing: true,
            serverSide: false,
            pageLength: 25,
            lengthMenu: [[10, 25, 50, 100, -1], [10, 25, 50, 100, "All"]],
            dom: 'Bfrtip',
            buttons: [
                {
                    extend: 'excel',
                    text: '<i class="fas fa-file-excel"></i> Excel',
                    className: 'btn btn-success btn-sm'
                },
                {
                    extend: 'pdf',
                    text: '<i class="fas fa-file-pdf"></i> PDF',
                    className: 'btn btn-danger btn-sm'
                },
                {
                    extend: 'print',
                    text: '<i class="fas fa-print"></i> Print',
                    className: 'btn btn-info btn-sm'
                }
            ],
            order: [[1, 'desc']],
            language: {
                search: "_INPUT_",
                searchPlaceholder: "Search users...",
                lengthMenu: "Show _MENU_ entries",
                info: "Showing _START_ to _END_ of _TOTAL_ entries",
                infoEmpty: "Showing 0 to 0 of 0 entries",
                infoFiltered: "(filtered from _MAX_ total entries)",
                emptyTable: "No users available",
                loadingRecords: "Loading users...",
                processing: "Processing...",
                paginate: {
                    first: '<i class="fas fa-angle-double-left"></i>',
                    previous: '<i class="fas fa-angle-left"></i>',
                    next: '<i class="fas fa-angle-right"></i>',
                    last: '<i class="fas fa-angle-double-right"></i>'
                }
            }
        };
    }

    getActionButtons(id) {
        return `
            <div class="btn-group" role="group">
                <button class="action-btn btn-view" onclick="usersManager.viewUser(${id})" title="View">
                    <i class="fas fa-eye"></i>
                </button>
                <button class="action-btn btn-edit" onclick="usersManager.editUser(${id})" title="Edit">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="action-btn btn-delete" onclick="usersManager.deleteUser(${id})" title="Delete">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `;
    }

    openAddUserModal() {
        console.log('👥 Opening add user modal');
        this.currentMode = 'add';
        this.currentId = null;
        
        $('#userModalTitle').html('<i class="fas fa-plus me-2"></i>Add User');
        $('#saveUserButton').html('<i class="fas fa-save me-2"></i>Save User');
        
        this.generateUserForm();
        this.resetForm();
        
        $('#userModal').modal('show');
    }

    async editUser(id) {
        this.currentMode = 'edit';
        this.currentId = id;
        
        $('#userModalTitle').html('<i class="fas fa-edit me-2"></i>Edit User');
        $('#saveUserButton').html('<i class="fas fa-save me-2"></i>Update User');
        
        try {
            const response = await $.ajax({
                url: `/api/users/${id}`,
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${window.adminAuth.getToken()}`,
                    'Content-Type': 'application/json'
                }
            });
            
            if (response.success) {
                this.generateUserForm(response.data);
                $('#userModal').modal('show');
            } else {
                this.showError('Error', response.message || 'Failed to load user data');
            }
        } catch (error) {
            console.error('Edit user error:', error);
            this.showError('Error', 'Failed to load user data');
        }
    }

    async viewUser(id) {
        try {
            const response = await $.ajax({
                url: `/api/users/${id}`,
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${window.adminAuth.getToken()}`,
                    'Content-Type': 'application/json'
                }
            });
            
            if (response.success) {
                this.showUserViewModal(response.data);
            } else {
                this.showError('Error', response.message || 'Failed to load user data');
            }
        } catch (error) {
            console.error('View user error:', error);
            this.showError('Error', 'Failed to load user data');
        }
    }

    async deleteUser(id) {
        const result = await Swal.fire({
            title: 'Are you sure?',
            text: "You won't be able to revert this user account!",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#dc3545',
            cancelButtonColor: '#6c757d',
            confirmButtonText: 'Yes, delete it!',
            cancelButtonText: 'Cancel'
        });
        
        if (result.isConfirmed) {
            try {
                const response = await $.ajax({
                    url: `/api/users/${id}`,
                    method: 'DELETE',
                    headers: {
                        'Authorization': `Bearer ${window.adminAuth.getToken()}`,
                        'Content-Type': 'application/json'
                    }
                });
                
                if (response.success) {
                    Swal.fire('Deleted!', 'User has been deleted.', 'success');
                    this.refreshTable();
                } else {
                    this.showError('Error', response.message || 'Failed to delete user');
                }
            } catch (error) {
                console.error('Delete user error:', error);
                this.showError('Error', 'Failed to delete user');
            }
        }
    }

    generateUserForm(data = null) {
        const userRole = data ? data.role : 'user';
        const userActive = data ? (data.is_active ? 'checked' : '') : 'checked';
        let formHtml = '';
        if (this.currentMode === 'add') {
            // Full form for adding new user
            formHtml = `
                <div class="row">
                    <div class="col-md-6">
                        <div class="mb-3">
                            <label class="form-label fw-bold text-primary">
                                <i class="fas fa-user me-2"></i>Full Name *
                            </label>
                            <input type="text" class="form-control" name="name" placeholder="Enter full name" value="${data ? data.name : ''}" required>
                            <small class="form-text text-muted">User's complete name</small>
                        </div>
                    </div>
                    <div class="col-md-6">
                        <div class="mb-3">
                            <label class="form-label fw-bold text-primary">
                                <i class="fas fa-envelope me-2"></i>Email *
                            </label>
                            <input type="email" class="form-control" name="email" placeholder="Enter email address" value="${data ? data.email : ''}" required>
                            <small class="form-text text-muted">Must be a valid email address</small>
                        </div>
                    </div>
                    <div class="col-12">
                        <div class="mb-3">
                            <label class="form-label fw-bold text-primary">
                                <i class="fas fa-lock me-2"></i>Password *
                            </label>
                            <input type="password" class="form-control" name="password" placeholder="Enter password" required>
                            <small class="form-text text-muted">Minimum 6 characters required</small>
                        </div>
                    </div>
                    <div class="col-md-6">
                        <div class="mb-3">
                            <label class="form-label fw-bold text-primary">
                                <i class="fas fa-user-shield me-2"></i>Role *
                            </label>
                            <select class="form-select" name="role" required>
                                <option value="user" ${userRole === 'user' ? 'selected' : ''}>Customer</option>
                                <option value="admin" ${userRole === 'admin' ? 'selected' : ''}>Administrator</option>
                            </select>
                            <small class="form-text text-muted">User access level</small>
                        </div>
                    </div>
                    <div class="col-md-6">
                        <div class="mb-3">
                            <div class="form-check form-switch">
                                <input class="form-check-input" type="checkbox" name="is_active" id="userActiveSwitch" ${userActive}>
                                <label class="form-check-label fw-bold text-primary" for="userActiveSwitch">
                                    <i class="fas fa-toggle-on me-2"></i>Active Status
                                </label>
                            </div>
                            <small class="form-text text-muted">Enable/disable user account</small>
                        </div>
                    </div>
                </div>
            `;
        } else {
            // Only allow editing role and is_active for existing users
            formHtml = `
                <div class="row">
                    <div class="col-md-6">
                        <div class="mb-3">
                            <label class="form-label fw-bold text-primary">
                                <i class="fas fa-user-shield me-2"></i>Role *
                            </label>
                            <select class="form-select" name="role" required>
                                <option value="user" ${userRole === 'user' ? 'selected' : ''}>Customer</option>
                                <option value="admin" ${userRole === 'admin' ? 'selected' : ''}>Administrator</option>
                            </select>
                            <small class="form-text text-muted">User access level</small>
                        </div>
                    </div>
                    <div class="col-md-6">
                        <div class="mb-3">
                            <div class="form-check form-switch">
                                <input class="form-check-input" type="checkbox" name="is_active" id="userActiveSwitch" ${userActive}>
                                <label class="form-check-label fw-bold text-primary" for="userActiveSwitch">
                                    <i class="fas fa-toggle-on me-2"></i>Active Status
                                </label>
                            </div>
                            <small class="form-text text-muted">Enable/disable user account</small>
                        </div>
                    </div>
                </div>
            `;
        }
        $('#userFormFields').html(formHtml);
    }

    async saveUser() {
        const form = $('#userForm')[0];
        const formData = new FormData(form);
        const isEdit = this.currentMode === 'edit';
        const id = this.currentId;
        let payload = {};
        if (isEdit) {
            // Only send role and is_active for edit
            payload.role = formData.get('role');
            payload.is_active = formData.get('is_active') === 'on' ? 1 : 0;
        } else {
            // For add, send all fields
            payload.name = formData.get('name');
            payload.email = formData.get('email');
            payload.password = formData.get('password');
            payload.role = formData.get('role');
            payload.is_active = formData.get('is_active') === 'on' ? 1 : 0;
        }
        try {
            let response;
            if (isEdit) {
                response = await $.ajax({
                    url: `/api/users/${id}`,
                    method: 'PUT',
                    headers: {
                        'Authorization': `Bearer ${window.adminAuth.getToken()}`,
                        'Content-Type': 'application/json'
                    },
                    data: JSON.stringify(payload)
                });
            } else {
                response = await $.ajax({
                    url: '/api/users',
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${window.adminAuth.getToken()}`,
                        'Content-Type': 'application/json'
                    },
                    data: JSON.stringify(payload)
                });
            }
            if (response.success) {
                Swal.fire({
                    icon: 'success',
                    title: 'Success!',
                    text: isEdit ? 'User updated successfully' : 'User added successfully'
                });
                $('#userModal').modal('hide');
                this.refreshTable();
            } else {
                this.showError('Error', response.message || 'Failed to save user');
            }
        } catch (error) {
            console.error('Save user error:', error);
            this.showError('Error', 'Failed to save user');
        }
    }

    resetForm() {
        $('#userForm')[0].reset();
    }

    refreshTable() {
        if (this.usersTable) {
            this.usersTable.ajax.reload();
        }
    }

    showUserViewModal(user) {
        let content = `
            <div class="row">
                <div class="col-md-6">
                    <h6><strong>Full Name:</strong></h6>
                    <p>${user.name}</p>
                    
                    <h6><strong>Email:</strong></h6>
                    <p>${user.email}</p>
                    
                    <h6><strong>Phone:</strong></h6>
                    <p>${user.phone || 'Not provided'}</p>
                    
                    <h6><strong>Role:</strong></h6>
                    <p><span class="status-badge ${user.role === 'admin' ? 'status-active' : 'status-pending'}">${user.role || 'customer'}</span></p>
                </div>
                <div class="col-md-6">
                    <h6><strong>Status:</strong></h6>
                    <p><span class="status-badge ${user.is_active ? 'status-active' : 'status-inactive'}">${user.is_active ? 'Active' : 'Inactive'}</span></p>
                    
                    <h6><strong>Newsletter:</strong></h6>
                    <p><span class="status-badge ${user.newsletter_subscribed ? 'status-active' : 'status-inactive'}">${user.newsletter_subscribed ? 'Subscribed' : 'Not Subscribed'}</span></p>
                    
                    <h6><strong>Registered:</strong></h6>
                    <p>${new Date(user.created_at).toLocaleDateString()}</p>
                    
                    <h6><strong>Last Login:</strong></h6>
                    <p>${user.last_login ? new Date(user.last_login).toLocaleDateString() : 'Never'}</p>
                </div>
                ${user.address ? `
                <div class="col-12">
                    <h6><strong>Address:</strong></h6>
                    <p>${user.address}</p>
                </div>
                ` : ''}
            </div>
        `;

        Swal.fire({
            title: `<i class="fas fa-user me-2"></i>User Details`,
            html: content,
            width: 800,
            showConfirmButton: true,
            confirmButtonText: 'Close'
        });
    }

    showError(title, message) {
        if (typeof Swal !== 'undefined') {
            Swal.fire({
                icon: 'error',
                title: title,
                text: message
            });
        } else {
            alert(`${title}: ${message}`);
        }
    }
}

// Global functions for onclick events
function openAddUserModal() {
    if (window.usersManager) {
        window.usersManager.openAddUserModal();
    }
}

function refreshUsersTable() {
    if (window.usersManager) {
        window.usersManager.refreshTable();
    }
}

function exportUsers() {
    if (window.usersManager && window.usersManager.usersTable) {
        window.usersManager.usersTable.buttons.exportData();
    }
}

// Initialize Users Manager
$(document).ready(() => {
    if (typeof window.usersManager === 'undefined') {
        window.usersManager = new UsersManager();
    }
});
