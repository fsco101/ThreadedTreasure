// Users Manager - ThreadedTreasure Admin
// Handles all user-related CRUD operations

class UsersManager {
    constructor() {
        this.currentMode = 'add'; // 'add' or 'edit'
        this.currentId = null;
        this.usersTable = null;
        this.currentFilter = 'all';
        this.users = [];
        
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

        // Filter buttons
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const filter = e.target.dataset.filter;
                this.filterUsers(filter);
            });
        });

        // Refresh button
        $('#refreshBtn').on('click', () => this.refreshUsers());
        
        // Advanced search functionality
        this.setupAdvancedSearch();
    }

    setupAdvancedSearch() {
        // Custom search function for better user filtering
        $.fn.dataTable.ext.search.push((settings, data, dataIndex) => {
            // Only apply to our users table
            if (settings.nTable.id !== 'usersTable') {
                return true;
            }
            
            // Apply filter if not 'all'
            if (this.currentFilter !== 'all') {
                const roleColumn = data[5]; // Role column index
                const statusColumn = data[6]; // Status column index
                
                switch (this.currentFilter) {
                    case 'admin':
                        return roleColumn.toLowerCase().includes('admin');
                    case 'user':
                        return roleColumn.toLowerCase().includes('user') || roleColumn.toLowerCase().includes('customer');
                    case 'active':
                        return statusColumn.toLowerCase().includes('active');
                    case 'inactive':
                        return statusColumn.toLowerCase().includes('inactive');
                    default:
                        return true;
                }
            }
            
            return true;
        });
    }

    async initializeTable() {
        console.log('👥 Initializing Users Table...');
        
        try {
            // First load all users data
            await this.loadAllUsers();
            
            const token = window.adminAuth.getToken();
            
            this.usersTable = $('#usersTable').DataTable({
                data: this.users,
                columns: [
                    { 
                        data: null,
                        orderable: false,
                        searchable: false,
                        render: (data, type, row) => `<input type="checkbox" value="${row.id}">`
                    },
                    { 
                        data: 'id',
                        title: 'ID',
                        render: (data, type) => {
                            if (type === 'export') return data;
                            return `<strong>#${data}</strong>`;
                        }
                    },
                    { 
                        data: 'profile_photo',
                        title: 'Avatar',
                        orderable: false,
                        searchable: false,
                        render: (data, type, row) => {
                            if (type === 'export') return '';
                            
                            const initial = row.name ? row.name.charAt(0).toUpperCase() : 'U';
                            if (data) {
                                const imgSrc = data.startsWith('/') ? data : `/uploads/users/${data}`;
                                return `
                                    <div class="user-avatar-container">
                                        <div class="avatar-placeholder">
                                            <i class="fas fa-user"></i>
                                        </div>
                                        <img src="${imgSrc}" 
                                             alt="Avatar" 
                                             class="user-avatar"
                                             onload="this.classList.add('loaded'); this.previousElementSibling.style.display='none';"
                                             onerror="this.style.display='none'; this.previousElementSibling.style.display='flex';">
                                    </div>
                                `;
                            }
                            return `
                                <div class="user-avatar-container">
                                    <div class="no-avatar-text">${initial}</div>
                                </div>
                            `;
                        }
                    },
                    { 
                        data: 'name',
                        title: 'Name',
                        render: (data, type, row) => {
                            if (type === 'export') return data || 'N/A';
                            return `<strong>${data || 'N/A'}</strong>`;
                        }
                    },
                    { 
                        data: 'email',
                        title: 'Email',
                        render: (data, type) => {
                            if (type === 'export') return data || 'N/A';
                            return data || 'N/A';
                        }
                    },
                    { 
                        data: 'role',
                        title: 'Role',
                        render: (data, type) => {
                            const role = data || 'user';
                            if (type === 'export') return role.toUpperCase();
                            const roleClass = `role-${role.toLowerCase()}`;
                            return `<span class="role-badge ${roleClass}">${role.toUpperCase()}</span>`;
                        }
                    },
                    { 
                        data: 'is_active',
                        title: 'Status',
                        render: (data, type) => {
                            const isActive = Number(data) === 1;
                            const status = isActive ? 'Active' : 'Inactive';
                            if (type === 'export') return status;
                            return `<span class="status-badge ${isActive ? 'status-active' : 'status-inactive'}">${status}</span>`;
                        }
                    },
                    { 
                        data: 'last_login',
                        title: 'Last Login',
                        render: (data, type) => {
                            if (!data) return 'Never';
                            const date = new Date(data);
                            if (type === 'export') return date.toLocaleDateString();
                            return `<span title="${date.toLocaleString()}">${date.toLocaleDateString()}</span>`;
                        }
                    },
                    {
                        data: null,
                        title: 'Actions',
                        orderable: false,
                        searchable: false,
                        render: (data, type, row) => {
                            if (type === 'export') return '';
                            return this.getActionButtons(row.id);
                        }
                    }
                ],
                ...this.getTableConfig()
            });
            
            console.log('✅ Users table initialized with', this.users.length, 'users');
        } catch (error) {
            console.error('❌ Failed to initialize users table:', error);
            this.showError('Error', 'Failed to load users data');
        }
    }

    async loadAllUsers() {
        try {
            const token = window.adminAuth.getToken();
            const response = await $.ajax({
                url: '/api/users',
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            
            if (response.success && response.data) {
                this.users = response.data;
                console.log('✅ Loaded users:', this.users.length);
            } else {
                console.error('❌ Users API Error: Invalid response format', response);
                this.users = [];
            }
        } catch (error) {
            console.error('❌ Users API Error:', error);
            this.users = [];
            throw error;
        }
    }

    getTableConfig() {
        return {
            responsive: true,
            processing: true,
            serverSide: false,
            pageLength: 25,
            lengthMenu: [
                [10, 15, 25, 50, 100, -1], 
                [10, 15, 25, 50, 100, "All"]
            ],
            dom: '<"row"<"col-sm-12 col-md-6"l><"col-sm-12 col-md-6"f>>' +
                 '<"row"<"col-sm-12"tr>>' +
                 '<"row"<"col-sm-12 col-md-5"i><"col-sm-12 col-md-7"p>>' +
                 '<"row"<"col-sm-12"B>>',
            autoWidth: false,
            deferRender: true,
            stateSave: true,
            stateDuration: 60 * 60 * 24, // Save state for 24 hours
            columnDefs: [
                {
                    targets: [0, 8], // Checkbox and actions columns
                    width: '80px',
                    className: 'text-center align-middle'
                },
                {
                    targets: [1], // ID column
                    width: '80px',
                    className: 'text-center align-middle'
                },
                {
                    targets: [2], // Avatar column
                    width: '80px',
                    className: 'text-center align-middle'
                },
                {
                    targets: [3, 4], // Name and Email columns
                    width: '200px',
                    className: 'align-middle'
                },
                {
                    targets: [5, 6, 7], // Role, Status, Last Login columns
                    width: '120px',
                    className: 'text-center align-middle'
                }
            ],
            buttons: [
                {
                    extend: 'excel',
                    text: '<i class="fas fa-file-excel"></i> Excel',
                    className: 'btn btn-success btn-sm me-1',
                    exportOptions: {
                        columns: [1, 3, 4, 5, 6, 7] // Exclude checkbox, avatar, and actions
                    },
                    title: 'Users Report - ThreadedTreasure Admin'
                },
                {
                    extend: 'pdf',
                    text: '<i class="fas fa-file-pdf"></i> PDF',
                    className: 'btn btn-danger btn-sm me-1',
                    exportOptions: {
                        columns: [1, 3, 4, 5, 6, 7]
                    },
                    title: 'Users Report - ThreadedTreasure Admin'
                },
                {
                    extend: 'print',
                    text: '<i class="fas fa-print"></i> Print',
                    className: 'btn btn-info btn-sm',
                    exportOptions: {
                        columns: [1, 3, 4, 5, 6, 7]
                    },
                    title: 'Users Report - ThreadedTreasure Admin'
                }
            ],
            order: [[1, 'desc']],
            pagingType: 'full_numbers',
            pageInfo: true,
            searching: true,
            searchHighlight: true,
            drawCallback: function() {
                // Initialize avatars after table draw
                $('.user-avatar-container img').each(function() {
                    const img = $(this);
                    const placeholder = img.siblings('.avatar-placeholder');
                    
                    // Check if image is already loaded
                    if (this.complete && this.naturalHeight !== 0) {
                        img.addClass('loaded');
                        placeholder.hide();
                    }
                });
                
                // Update pagination info
                const api = this.api();
                const info = api.page.info();
                const pageInfo = `Page ${info.page + 1} of ${info.pages} (${info.recordsTotal} total users)`;
                $('.dataTables_info').text(pageInfo);
                
                console.log('Users DataTable draw complete. Rows:', info.recordsTotal);
            },
            language: {
                search: "_INPUT_",
                searchPlaceholder: "Search users...",
                lengthMenu: "Show _MENU_ users per page",
                info: "Showing _START_ to _END_ of _TOTAL_ users",
                infoEmpty: "No users available",
                infoFiltered: "(filtered from _MAX_ total users)",
                emptyTable: "No users found",
                loadingRecords: "Loading users...",
                processing: '<div class="d-flex justify-content-center"><div class="spinner-border text-primary" role="status"><span class="visually-hidden">Loading...</span></div></div>',
                paginate: {
                    first: '<i class="fas fa-angle-double-left"></i>',
                    previous: '<i class="fas fa-angle-left"></i>',
                    next: '<i class="fas fa-angle-right"></i>',
                    last: '<i class="fas fa-angle-double-right"></i>'
                },
                zeroRecords: "No matching users found"
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
        // Only allow editing role and is_active for existing users
        if (this.currentMode === 'edit') {
            const userRole = data ? data.role : 'user';
            const userActive = data ? (Number(data.is_active) === 1 ? 'checked' : '') : 'checked';
            $('#userFormFields').html(`
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
            `);
        }
    }

    async saveUser() {
        const form = $('#userForm')[0];
        const formData = new FormData(form);
        const isEdit = this.currentMode === 'edit';
        const id = this.currentId;
        let payload = {};
        if (isEdit) {
            // Only send role and is_active for edit, always as integer
            payload.role = formData.get('role');
            payload.is_active = formData.get('is_active') === 'on' ? 1 : 0;
        } else {
            // For add, send all fields, always as integer
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

    filterUsers(filter) {
        this.currentFilter = filter;
        
        // Update active filter button
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-filter="${filter}"]`).classList.add('active');
        
        // Apply filter to DataTable
        if (this.usersTable) {
            // Clear any existing search and redraw
            this.usersTable.search('').draw();
            
            // Show loading state
            this.showTableLoading(true);
            
            // Apply filter with animation
            setTimeout(() => {
                this.usersTable.draw();
                this.showTableLoading(false);
                
                // Update filter info
                this.updateFilterInfo(filter);
            }, 100);
        }
    }

    updateFilterInfo(filter) {
        const api = this.usersTable;
        if (!api) return;
        
        const info = api.page.info();
        let filterText = '';
        
        if (filter === 'all') {
            filterText = `Showing all ${info.recordsTotal} users`;
        } else {
            const filteredCount = info.recordsDisplay;
            const filterLabel = filter.charAt(0).toUpperCase() + filter.slice(1);
            filterText = `Showing ${filteredCount} ${filterLabel.toLowerCase()} users`;
        }
        
        // Update info display
        $('.dataTables_info').text(filterText);
        
        console.log(`🔍 Filter applied: ${filter} (${info.recordsDisplay}/${info.recordsTotal} users)`);
    }

    showTableLoading(show) {
        if (show) {
            $('#usersTable').addClass('table-loading');
            $('#usersTable tbody').append(`
                <tr class="loading-row">
                    <td colspan="9" class="text-center p-3">
                        <div class="spinner-border spinner-border-sm text-primary me-2" role="status"></div>
                        Applying filter...
                    </td>
                </tr>
            `);
        } else {
            $('#usersTable').removeClass('table-loading');
            $('.loading-row').remove();
        }
    }

    refreshUsers() {
        console.log('🔄 Refreshing users...');
        
        // Reset filter to 'all'
        this.currentFilter = 'all';
        document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
        document.querySelector('[data-filter="all"]').classList.add('active');
        
        // Reload users
        this.refreshTable();
    }

    async refreshTable() {
        try {
            console.log('🔄 Refreshing users table...');
            
            if (this.usersTable) {
                this.usersTable.destroy();
                this.usersTable = null;
            }
            
            await this.initializeTable();
            console.log('✅ Users table refreshed successfully');
        } catch (error) {
            console.error('❌ Failed to refresh users table:', error);
            this.showError('Refresh Failed', 'Failed to refresh users data. Please try again.');
        }
    }

    exportUsers(format = 'excel') {
        if (!this.usersTable) {
            this.showError('Export Error', 'No data available to export');
            return;
        }

        try {
            console.log(`📊 Exporting users to ${format}...`);
            
            switch (format) {
                case 'excel':
                    this.usersTable.button('.buttons-excel').trigger();
                    break;
                case 'pdf':
                    this.usersTable.button('.buttons-pdf').trigger();
                    break;
                case 'print':
                    this.usersTable.button('.buttons-print').trigger();
                    break;
                default:
                    this.showError('Export Error', 'Unsupported export format');
                    return;
            }
            
            this.showSuccess('Export Success', `Users exported to ${format.toUpperCase()} successfully!`);
        } catch (error) {
            console.error('Export error:', error);
            this.showError('Export Error', 'Failed to export users');
        }
    }

    // Advanced search methods
    searchByName(name) {
        if (this.usersTable) {
            this.usersTable.column(3).search(name).draw();
        }
    }

    searchByEmail(email) {
        if (this.usersTable) {
            this.usersTable.column(4).search(email).draw();
        }
    }

    searchByRole(role) {
        if (this.usersTable) {
            this.usersTable.column(5).search(role).draw();
        }
    }

    clearAllFilters() {
        this.currentFilter = 'all';
        
        // Reset filter buttons
        document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
        document.querySelector('[data-filter="all"]').classList.add('active');
        
        // Clear table search and redraw
        if (this.usersTable) {
            this.usersTable.search('').columns().search('').draw();
        }
        
        console.log('🧹 All filters cleared');
    }

    showSuccess(title, message) {
        if (typeof Swal !== 'undefined') {
            Swal.fire({
                icon: 'success',
                title: title,
                text: message
            });
        } else {
            alert(`${title}: ${message}`);
        }
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
        window.usersManager.refreshUsers();
    }
}

function exportUsers(format = 'excel') {
    if (window.usersManager) {
        window.usersManager.exportUsers(format);
    }
}

function clearAllFilters() {
    if (window.usersManager) {
        window.usersManager.clearAllFilters();
    }
}

function searchByName(name) {
    if (window.usersManager) {
        window.usersManager.searchByName(name);
    }
}

function searchByEmail(email) {
    if (window.usersManager) {
        window.usersManager.searchByEmail(email);
    }
}

function searchByRole(role) {
    if (window.usersManager) {
        window.usersManager.searchByRole(role);
    }
}

// Initialize Users Manager
$(document).ready(() => {
    if (typeof window.usersManager === 'undefined') {
        window.usersManager = new UsersManager();
    }
    
    // Add keyboard shortcuts
    $(document).on('keydown', (e) => {
        // Ctrl/Cmd + R for refresh
        if ((e.ctrlKey || e.metaKey) && e.key === 'r') {
            e.preventDefault();
            refreshUsersTable();
        }
        
        // Ctrl/Cmd + E for export
        if ((e.ctrlKey || e.metaKey) && e.key === 'e') {
            e.preventDefault();
            exportUsers();
        }
        
        // Escape to clear filters
        if (e.key === 'Escape') {
            clearAllFilters();
        }
    });
    
    console.log('🎯 Users Manager with enhanced filtering initialized');
});
