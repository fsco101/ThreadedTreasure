// Categories Manager - ThreadedTreasure Admin
// Handles all category-related CRUD operations

class CategoriesManager {
    constructor() {
        this.currentMode = 'add'; // 'add' or 'edit'
        this.currentId = null;
        this.categoriesTable = null;
        
        this.init();
    }

    async init() {
        console.log('🚀 Starting Categories Manager initialization...');
        
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
            console.log('🚀 Categories Manager initialized successfully');
        } catch (error) {
            console.error('❌ Failed to initialize categories table:', error);
            this.showError('Initialization Failed', 'Failed to load categories data. Please refresh the page.');
        }
    }

    setupEventListeners() {
        // Save button
        $('#saveCategoryButton').on('click', () => this.saveCategory());

        // Modal close event
        $('#categoryModal').on('hidden.bs.modal', () => this.resetForm());

        // Select all checkbox
        $('#selectAllCategories').on('change', (e) => {
            $('#categoriesTable tbody input[type="checkbox"]').prop('checked', e.target.checked);
        });

        // Setup jQuery Validation
        this.setupFormValidation();
    }

    setupFormValidation() {
        // Setup jQuery Validation for category form
        $('#categoryForm').validate({
            rules: {
                name: {
                    required: true,
                    minlength: 2,
                    maxlength: 100
                },
                description: {
                    maxlength: 500
                }
            },
            messages: {
                name: {
                    required: "Category name is required",
                    minlength: "Category name must be at least 2 characters long",
                    maxlength: "Category name cannot exceed 100 characters"
                },
                description: {
                    maxlength: "Description cannot exceed 500 characters"
                }
            },
            errorElement: 'span',
            errorPlacement: function(error, element) {
                error.addClass('error');
                element.closest('.mb-3').append(error);
            },
            highlight: function(element, errorClass, validClass) {
                $(element).addClass('error').removeClass('valid');
            },
            unhighlight: function(element, errorClass, validClass) {
                $(element).removeClass('error').addClass('valid');
            },
            submitHandler: function(form) {
                // This will be handled by the saveCategory method
                return false;
            }
        });
    }

    async initializeTable() {
        console.log('🏷️ Initializing Categories Table...');
        
        const token = window.adminAuth.getToken();
        
        this.categoriesTable = $('#categoriesTable').DataTable({
            ajax: {
                url: '/api/categories',
                type: 'GET',
                headers: { 
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                dataSrc: function(json) {
                    console.log('🏷️ Categories API Response:', json);
                    if (json.success && json.data) {
                        return json.data;
                    } else {
                        console.error('❌ Categories API Error: Invalid response format', json);
                        return [];
                    }
                },
                error: function(xhr, error, thrown) {
                    console.error('❌ Categories API Error:', {
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
                { data: 'name' },
                { 
                    data: 'description',
                    render: (data) => {
                        if (!data) return '-';
                        return data.length > 50 ? data.substring(0, 50) + '...' : data;
                    }
                },
                { 
                    data: 'created_at',
                    render: (data) => data ? new Date(data).toLocaleDateString() : 'N/A'
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
            autoWidth: false,
            deferRender: true,
            stateSave: false,
            columnDefs: [
                {
                    targets: 0, // Checkbox column
                    width: '60px',
                    className: 'text-center align-middle'
                },
                {
                    targets: -1, // Actions column (last column)
                    width: '60px',
                    className: 'text-center align-middle'
                }
            ],
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
            drawCallback: function() {
                // No image handling needed
            },
            language: {
                search: "_INPUT_",
                searchPlaceholder: "Search categories...",
                lengthMenu: "Show _MENU_ entries",
                info: "Showing _START_ to _END_ of _TOTAL_ entries",
                infoEmpty: "Showing 0 to 0 of 0 entries",
                infoFiltered: "(filtered from _MAX_ total entries)",
                emptyTable: "No categories available",
                loadingRecords: "Loading categories...",
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
                <button class="action-btn btn-view" onclick="categoriesManager.viewCategory(${id})" title="View">
                    <i class="fas fa-eye"></i>
                </button>
                <button class="action-btn btn-edit" onclick="categoriesManager.editCategory(${id})" title="Edit">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="action-btn btn-delete" onclick="categoriesManager.deleteCategory(${id})" title="Delete">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `;
    }

    openAddCategoryModal() {
        console.log('🏷️ Opening add category modal');
        this.currentMode = 'add';
        this.currentId = null;
        
        $('#categoryModalTitle').html('<i class="fas fa-plus me-2"></i>Add Category');
        $('#saveCategoryButton').html('<i class="fas fa-save me-2"></i>Save Category');
        
        this.generateCategoryForm();
        this.resetForm();
        
        $('#categoryModal').modal('show');
    }

    async editCategory(id) {
        this.currentMode = 'edit';
        this.currentId = id;
        
        $('#categoryModalTitle').html('<i class="fas fa-edit me-2"></i>Edit Category');
        $('#saveCategoryButton').html('<i class="fas fa-save me-2"></i>Update Category');
        
        try {
            const response = await $.ajax({
                url: `/api/categories/${id}`,
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${window.adminAuth.getToken()}`,
                    'Content-Type': 'application/json'
                }
            });
            
            if (response.success) {
                this.generateCategoryForm(response.data);
                $('#categoryModal').modal('show');
            } else {
                this.showError('Error', response.message || 'Failed to load category data');
            }
        } catch (error) {
            console.error('Edit category error:', error);
            this.showError('Error', 'Failed to load category data');
        }
    }

    async viewCategory(id) {
        try {
            const response = await $.ajax({
                url: `/api/categories/${id}`,
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${window.adminAuth.getToken()}`,
                    'Content-Type': 'application/json'
                }
            });
            
            if (response.success) {
                this.showCategoryViewModal(response.data);
            } else {
                this.showError('Error', response.message || 'Failed to load category data');
            }
        } catch (error) {
            console.error('View category error:', error);
            this.showError('Error', 'Failed to load category data');
        }
    }

    async deleteCategory(id) {
        const result = await Swal.fire({
            title: 'Are you sure?',
            text: "You won't be able to revert this category! All products in this category will be uncategorized.",
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
                    url: `/api/categories/${id}`,
                    method: 'DELETE',
                    headers: {
                        'Authorization': `Bearer ${window.adminAuth.getToken()}`,
                        'Content-Type': 'application/json'
                    }
                });
                
                if (response.success) {
                    Swal.fire('Deleted!', 'Category has been deleted.', 'success');
                    this.refreshTable();
                } else {
                    this.showError('Error', response.message || 'Failed to delete category');
                }
            } catch (error) {
                console.error('Delete category error:', error);
                this.showError('Error', 'Failed to delete category');
            }
        }
    }

    generateCategoryForm(data = null) {
        const categoryName = data ? data.name : '';
        const categorySlug = data ? data.slug : '';
        const categoryDescription = data ? data.description : '';
        
        const formHtml = `
            <div class="row">
                <div class="col-md-6">
                    <div class="mb-3">
                        <label class="form-label fw-bold text-primary">
                            <i class="fas fa-tag me-2"></i>Category Name *
                        </label>
                        <input type="text" 
                               class="form-control" 
                               name="name" 
                               placeholder="Enter category name"
                               value="${categoryName}"
                               required>
                        <small class="form-text text-muted">Enter a descriptive category name</small>
                    </div>
                </div>
                <div class="col-md-6">
                    <div class="mb-3">
                        <label class="form-label fw-bold text-primary">
                            <i class="fas fa-link me-2"></i>Slug
                        </label>
                        <input type="text" 
                               class="form-control" 
                               name="slug" 
                               placeholder="category-slug"
                               value="${categorySlug}">
                        <small class="form-text text-muted">URL-friendly version (auto-generated if empty)</small>
                    </div>
                </div>
                <div class="col-12">
                    <div class="mb-3">
                        <label class="form-label fw-bold text-primary">
                            <i class="fas fa-align-left me-2"></i>Description
                        </label>
                        <textarea class="form-control" 
                                  name="description" 
                                  rows="4" 
                                  placeholder="Describe this category and what products it contains">${categoryDescription}</textarea>
                        <small class="form-text text-muted">Provide a description to help customers understand this category</small>
                    </div>
                </div>
            </div>
        `;
        
        $('#categoryFormFields').html(formHtml);
        
        // Auto-generate slug when typing name
        $('input[name="name"]').on('input', function() {
            if (!data) { // Only auto-generate for new categories
                const slug = $(this).val()
                    .toLowerCase()
                    .replace(/[^a-z0-9\s-]/g, '')
                    .replace(/\s+/g, '-')
                    .replace(/-+/g, '-')
                    .trim('-');
                $('input[name="slug"]').val(slug);
            }
        });
    }

    async saveCategory() {
        // Validate form first
        if (!$('#categoryForm').valid()) {
            console.log('❌ Form validation failed');
            Swal.fire({
                icon: 'error',
                title: 'Validation Error',
                text: 'Please correct the errors in the form before submitting.',
                timer: 3000,
                showConfirmButton: false
            });
            return;
        }

        const formData = new FormData($('#categoryForm')[0]);
        
        try {
            console.log(`💾 Saving category (${this.currentMode} mode)...`);
            $('#saveCategoryButton').prop('disabled', true).html('<i class="fas fa-spinner fa-spin me-2"></i>Saving...');
            
            const url = this.currentMode === 'add' ? '/api/categories' : `/api/categories/${this.currentId}`;
            const method = this.currentMode === 'add' ? 'POST' : 'PUT';
            
            const response = await $.ajax({
                url: url,
                method: method,
                data: formData,
                processData: false,
                contentType: false,
                headers: {
                    'Authorization': `Bearer ${window.adminAuth.getToken()}`
                }
            });
            
            if (response.success) {
                console.log(`✅ Category ${this.currentMode === 'add' ? 'created' : 'updated'} successfully`);
                Swal.fire({
                    icon: 'success',
                    title: 'Success!',
                    text: `Category ${this.currentMode === 'add' ? 'created' : 'updated'} successfully.`,
                    timer: 2000,
                    showConfirmButton: false
                });
                $('#categoryModal').modal('hide');
                this.refreshTable();
            } else {
                this.showError('Error', response.message || 'Operation failed');
            }
        } catch (error) {
            console.error('❌ Save category error:', error);
            let errorMessage = 'Failed to save category';
            if (error.responseJSON && error.responseJSON.message) {
                errorMessage = error.responseJSON.message;
            }
            this.showError('Error', errorMessage);
        } finally {
            $('#saveCategoryButton').prop('disabled', false).html('<i class="fas fa-save me-2"></i>Save Category');
        }
    }

    resetForm() {
        $('#categoryForm')[0].reset();
        
        // Clear validation errors
        if ($('#categoryForm').data('validator')) {
            $('#categoryForm').validate().resetForm();
            $('#categoryForm').find('.error').removeClass('error');
            $('#categoryForm').find('.valid').removeClass('valid');
        }
    }

    refreshTable() {
        if (this.categoriesTable) {
            this.categoriesTable.ajax.reload();
        }
    }

    showCategoryViewModal(category) {
        let content = `
            <div class="row">
                <div class="col-md-6">
                    <h6><strong>Category Name:</strong></h6>
                    <p>${category.name}</p>
                    
                    <h6><strong>Slug:</strong></h6>
                    <p>${category.slug || 'N/A'}</p>
                    
                    <h6><strong>Products Count:</strong></h6>
                    <p>${category.products_count || 0} products</p>
                </div>
                <div class="col-md-6">
                    <h6><strong>Created:</strong></h6>
                    <p>${new Date(category.created_at).toLocaleDateString()}</p>
                    
                    ${category.updated_at ? `
                    <h6><strong>Last Updated:</strong></h6>
                    <p>${new Date(category.updated_at).toLocaleDateString()}</p>
                    ` : ''}
                </div>
                ${category.description ? `
                <div class="col-12">
                    <h6><strong>Description:</strong></h6>
                    <p>${category.description}</p>
                </div>
                ` : ''}
            </div>
        `;

        Swal.fire({
            title: `<i class="fas fa-tag me-2"></i>Category Details`,
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
function openAddCategoryModal() {
    if (window.categoriesManager) {
        window.categoriesManager.openAddCategoryModal();
    }
}

function refreshCategoriesTable() {
    if (window.categoriesManager) {
        window.categoriesManager.refreshTable();
    }
}

function exportCategories() {
    if (window.categoriesManager && window.categoriesManager.categoriesTable) {
        window.categoriesManager.categoriesTable.buttons.exportData();
    }
}

// Initialize Categories Manager
$(document).ready(() => {
    if (typeof window.categoriesManager === 'undefined') {
        window.categoriesManager = new CategoriesManager();
    }
});