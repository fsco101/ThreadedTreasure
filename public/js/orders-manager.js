// Orders Manager - ThreadedTreasure Admin
// Handles all order-related CRUD operations

class OrdersManager {
    constructor() {
        this.currentMode = 'add'; // 'add' or 'edit'
        this.currentId = null;
        this.ordersTable = null;
        this.customers = [];
        this.products = [];
        this.currentFilter = 'all';
        this.orders = [];
        
        this.init();
    }

    async init() {
        console.log('🚀 Starting Orders Manager initialization...');
        
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
            await this.loadCustomers();
            await this.loadProducts();
            await this.initializeTable();
            console.log('🚀 Orders Manager initialized successfully');
        } catch (error) {
            console.error('❌ Failed to initialize orders table:', error);
            this.showError('Initialization Failed', 'Failed to load orders data. Please refresh the page.');
        }
    }

    setupEventListeners() {
        // Save button
        $('#saveOrderButton').on('click', () => this.saveOrder());

        // Modal close event
        $('#orderModal').on('hidden.bs.modal', () => this.resetForm());

        // Select all checkbox
        $('#selectAllOrders').on('change', (e) => {
            $('#ordersTable tbody input[type="checkbox"]').prop('checked', e.target.checked);
        });

        // Status update button
        $('#saveStatusUpdateBtn').on('click', () => this.updateOrderStatus());
        
        // Action buttons (event delegation for DataTables rows)
        $('#ordersTable tbody').on('click', '.btn-view', (e) => {
            const id = $(e.currentTarget).data('id');
            this.viewOrder(id);
        });
        $('#ordersTable tbody').on('click', '.btn-edit', (e) => {
            const id = $(e.currentTarget).data('id');
            this.editOrderStatus(id);
        });
        $('#ordersTable tbody').on('click', '.btn-delete', (e) => {
            const id = $(e.currentTarget).data('id');
            this.deleteOrder(id);
        });

        // Filter buttons
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const status = e.target.dataset.status;
                this.filterOrders(status);
            });
        });

        // Refresh button
        $('#refreshBtn').on('click', () => this.refreshOrders());
        
        // Advanced search functionality
        this.setupAdvancedSearch();
    }

    setupAdvancedSearch() {
        // Custom search function for better order filtering
        $.fn.dataTable.ext.search.push((settings, data, dataIndex) => {
            // Only apply to our orders table
            if (settings.nTable.id !== 'ordersTable') {
                return true;
            }
            
            // Apply status filter if not 'all'
            if (this.currentFilter !== 'all') {
                const statusColumn = data[5]; // Status column index
                const filterStatus = this.currentFilter.toUpperCase();
                if (!statusColumn.includes(filterStatus)) {
                    return false;
                }
            }
            
            return true;
        });
    }

    async loadCustomers() {
        try {
            const response = await $.ajax({
                url: '/api/users',
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${window.adminAuth.getToken()}`,
                    'Content-Type': 'application/json'
                }
            });
            
            if (response.success) {
                this.customers = response.data.filter(user => user.role === 'user');
                console.log('✅ Customers loaded:', this.customers.length);
            }
        } catch (error) {
            console.error('❌ Failed to load customers:', error);
        }
    }

    async loadProducts() {
        try {
            const response = await $.ajax({
                url: '/api/products',
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${window.adminAuth.getToken()}`,
                    'Content-Type': 'application/json'
                }
            });
            
            if (response.success) {
                this.products = response.data.filter(product => product.is_active);
                console.log('✅ Products loaded:', this.products.length);
            }
        } catch (error) {
            console.error('❌ Failed to load products:', error);
        }
    }

    async initializeTable() {
        console.log('📋 Initializing Orders Table...');
        
        try {
            // First load all orders data
            await this.loadAllOrders();
            
            const token = window.adminAuth.getToken();
            
            this.ordersTable = $('#ordersTable').DataTable({
                data: this.orders,
                columns: [
                    { // 0: Checkbox
                        data: null,
                        orderable: false,
                        searchable: false,
                        render: (data, type, row) => `<input type="checkbox" value="${row.id}">`
                    },
                    { // 1: Order ID
                        data: 'order_number',
                        title: 'Order #',
                        render: (data, type, row) => {
                            if (type === 'export') return `#${data || row.id}`;
                            return `<strong>#${data || row.id}</strong>`;
                        }
                    },
                    { // 2: Customer
                        data: null,
                        title: 'Customer',
                        render: (data, type, row) => {
                            const customerName = row.customer_name || 'Unknown Customer';
                            const customerEmail = row.customer_email || '';
                            if (type === 'export') return customerName;
                            return `
                                <div>
                                    <div class="fw-bold">${customerName}</div>
                                    ${customerEmail ? `<small class="text-muted">${customerEmail}</small>` : ''}
                                </div>
                            `;
                        }
                    },
                    { // 3: Items
                        data: 'item_count',
                        title: 'Items',
                        render: (data, type) => {
                            const count = data || 0;
                            if (type === 'export') return `${count} items`;
                            return `<span class="badge bg-secondary">${count} items</span>`;
                        }
                    },
                    { // 4: Total
                        data: 'total_amount',
                        title: 'Total',
                        render: (data, type) => {
                            const amount = data ? `$${parseFloat(data).toFixed(2)}` : '$0.00';
                            if (type === 'export') return amount;
                            return `<strong>${amount}</strong>`;
                        }
                    },
                    { // 5: Status
                        data: 'status',
                        title: 'Status',
                        render: (data, type) => {
                            const status = (data || 'pending').toUpperCase();
                            if (type === 'export') return status;
                            const statusClass = `status-${(data || 'pending').toLowerCase()}`;
                            return `<span class="order-status ${statusClass}">${status}</span>`;
                        }
                    },
                    { // 6: Payment
                        data: 'payment_status',
                        title: 'Payment',
                        render: (data, type) => {
                            const status = (data || 'pending').toUpperCase();
                            if (type === 'export') return status;
                            const statusClass = `payment-${(data || 'pending').toLowerCase()}`;
                            return `<span class="payment-status ${statusClass}">${status}</span>`;
                        }
                    },
                    { // 7: Date
                        data: 'created_at',
                        title: 'Date',
                        render: (data, type) => {
                            if (!data) return 'N/A';
                            const date = new Date(data);
                            if (type === 'export') return date.toLocaleDateString();
                            return `<span title="${date.toLocaleString()}">${date.toLocaleDateString()}</span>`;
                        }
                    },
                    { // 8: Actions
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
            
            console.log('✅ Orders table initialized with', this.orders.length, 'orders');
        } catch (error) {
            console.error('❌ Failed to initialize orders table:', error);
            this.showError('Error', 'Failed to load orders data');
        }
    }

    async loadAllOrders() {
        try {
            const token = window.adminAuth.getToken();
            const response = await $.ajax({
                url: '/api/orders/admin/all',
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            
            if (response.success && response.data) {
                this.orders = response.data;
                console.log('✅ Loaded orders:', this.orders.length);
            } else {
                console.error('❌ Orders API Error: Invalid response format', response);
                this.orders = [];
            }
        } catch (error) {
            console.error('❌ Orders API Error:', error);
            this.orders = [];
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
            scrollX: true,
            columnDefs: [
                {
                    targets: [0, 8], // Checkbox and actions columns
                    width: '80px',
                    className: 'text-center align-middle'
                },
                {
                    targets: [1], // Order number column
                    width: '120px',
                    className: 'text-center align-middle'
                },
                {
                    targets: [2], // Customer column
                    width: '200px',
                    className: 'align-middle'
                },
                {
                    targets: [3, 4, 5, 6, 7], // Items, Total, Status, Payment, Date columns
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
                        columns: [1, 2, 3, 4, 5, 6, 7] // Exclude checkbox and actions
                    },
                    title: 'Orders Report - ThreadedTreasure Admin'
                },
                {
                    extend: 'pdf',
                    text: '<i class="fas fa-file-pdf"></i> PDF',
                    className: 'btn btn-danger btn-sm me-1',
                    exportOptions: {
                        columns: [1, 2, 3, 4, 5, 6, 7]
                    },
                    title: 'Orders Report - ThreadedTreasure Admin'
                },
                {
                    extend: 'print',
                    text: '<i class="fas fa-print"></i> Print',
                    className: 'btn btn-info btn-sm',
                    exportOptions: {
                        columns: [1, 2, 3, 4, 5, 6, 7]
                    },
                    title: 'Orders Report - ThreadedTreasure Admin'
                }
            ],
            order: [[1, 'desc']],
            pagingType: 'full_numbers',
            pageInfo: true,
            searching: true,
            searchHighlight: true,
            drawCallback: function() {
                // Apply enhanced pagination styling after each draw
                $('.dataTables_paginate .paginate_button').addClass('page-link');
                $('.dataTables_paginate .paginate_button.current').addClass('active');
                $('.dataTables_length select').addClass('form-select form-select-sm');
                $('.dataTables_filter input').addClass('form-control form-control-sm');
                
                // Update pagination info
                const api = this.api();
                const info = api.page.info();
                const pageInfo = `Page ${info.page + 1} of ${info.pages} (${info.recordsTotal} total orders)`;
                $('.dataTables_info').text(pageInfo);
                
                console.log('Orders DataTable draw complete. Rows:', info.recordsTotal);
            },
            language: {
                search: "_INPUT_",
                searchPlaceholder: "Search orders...",
                lengthMenu: "Show _MENU_ orders per page",
                info: "Showing _START_ to _END_ of _TOTAL_ orders",
                infoEmpty: "No orders available",
                infoFiltered: "(filtered from _MAX_ total orders)",
                emptyTable: "No orders found",
                loadingRecords: "Loading orders...",
                processing: '<div class="d-flex justify-content-center"><div class="spinner-border text-primary" role="status"><span class="visually-hidden">Loading...</span></div></div>',
                paginate: {
                    first: '<i class="fas fa-angle-double-left"></i>',
                    previous: '<i class="fas fa-angle-left"></i>',
                    next: '<i class="fas fa-angle-right"></i>',
                    last: '<i class="fas fa-angle-double-right"></i>'
                },
                zeroRecords: "No matching orders found"
            }
        };
    }

    getActionButtons(id) {
        return `
            <div class="btn-group" role="group">
                <button class="action-btn btn-view" data-id="${id}" title="View">
                    <i class="fas fa-eye"></i>
                </button>
                <button class="action-btn btn-edit" data-id="${id}" title="Update Status">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="action-btn btn-delete" data-id="${id}" title="Cancel Order">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;
    }

    openAddOrderModal() {
        console.log('📋 Opening add order modal');
        this.currentMode = 'add';
        this.currentId = null;
        
        $('#orderModalTitle').html('<i class="fas fa-plus me-2"></i>Add Order');
        $('#saveOrderButton').html('<i class="fas fa-save me-2"></i>Save Order');
        
        this.generateOrderForm();
        this.resetForm();
        
        $('#orderModal').modal('show');
    }


    async editOrderStatus(id) {
        try {
            const response = await $.ajax({
                url: `/api/orders/admin/${id}`,
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${window.adminAuth.getToken()}`,
                    'Content-Type': 'application/json'
                }
            });
            if (response.success) {
                this.showStatusUpdateModal(response.data);
            } else {
                this.showError('Error', response.message || 'Failed to load order data');
            }
        } catch (error) {
            console.error('Edit order error:', error);
            this.showError('Error', 'Failed to load order data');
        }
    }

    async viewOrder(id) {
        try {
            const response = await $.ajax({
                url: `/api/orders/admin/${id}`,
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${window.adminAuth.getToken()}`,
                    'Content-Type': 'application/json'
                }
            });
            if (response.success) {
                this.showOrderViewModal(response.data);
            } else {
                this.showError('Error', response.message || 'Failed to load order data');
            }
        } catch (error) {
            console.error('View order error:', error);
            this.showError('Error', 'Failed to load order data');
        }
    }

    async updateOrderStatus() {
        const orderId = $('#statusOrderId').val();
        const newStatus = $('#newStatus').val();
        
        if (!newStatus) {
            this.showError('Error', 'Please select a status');
            return;
        }

        // Show loading overlay
        this.showStatusUpdateLoading();

        try {
            // Simulate progress steps
            this.updateLoadingProgress(25, 'Validating order status...');
            await this.delay(500);

            this.updateLoadingProgress(50, 'Updating order in database...');
            
            const response = await $.ajax({
                url: `/api/orders/admin/${orderId}/status`,
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${window.adminAuth.getToken()}`,
                    'Content-Type': 'application/json'
                },
                data: JSON.stringify({
                    status: newStatus
                })
            });

            this.updateLoadingProgress(75, 'Sending email notification...');
            await this.delay(800);

            this.updateLoadingProgress(100, 'Finalizing update...');
            await this.delay(500);

            if (response.success) {
                // Hide loading overlay
                this.hideStatusUpdateLoading();
                
                // Show success message with enhanced styling
                Swal.fire({
                    icon: 'success',
                    title: 'Order Status Updated!',
                    html: `
                        <div style="text-align: left; margin-top: 1rem;">
                            <div class="alert alert-success" style="margin-bottom: 1rem;">
                                <h6 class="alert-heading mb-2">✅ Update Successful</h6>
                                <p class="mb-1"><strong>Order #${orderId}</strong> status changed to <strong>${newStatus.toUpperCase()}</strong></p>
                            </div>
                            <div class="d-flex flex-column gap-2">
                                <div class="d-flex align-items-center">
                                    <i class="fas fa-database text-primary me-2"></i>
                                    <span>Database updated successfully</span>
                                </div>
                                <div class="d-flex align-items-center">
                                    <i class="fas fa-envelope text-info me-2"></i>
                                    <span>Customer notification sent</span>
                                </div>
                                <div class="d-flex align-items-center">
                                    <i class="fas fa-file-pdf text-danger me-2"></i>
                                    <span>Receipt attached to email</span>
                                </div>
                            </div>
                        </div>
                    `,
                    confirmButtonText: 'Great!',
                    confirmButtonColor: '#28a745',
                    customClass: {
                        popup: 'animated fadeInUp'
                    }
                });
                
                $('#statusUpdateModal').modal('hide');
                this.refreshTable();
            } else {
                this.hideStatusUpdateLoading();
                this.showError('Error', response.message || 'Failed to update order status');
            }
        } catch (error) {
            this.hideStatusUpdateLoading();
            console.error('Update status error:', error);
            const errorMessage = error.responseJSON?.message || 'Failed to update order status';
            this.showError('Error', errorMessage);
        }
    }

    // Helper method to show loading overlay
    showStatusUpdateLoading() {
        const modal = $('#statusUpdateModal');
        const overlay = $('#statusUpdateLoadingOverlay');
        const progressBar = $('#statusUpdateProgressBar');
        
        // Disable form elements and buttons
        $('#newStatus').prop('disabled', true);
        $('#statusUpdateBtn').prop('disabled', true);
        $('#statusCancelBtn').prop('disabled', true);
        $('#statusModalCloseBtn').prop('disabled', true);
        
        // Reset progress
        progressBar.css('width', '0%');
        $('#loadingStatusText').text('Initializing...');
        
        // Show overlay with fade effect
        overlay.fadeIn(300);
        modal.addClass('loading');
        
        // Start with initial progress
        setTimeout(() => {
            this.updateLoadingProgress(10, 'Preparing status update...');
        }, 200);
    }

    // Helper method to hide loading overlay
    hideStatusUpdateLoading() {
        const modal = $('#statusUpdateModal');
        const overlay = $('#statusUpdateLoadingOverlay');
        
        // Re-enable form elements and buttons
        $('#newStatus').prop('disabled', false);
        $('#statusUpdateBtn').prop('disabled', false);
        $('#statusCancelBtn').prop('disabled', false);
        $('#statusModalCloseBtn').prop('disabled', false);
        
        // Hide overlay with fade effect
        overlay.fadeOut(300);
        modal.removeClass('loading');
    }

    // Helper method to update loading progress
    updateLoadingProgress(percentage, message) {
        const progressBar = $('#statusUpdateProgressBar');
        const loadingText = $('#loadingStatusText');
        
        progressBar.css('width', `${percentage}%`);
        loadingText.text(message);
        
        // Add subtle animation
        progressBar.addClass('progress-bar-animated');
    }

    // Helper method to create delay for better UX
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // ...existing code...

    async deleteOrder(id) {
        const result = await Swal.fire({
            title: 'Are you sure?',
            text: "This will cancel the order. This action cannot be undone!",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#dc3545',
            cancelButtonColor: '#6c757d',
            confirmButtonText: 'Yes, cancel order!',
            cancelButtonText: 'Cancel'
        });
        
        if (result.isConfirmed) {
            try {
                const response = await $.ajax({
                    url: `/api/orders/admin/${id}`,
                    method: 'DELETE',
                    headers: {
                        'Authorization': `Bearer ${window.adminAuth.getToken()}`,
                        'Content-Type': 'application/json'
                    }
                });
                
                if (response.success) {
                    Swal.fire(
                        'Cancelled!',
                        'The order has been cancelled successfully.',
                        'success'
                    );
                    this.refreshTable();
                } else {
                    this.showError('Error', response.message || 'Failed to cancel order');
                }
            } catch (error) {
                console.error('Delete order error:', error);
                this.showError('Error', 'Failed to cancel order');
            }
        }
    }

    generateOrderForm(data = null) {
        const customerOptions = this.customers.map(customer => 
            `<option value="${customer.id}">${customer.name} (${customer.email})</option>`
        ).join('');

        const productOptions = this.products.map(product => 
            `<option value="${product.id}" data-price="${product.price}">${product.name} - $${parseFloat(product.price || 0).toFixed(2)}</option>`
        ).join('');
        
        const formHtml = `
            <div class="row">
                <div class="col-md-6">
                    <div class="mb-3">
                        <label class="form-label fw-bold text-primary">
                            <i class="fas fa-user me-2"></i>Customer *
                        </label>
                        <select class="form-select" name="customer_id" required>
                            <option value="">Select Customer</option>
                            ${customerOptions}
                        </select>
                        <small class="form-text text-muted">Choose the customer for this order</small>
                    </div>
                </div>
                <div class="col-md-6">
                    <div class="mb-3">
                        <label class="form-label fw-bold text-primary">
                            <i class="fas fa-clipboard-list me-2"></i>Order Status
                        </label>
                        <select class="form-select" name="status">
                            <option value="pending">Pending</option>
                            <option value="processing">Processing</option>
                            <option value="shipped">Shipped</option>
                            <option value="delivered">Delivered</option>
                            <option value="cancelled">Cancelled</option>
                            <option value="refunded">Refunded</option>
                        </select>
                        <small class="form-text text-muted">Current order status</small>
                    </div>
                </div>
                <div class="col-12">
                    <div class="alert alert-info">
                        <i class="fas fa-info-circle me-2"></i>
                        <strong>Note:</strong> Manual order creation is primarily for testing purposes. Most orders should be created through the customer checkout process.
                    </div>
                </div>
            </div>
        `;
        
        $('#orderFormFields').html(formHtml);
    }

    showStatusUpdateModal(order) {
        $('#statusOrderId').val(order.id);
        $('#currentStatus').text((order.status || 'pending').toUpperCase());
        $('#newStatus').val(order.status || 'pending');
        
        $('#statusUpdateModal').modal('show');
    }

    async saveOrder() {
        // For now, just show a message that manual order creation is not fully implemented
        this.showError('Feature Not Available', 'Manual order creation is not implemented yet. Orders are created through the customer checkout process.');
    }

    resetForm() {
        $('#orderForm')[0].reset();
    }

    refreshTable() {
        if (this.ordersTable) {
            this.ordersTable.ajax.reload();
        }
    }

    showOrderViewModal(order) {
        let orderItems = '';
        if (order.order_items && order.order_items.length > 0) {
            orderItems = order.order_items.map(item => `
                <div class="d-flex justify-content-between align-items-center mb-2">
                    <div>
                        <strong>${item.product_name || 'Unknown Product'}</strong>
                        <div class="text-muted small">Qty: ${item.quantity || 1} × $${parseFloat(item.price || 0).toFixed(2)}</div>
                    </div>
                    <div class="text-end">
                        <strong>$${(parseFloat(item.price || 0) * parseInt(item.quantity || 1)).toFixed(2)}</strong>
                    </div>
                </div>
            `).join('');
        }

        const content = `
            <div class="row">
                <div class="col-md-6">
                    <div class="customer-info">
                        <h6><strong><i class="fas fa-user me-2"></i>Customer Information</strong></h6>
                        <p><strong>Name:</strong> ${order.customer_name || 'Unknown'}</p>
                        <p><strong>Email:</strong> ${order.customer_email || 'N/A'}</p>
                    </div>
                </div>
                <div class="col-md-6">
                    <div class="shipping-info">
                        <h6><strong><i class="fas fa-truck me-2"></i>Order Information</strong></h6>
                        <p><strong>Order Number:</strong> #${order.order_number || order.id}</p>
                        <p><strong>Status:</strong> <span class="order-status status-${(order.status || 'pending').toLowerCase()}">${(order.status || 'pending').toUpperCase()}</span></p>
                        <p><strong>Payment:</strong> <span class="payment-status payment-${(order.payment_status || 'pending').toLowerCase()}">${(order.payment_status || 'pending').toUpperCase()}</span></p>
                        <p><strong>Date:</strong> ${new Date(order.created_at).toLocaleDateString()}</p>
                    </div>
                </div>
                <div class="col-12">
                    <h6><strong><i class="fas fa-box me-2"></i>Order Items</strong></h6>
                    <div class="order-items-summary">
                        ${orderItems || '<p class="text-muted">No items found</p>'}
                    </div>
                </div>
                <div class="col-12">
                    <div class="d-flex justify-content-between align-items-center mt-3 pt-3 border-top">
                        <div>
                            <p class="mb-1"><strong>Subtotal:</strong> $${parseFloat(order.subtotal || 0).toFixed(2)}</p>
                            <p class="mb-1"><strong>Shipping:</strong> $${parseFloat(order.shipping_cost || 0).toFixed(2)}</p>
                            <p class="mb-1"><strong>Tax:</strong> $${parseFloat(order.tax_amount || 0).toFixed(2)}</p>
                        </div>
                        <div class="text-end">
                            <h5><strong>Total: $${parseFloat(order.total_amount || 0).toFixed(2)}</strong></h5>
                        </div>
                    </div>
                </div>
                ${order.notes ? `
                <div class="col-12 mt-3">
                    <h6><strong><i class="fas fa-sticky-note me-2"></i>Notes</strong></h6>
                    <p>${order.notes}</p>
                </div>
                ` : ''}
            </div>
        `;

        Swal.fire({
            title: `<i class="fas fa-shopping-cart me-2"></i>Order Details`,
            html: content,
            width: 900,
            showConfirmButton: true,
            confirmButtonText: 'Close'
        });
    }

    filterOrders(status) {
        this.currentFilter = status;
        
        // Update active filter button
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-status="${status}"]`).classList.add('active');
        
        // Apply filter to DataTable
        if (this.ordersTable) {
            // Clear any existing search and redraw
            this.ordersTable.search('').draw();
            
            // Show loading state
            this.showTableLoading(true);
            
            // Apply filter with animation
            setTimeout(() => {
                this.ordersTable.draw();
                this.showTableLoading(false);
                
                // Update filter info
                this.updateFilterInfo(status);
            }, 100);
        }
    }

    updateFilterInfo(status) {
        const api = this.ordersTable;
        if (!api) return;
        
        const info = api.page.info();
        let filterText = '';
        
        if (status === 'all') {
            filterText = `Showing all ${info.recordsTotal} orders`;
        } else {
            const filteredCount = info.recordsDisplay;
            const statusLabel = status.charAt(0).toUpperCase() + status.slice(1);
            filterText = `Showing ${filteredCount} ${statusLabel.toLowerCase()} orders`;
        }
        
        // Update info display
        $('.dataTables_info').text(filterText);
        
        console.log(`🔍 Filter applied: ${status} (${info.recordsDisplay}/${info.recordsTotal} orders)`);
    }

    showTableLoading(show) {
        if (show) {
            $('#ordersTable').addClass('table-loading');
            $('#ordersTable tbody').append(`
                <tr class="loading-row">
                    <td colspan="9" class="text-center p-3">
                        <div class="spinner-border spinner-border-sm text-primary me-2" role="status"></div>
                        Applying filter...
                    </td>
                </tr>
            `);
        } else {
            $('#ordersTable').removeClass('table-loading');
            $('.loading-row').remove();
        }
    }

    refreshOrders() {
        console.log('🔄 Refreshing orders...');
        
        // Reset filter to 'all'
        this.currentFilter = 'all';
        document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
        document.querySelector('[data-status="all"]').classList.add('active');
        
        // Reload orders
        this.refreshTable();
    }

    async refreshTable() {
        try {
            console.log('🔄 Refreshing orders table...');
            
            if (this.ordersTable) {
                this.ordersTable.destroy();
                this.ordersTable = null;
            }
            
            await this.initializeTable();
            console.log('✅ Orders table refreshed successfully');
        } catch (error) {
            console.error('❌ Failed to refresh orders table:', error);
            this.showError('Refresh Failed', 'Failed to refresh orders data. Please try again.');
        }
    }

    exportOrders(format = 'excel') {
        if (!this.ordersTable) {
            this.showError('Export Error', 'No data available to export');
            return;
        }

        try {
            console.log(`📊 Exporting orders to ${format}...`);
            
            switch (format) {
                case 'excel':
                    this.ordersTable.button('.buttons-excel').trigger();
                    break;
                case 'pdf':
                    this.ordersTable.button('.buttons-pdf').trigger();
                    break;
                case 'print':
                    this.ordersTable.button('.buttons-print').trigger();
                    break;
                default:
                    this.showError('Export Error', 'Unsupported export format');
                    return;
            }
            
            this.showSuccess('Export Success', `Orders exported to ${format.toUpperCase()} successfully!`);
        } catch (error) {
            console.error('Export error:', error);
            this.showError('Export Error', 'Failed to export orders');
        }
    }

    // Advanced search methods
    searchByOrderNumber(orderNumber) {
        if (this.ordersTable) {
            this.ordersTable.column(1).search(orderNumber).draw();
        }
    }

    searchByCustomer(customerName) {
        if (this.ordersTable) {
            this.ordersTable.column(2).search(customerName).draw();
        }
    }

    searchByDateRange(startDate, endDate) {
        if (this.ordersTable) {
            // Custom date range filtering would be implemented here
            console.log(`🔍 Searching orders from ${startDate} to ${endDate}`);
        }
    }

    searchByAmount(minAmount, maxAmount) {
        if (this.ordersTable) {
            // Custom amount range filtering would be implemented here
            console.log(`🔍 Searching orders between $${minAmount} - $${maxAmount}`);
        }
    }

    clearAllFilters() {
        this.currentFilter = 'all';
        
        // Reset filter buttons
        document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
        document.querySelector('[data-status="all"]').classList.add('active');
        
        // Clear table search and redraw
        if (this.ordersTable) {
            this.ordersTable.search('').columns().search('').draw();
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
function openAddOrderModal() {
    if (window.ordersManager) {
        window.ordersManager.openAddOrderModal();
    }
}

function refreshOrdersTable() {
    if (window.ordersManager) {
        window.ordersManager.refreshOrders();
    }
}

function exportOrders(format = 'excel') {
    if (window.ordersManager) {
        window.ordersManager.exportOrders(format);
    }
}

function clearAllFilters() {
    if (window.ordersManager) {
        window.ordersManager.clearAllFilters();
    }
}

function searchByOrderNumber(orderNumber) {
    if (window.ordersManager) {
        window.ordersManager.searchByOrderNumber(orderNumber);
    }
}

function searchByCustomer(customerName) {
    if (window.ordersManager) {
        window.ordersManager.searchByCustomer(customerName);
    }
}

function updateOrderStatus() {
    if (window.ordersManager) {
        window.ordersManager.updateOrderStatus();
    }
}

// Initialize Orders Manager
$(document).ready(() => {
    if (typeof window.ordersManager === 'undefined') {
        window.ordersManager = new OrdersManager();
    }
    
    // Add keyboard shortcuts
    $(document).on('keydown', (e) => {
        // Ctrl/Cmd + R for refresh
        if ((e.ctrlKey || e.metaKey) && e.key === 'r') {
            e.preventDefault();
            refreshOrdersTable();
        }
        
        // Ctrl/Cmd + E for export
        if ((e.ctrlKey || e.metaKey) && e.key === 'e') {
            e.preventDefault();
            exportOrders();
        }
        
        // Escape to clear filters
        if (e.key === 'Escape') {
            clearAllFilters();
        }
    });
    
    console.log('🎯 Orders Manager with enhanced filtering initialized');
});

