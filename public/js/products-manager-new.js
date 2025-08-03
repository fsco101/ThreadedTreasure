// Products Manager - ThreadedTreasure Admin
// Handles all product-related CRUD operations

class ProductsManager {
    constructor() {
        this.currentMode = 'add'; // 'add' or 'edit'
        this.currentId = null;
        this.productsTable = null;
        this.categories = [];
        
        this.init();
    }

    async init() {
        console.log('🚀 Starting Products Manager initialization...');
        
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
            await this.loadCategories();
            await this.initializeTable();
            console.log('🚀 Products Manager initialized successfully');
        } catch (error) {
            console.error('❌ Failed to initialize products table:', error);
            this.showError('Initialization Failed', 'Failed to load products data. Please refresh the page.');
        }
    }

    setupEventListeners() {
        // Save button
        $('#saveProductButton').on('click', () => this.saveProduct());

        // Modal close event
        $('#productModal').on('hidden.bs.modal', () => this.resetForm());

        // Select all checkbox
        $('#selectAllProducts').on('change', (e) => {
            $('#productsTable tbody input[type="checkbox"]').prop('checked', e.target.checked);
        });

        // Setup jQuery Validation
        this.setupFormValidation();
    }

    setupFormValidation() {
        // Setup jQuery Validation for product form
        $('#productForm').validate({
            rules: {
                name: {
                    required: true,
                    minlength: 3,
                    maxlength: 255
                },
                price: {
                    required: true,
                    number: true,
                    min: 0.01
                },
                stock_quantity: {
                    required: true,
                    digits: true,
                    min: 0
                },
                category_id: {
                    required: false
                },
                description: {
                    maxlength: 1000
                },
                product_images: {
                    required: false,
                    accept: "image/*"
                }
            },
            messages: {
                name: {
                    required: "Product name is required",
                    minlength: "Product name must be at least 3 characters long",
                    maxlength: "Product name cannot exceed 255 characters"
                },
                price: {
                    required: "Price is required",
                    number: "Please enter a valid price",
                    min: "Price must be greater than 0"
                },
                stock_quantity: {
                    required: "Stock quantity is required",
                    digits: "Please enter a whole number",
                    min: "Stock quantity cannot be negative"
                },
                description: {
                    maxlength: "Description cannot exceed 1000 characters"
                },
                product_images: {
                    accept: "Please select valid image files (jpg, jpeg, png, gif, webp)"
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
                // This will be handled by the saveProduct method
                return false;
            }
        });

        // Add custom validation method for image files
        $.validator.addMethod("accept", function(value, element, param) {
            // If no file is selected, it's valid (since it's optional)
            if (!value) return true;
            
            // Get the file input element
            const files = element.files;
            if (!files || files.length === 0) return true;
            
            // Check each selected file
            for (let i = 0; i < files.length; i++) {
                const file = files[i];
                const fileType = file.type;
                
                // Check if it's an image file
                if (!fileType.startsWith('image/')) {
                    return false;
                }
                
                // Check specific image types
                const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
                if (!allowedTypes.includes(fileType)) {
                    return false;
                }
            }
            
            return true;
        }, "Please select valid image files only");
    }

    async loadCategories() {
        try {
            const response = await $.ajax({
                url: '/api/categories',
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${window.adminAuth.getToken()}`,
                    'Content-Type': 'application/json'
                }
            });
            
            if (response.success) {
                this.categories = response.data;
                console.log('🏷️ Loaded categories:', this.categories.length);
            }
        } catch (error) {
            console.error('❌ Failed to load categories:', error);
        }
    }

    async initializeTable() {
        console.log('📦 Initializing Products Table...');
        
        const token = window.adminAuth.getToken();
        
        this.productsTable = $('#productsTable').DataTable({
            ajax: {
                url: '/api/products',
                type: 'GET',
                headers: { 
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                dataSrc: function(json) {
                    console.log('📦 Products API Response:', json);
                    if (json.success && json.data) {
                        // Log image data for debugging
                        json.data.forEach((product, index) => {
                            if (index < 3) { // Log first 3 products for debugging
                                console.log(`Product ${product.id} - "${product.name}":`, {
                                    main_image: product.main_image,
                                    constructed_path: product.main_image ? `/uploads/products/${product.main_image.replace(/^\/+/, '')}` : 'No image',
                                    images: product.images,
                                    total_images: product.images ? product.images.length : 0
                                });
                            }
                        });
                        return json.data;
                    } else {
                        console.error('❌ Products API Error: Invalid response format', json);
                        return [];
                    }
                },
                error: function(xhr, error, thrown) {
                    console.error('❌ Products API Error:', {
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
                    data: 'category_name',
                    render: (data) => data || 'Uncategorized'
                },
                { 
                    data: 'price',
                    render: (data) => data ? `$${parseFloat(data).toFixed(2)}` : '$0.00'
                },
                { 
                    data: 'stock_quantity', 
                    defaultContent: '0',
                    render: (data) => data || '0'
                },
                { 
                    data: 'is_active',
                    render: (data) => {
                        const isActive = data == 1 || data === true;
                        return `<span class="status-badge ${isActive ? 'status-active' : 'status-inactive'}">${isActive ? 'Active' : 'Inactive'}</span>`;
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
            pageLength: 15,
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
                    targets: [0, 8], // Checkbox and actions columns (actions moved from 9 to 8)
                    width: '80px',
                    className: 'text-center align-middle'
                },
                {
                    targets: 2, // Name column (moved from 3 to 2)
                    width: '200px',
                    className: 'align-middle'
                },
                {
                    targets: [4, 5], // Price and Stock columns (moved from [5, 6] to [4, 5])
                    width: '100px',
                    className: 'text-center align-middle'
                }
            ],
            buttons: [
                {
                    extend: 'excel',
                    text: '<i class="fas fa-file-excel"></i> Excel',
                    className: 'btn btn-success btn-sm me-1',
                    exportOptions: {
                        columns: [1, 2, 3, 4, 5, 6, 7] // Exclude checkbox and actions
                    }
                },
                {
                    extend: 'pdf',
                    text: '<i class="fas fa-file-pdf"></i> PDF',
                    className: 'btn btn-danger btn-sm me-1',
                    exportOptions: {
                        columns: [1, 2, 3, 4, 5, 6, 7] // Exclude checkbox and actions
                    }
                },
                {
                    extend: 'print',
                    text: '<i class="fas fa-print"></i> Print',
                    className: 'btn btn-info btn-sm',
                    exportOptions: {
                        columns: [1, 2, 3, 4, 5, 6, 7] // Exclude checkbox and actions
                    }
                }
            ],
            order: [[1, 'desc']],
            pagingType: 'full_numbers',
            pageInfo: true,
            searching: true,
            searchHighlight: true,
            drawCallback: function() {
                // Initialize tooltips
                $('[data-bs-toggle="tooltip"]').tooltip();
                
                // Update pagination info
                const api = this.api();
                const info = api.page.info();
                const pageInfo = `Page ${info.page + 1} of ${info.pages} (${info.recordsTotal} total products)`;
                $('.dataTables_info').text(pageInfo);
            },
            language: {
                search: "_INPUT_",
                searchPlaceholder: "Search products...",
                lengthMenu: "Show _MENU_ products per page",
                info: "Showing _START_ to _END_ of _TOTAL_ products",
                infoEmpty: "No products available",
                infoFiltered: "(filtered from _MAX_ total products)",
                emptyTable: "No products found",
                loadingRecords: "Loading products...",
                processing: '<div class="d-flex justify-content-center"><div class="spinner-border text-primary" role="status"><span class="visually-hidden">Loading...</span></div></div>',
                paginate: {
                    first: '<i class="fas fa-angle-double-left"></i>',
                    previous: '<i class="fas fa-angle-left"></i>',
                    next: '<i class="fas fa-angle-right"></i>',
                    last: '<i class="fas fa-angle-double-right"></i>'
                },
                zeroRecords: "No matching products found"
            }
        };
    }

    getActionButtons(id) {
        return `
            <div class="btn-group" role="group" aria-label="Product Actions">
                <button class="action-btn btn-view" 
                        onclick="productsManager.viewProduct(${id})" 
                        title="View Product Details"
                        data-bs-toggle="tooltip"
                        data-bs-placement="top">
                    <i class="fas fa-eye"></i>
                </button>
                <button class="action-btn btn-edit" 
                        onclick="productsManager.editProduct(${id})" 
                        title="Edit Product"
                        data-bs-toggle="tooltip"
                        data-bs-placement="top">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="action-btn btn-delete" 
                        onclick="productsManager.deleteProduct(${id})" 
                        title="Delete Product"
                        data-bs-toggle="tooltip"
                        data-bs-placement="top">
                    <i class="fas fa-trash-alt"></i>
                </button>
            </div>
        `;
    }

    openAddProductModal() {
        console.log('📦 Opening add product modal');
        this.currentMode = 'add';
        this.currentId = null;
        
        $('#productModalTitle').html('<i class="fas fa-plus me-2"></i>Add Product');
        $('#saveProductButton').html('<i class="fas fa-save me-2"></i>Save Product');
        
        this.generateProductForm();
        this.resetForm();
        
        $('#productModal').modal('show');
    }

    async editProduct(id) {
        this.currentMode = 'edit';
        this.currentId = id;
        
        $('#productModalTitle').html('<i class="fas fa-edit me-2"></i>Edit Product');
        $('#saveProductButton').html('<i class="fas fa-save me-2"></i>Update Product');
        
        try {
            const response = await $.ajax({
                url: `/api/products/${id}`,
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${window.adminAuth.getToken()}`,
                    'Content-Type': 'application/json'
                }
            });
            
            if (response.success) {
                this.generateProductForm(response.data);
                $('#productModal').modal('show');
            } else {
                this.showError('Error', response.message || 'Failed to load product data');
            }
        } catch (error) {
            console.error('Edit product error:', error);
            this.showError('Error', 'Failed to load product data');
        }
    }

    async viewProduct(id) {
        try {
            const response = await $.ajax({
                url: `/api/products/${id}`,
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${window.adminAuth.getToken()}`,
                    'Content-Type': 'application/json'
                }
            });
            
            if (response.success) {
                this.showProductViewModal(response.data);
            } else {
                this.showError('Error', response.message || 'Failed to load product data');
            }
        } catch (error) {
            console.error('View product error:', error);
            this.showError('Error', 'Failed to load product data');
        }
    }

    async deleteProduct(id) {
        const result = await Swal.fire({
            title: 'Are you sure?',
            text: "You won't be able to revert this product!",
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
                    url: `/api/products/${id}`,
                    method: 'DELETE',
                    headers: {
                        'Authorization': `Bearer ${window.adminAuth.getToken()}`,
                        'Content-Type': 'application/json'
                    }
                });
                
                if (response.success) {
                    Swal.fire('Deleted!', 'Product has been deleted.', 'success');
                    this.refreshTable();
                } else {
                    this.showError('Error', response.message || 'Failed to delete product');
                }
            } catch (error) {
                console.error('Delete product error:', error);
                this.showError('Error', 'Failed to delete product');
            }
        }
    }

    generateProductForm(data = null) {
        const productName = data ? data.name : '';
        const productPrice = data ? data.price : '';
        const productDescription = data ? data.description : '';
        const productStockQuantity = data ? data.stock_quantity : '';
        const productIsActive = data ? (data.is_active ? 'checked' : '') : 'checked';
        const productCategoryId = data ? data.category_id : '';
        
        const categoryOptions = this.categories.map(category => 
            `<option value="${category.id}" ${productCategoryId == category.id ? 'selected' : ''}>${category.name}</option>`
        ).join('');
        
        const formHtml = `
            <div class="row">
                <div class="col-md-6">
                    <div class="mb-3">
                        <label class="form-label fw-bold text-primary">
                            <i class="fas fa-box me-2"></i>Product Name *
                        </label>
                        <input type="text" 
                               class="form-control" 
                               name="name" 
                               placeholder="Enter product name"
                               value="${productName}"
                               required>
                        <small class="form-text text-muted">Enter a descriptive product name</small>
                    </div>
                </div>
                <div class="col-md-6">
                    <div class="mb-3">
                        <label class="form-label fw-bold text-primary">
                            <i class="fas fa-tags me-2"></i>Category
                        </label>
                        <select class="form-select" name="category_id">
                            <option value="">Select Category</option>
                            ${categoryOptions}
                        </select>
                        <small class="form-text text-muted">Choose the appropriate category (optional)</small>
                    </div>
                </div>
                <div class="col-md-6">
                    <div class="mb-3">
                        <label class="form-label fw-bold text-primary">
                            <i class="fas fa-dollar-sign me-2"></i>Price *
                        </label>
                        <div class="input-group">
                            <span class="input-group-text">$</span>
                            <input type="number" 
                                   class="form-control" 
                                   name="price" 
                                   step="0.01"
                                   min="0"
                                   placeholder="0.00"
                                   value="${productPrice}"
                                   required>
                        </div>
                        <small class="form-text text-muted">Product selling price</small>
                    </div>
                </div>
                <div class="col-md-6">
                    <div class="mb-3">
                        <label class="form-label fw-bold text-primary">
                            <i class="fas fa-warehouse me-2"></i>Stock Quantity *
                        </label>
                        <input type="number" 
                               class="form-control" 
                               name="stock_quantity" 
                               min="0"
                               placeholder="0"
                               value="${productStockQuantity}"
                               required>
                        <small class="form-text text-muted">Available stock quantity</small>
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
                                  placeholder="Describe this product and its features">${productDescription}</textarea>
                        <small class="form-text text-muted">Provide a description to help customers understand this product</small>
                    </div>
                </div>
                <div class="col-12">
                    <div class="mb-3">
                        <label class="form-label fw-bold text-primary">
                            <i class="fas fa-images me-2"></i>Product Images
                        </label>
                        <input type="file" 
                               class="form-control" 
                               name="product_images" 
                               multiple
                               accept=".jpg,.jpeg,.png,.gif,.webp">
                        <small class="form-text text-muted">Upload multiple images to showcase this product (optional)</small>
                    </div>
                </div>
                <div class="col-12">
                    <div class="mb-3">
                        <div class="form-check form-switch">
                            <input class="form-check-input" 
                                   type="checkbox" 
                                   name="is_active" 
                                   id="productActiveSwitch"
                                   ${productIsActive}>
                            <label class="form-check-label fw-bold text-primary" for="productActiveSwitch">
                                <i class="fas fa-toggle-on me-2"></i>Product Deactive
                            </label>
                        </div>
                        <small class="form-text text-muted">Enable/disable product visibility</small>
                    </div>
                </div>
            </div>
        `;
        
        $('#productFormFields').html(formHtml);
        
        // Add event listener for image preview
        $('input[name="product_images"]').on('change', function(e) {
            const files = e.target.files;
            const previewArea = $('#imagePreviewArea');
            const previewContainer = $('#imagePreviewContainer');
            
            previewContainer.empty();
            
            if (files.length > 0) {
                previewArea.show();
                
                Array.from(files).forEach((file, index) => {
                    if (file.type.startsWith('image/')) {
                        const reader = new FileReader();
                        reader.onload = function(e) {
                            const preview = $(`
                                <div class="position-relative">
                                    <img src="${e.target.result}" 
                                         alt="Preview ${index + 1}" 
                                         class="img-thumbnail" 
                                         style="width: 100px; height: 100px; object-fit: cover;">
                                    <small class="d-block text-center text-muted mt-1">${file.name}</small>
                                </div>
                            `);
                            previewContainer.append(preview);
                        };
                        reader.readAsDataURL(file);
                    }
                });
            } else {
                previewArea.hide();
            }
        });
        
        // Show existing images if editing
        if (data && (data.main_image || (data.images && data.images.length > 0))) {
            const previewArea = $('#imagePreviewArea');
            const previewContainer = $('#imagePreviewContainer');
            
            previewArea.show();
            previewContainer.empty();
            
            // Show main image if exists
            if (data.main_image) {
                const mainImageSrc = data.main_image.startsWith('/') ? data.main_image : `/uploads/products/${data.main_image}`;
                const mainPreview = $(`
                    <div class="position-relative">
                        <img src="${mainImageSrc}" 
                             alt="Main Image" 
                             class="img-thumbnail" 
                             style="width: 100px; height: 100px; object-fit: cover;">
                        <small class="d-block text-center text-muted mt-1">Main Image</small>
                    </div>
                `);
                previewContainer.append(mainPreview);
            }
            
            // Show additional images if exist
            if (data.images && data.images.length > 0) {
                data.images.forEach((img, index) => {
                    const imageSrc = (img.image_path || img.filename).startsWith('/') ? 
                                   (img.image_path || img.filename) : 
                                   `/uploads/products/${img.image_path || img.filename}`;
                    const preview = $(`
                        <div class="position-relative">
                            <img src="${imageSrc}" 
                                 alt="Image ${index + 1}" 
                                 class="img-thumbnail" 
                                 style="width: 100px; height: 100px; object-fit: cover;">
                            <small class="d-block text-center text-muted mt-1">Image ${index + 1}</small>
                        </div>
                    `);
                    previewContainer.append(preview);
                });
            }
        }
    }

    async saveProduct() {
        // Validate form first
        if (!$('#productForm').valid()) {
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

        const formData = new FormData($('#productForm')[0]);
        
        try {
            console.log(`💾 Saving product (${this.currentMode} mode)...`);
            $('#saveProductButton').prop('disabled', true).html('<i class="fas fa-spinner fa-spin me-2"></i>Saving...');
            
            const url = this.currentMode === 'add' ? '/api/products' : `/api/products/${this.currentId}`;
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
                console.log(`✅ Product ${this.currentMode === 'add' ? 'created' : 'updated'} successfully`);
                Swal.fire({
                    icon: 'success',
                    title: 'Success!',
                    text: `Product ${this.currentMode === 'add' ? 'created' : 'updated'} successfully.`,
                    timer: 2000,
                    showConfirmButton: false
                });
                $('#productModal').modal('hide');
                this.refreshTable();
            } else {
                this.showError('Error', response.message || 'Operation failed');
            }
        } catch (error) {
            console.error('❌ Save product error:', error);
            let errorMessage = 'Failed to save product';
            if (error.responseJSON && error.responseJSON.message) {
                errorMessage = error.responseJSON.message;
            }
            this.showError('Error', errorMessage);
        } finally {
            $('#saveProductButton').prop('disabled', false).html('<i class="fas fa-save me-2"></i>Save Product');
        }
    }

    resetForm() {
        $('#productForm')[0].reset();
        $('#imagePreviewArea').hide();
        $('#imagePreviewContainer').empty();
        
        // Clear validation errors
        if ($('#productForm').data('validator')) {
            $('#productForm').validate().resetForm();
            $('#productForm').find('.error').removeClass('error');
            $('#productForm').find('.valid').removeClass('valid');
        }
    }

    refreshTable() {
        if (this.productsTable) {
            this.productsTable.ajax.reload();
        }
    }

    showProductViewModal(product) {
        let content = `
            <div class="row">
                <div class="col-md-6">
                    <h6><strong>Product Name:</strong></h6>
                    <p>${product.name}</p>
                    
                    <h6><strong>Category:</strong></h6>
                    <p>${product.category_name || 'Uncategorized'}</p>
                    
                    <h6><strong>Price:</strong></h6>
                    <p>$${parseFloat(product.price || 0).toFixed(2)}</p>
                    
                    <h6><strong>Stock Quantity:</strong></h6>
                    <p>${product.stock_quantity || 0} units</p>
                </div>
                <div class="col-md-6">
                    <h6><strong>Status:</strong></h6>
                    <p><span class="status-badge ${product.is_active ? 'status-active' : 'status-inactive'}">${product.is_active ? 'Active' : 'Inactive'}</span></p>
                    
                    <h6><strong>Created:</strong></h6>
                    <p>${new Date(product.created_at).toLocaleDateString()}</p>
                    
                    ${product.updated_at ? `
                    <h6><strong>Last Updated:</strong></h6>
                    <p>${new Date(product.updated_at).toLocaleDateString()}</p>
                    ` : ''}
                </div>
                ${product.description ? `
                <div class="col-12">
                    <h6><strong>Description:</strong></h6>
                    <p>${product.description}</p>
                </div>
                ` : ''}
                ${(product.main_image || (product.images && product.images.length > 0)) ? `
                <div class="col-12">
                    <h6><strong><i class="fas fa-images me-2"></i>Product Images:</strong></h6>
                    <div class="row g-2">
                        ${product.main_image ? `
                        <div class="col-md-3 col-sm-4 col-6">
                            <div class="position-relative">
                                <img src="${product.main_image.startsWith('/') ? product.main_image : '/uploads/products/' + product.main_image}" 
                                     alt="${product.name}" 
                                     class="img-fluid rounded shadow-sm" 
                                     style="aspect-ratio: 1; object-fit: cover; cursor: pointer;"
                                     onclick="window.open(this.src, '_blank')">
                                <span class="position-absolute top-0 start-0 bg-primary text-white px-2 py-1 rounded-end" style="font-size: 0.75rem;">
                                    <i class="fas fa-star me-1"></i>Main
                                </span>
                            </div>
                        </div>
                        ` : ''}
                        ${product.images && product.images.length > 0 ? product.images.map((img, index) => `
                        <div class="col-md-3 col-sm-4 col-6">
                            <div class="position-relative">
                                <img src="${(img.image_path || img.filename).startsWith('/') ? (img.image_path || img.filename) : '/uploads/products/' + (img.image_path || img.filename)}" 
                                     alt="${product.name} - Image ${index + 1}" 
                                     class="img-fluid rounded shadow-sm" 
                                     style="aspect-ratio: 1; object-fit: cover; cursor: pointer;"
                                     onclick="window.open(this.src, '_blank')">
                                <span class="position-absolute bottom-0 end-0 bg-dark text-white px-2 py-1 rounded-start" style="font-size: 0.75rem;">
                                    ${index + 1}
                                </span>
                            </div>
                        </div>
                        `).join('') : ''}
                    </div>
                    <small class="text-muted mt-2 d-block">
                        <i class="fas fa-info-circle me-1"></i>
                        Click on any image to view in full size
                    </small>
                </div>
                ` : ''}
            </div>
        `;

        Swal.fire({
            title: `<i class="fas fa-box me-2"></i>Product Details`,
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
function openAddProductModal() {
    if (window.productsManager) {
        window.productsManager.openAddProductModal();
    }
}

function refreshProductsTable() {
    if (window.productsManager) {
        window.productsManager.refreshTable();
    }
}

function exportProducts() {
    if (window.productsManager && window.productsManager.productsTable) {
        window.productsManager.productsTable.buttons.exportData();
    }
}

// Initialize Products Manager
$(document).ready(() => {
    if (typeof window.productsManager === 'undefined') {
        window.productsManager = new ProductsManager();
    }
});
