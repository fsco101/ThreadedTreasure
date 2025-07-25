// Orders Manager - ThreadedTreasure Admin
// Handles all order-related CRUD operations

class OrdersManager {
    constructor() {
        this.currentMode = 'add'; // 'add' or 'edit'
        this.currentId = null;
        this.ordersTable = null;
        this.customers = [];
        this.products = [];
        
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
        const token = window.adminAuth.getToken();
        this.ordersTable = $('#ordersTable').DataTable({
            ajax: {
                url: '/api/orders/admin/all',
                type: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                data: function(d) {
                    // Pass DataTables server-side params to backend
                    return d;
                },
                dataSrc: function(json) {
                    console.log('📋 Orders API Response:', json);
                    if (json.success && json.data) {
                        return json.data;
                    } else {
                        console.error('❌ Orders API Error: Invalid response format', json);
                        return [];
                    }
                },
                error: function(xhr, error, thrown) {
                    console.error('❌ Orders API Error:', {
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
                { // 0: Checkbox
                    data: null,
                    orderable: false,
                    searchable: false,
                    render: (data, type, row) => `<input type="checkbox" value="${row.id}">`
                },
                { // 1: Order ID
                    data: 'order_number',
                    render: (data, type, row) => `<strong>#${data || row.id}</strong>`
                },
                { // 2: Customer
                    data: null,
                    render: (data, type, row) => {
                        const customerName = row.customer_name || 'Unknown Customer';
                        const customerEmail = row.customer_email || '';
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
                    render: (data) => {
                        const count = data || 0;
                        return `<span class="badge bg-secondary">${count} items</span>`;
                    }
                },
                { // 4: Total
                    data: 'total_amount',
                    render: (data) => data ? `$${parseFloat(data).toFixed(2)}` : '$0.00'
                },
                { // 5: Status
                    data: 'status',
                    render: (data) => {
                        const statusClass = `status-${(data || 'pending').toLowerCase()}`;
                        return `<span class="order-status ${statusClass}">${(data || 'pending').toUpperCase()}</span>`;
                    }
                },
                { // 6: Payment
                    data: 'payment_status',
                    render: (data) => {
                        const statusClass = `payment-${(data || 'pending').toLowerCase()}`;
                        return `<span class="payment-status ${statusClass}">${(data || 'pending').toUpperCase()}</span>`;
                    }
                },
                { // 7: Date
                    data: 'created_at',
                    render: (data) => data ? new Date(data).toLocaleDateString() : 'N/A'
                },
                { // 8: Actions
                    data: null,
                    orderable: false,
                    searchable: false,
                    render: (data, type, row) => this.getActionButtons(row.id)
                }
            ],
            ...this.getTableConfig(),
            serverSide: true
        });
    }

    getTableConfig() {
        return {
            responsive: true,
            processing: true,
            pageLength: 25,
            lengthMenu: [[10, 25, 50, 100, -1], [10, 25, 50, 100, "All"]],
            dom: `
                <'row mb-3'
                    <'col-md-6'B>
                    <'col-md-6'f>
                >
                <'row'
                    <'col-12'tr>
                >
                <'row mt-3'
                    <'col-md-5'i>
                    <'col-md-7'p>
                >
            `,
            autoWidth: false,
            deferRender: true,
            stateSave: false,
            scrollX: true,
            columnDefs: [
                {
                    targets: [0, 8], // Checkbox and actions columns
                    width: '60px',
                    className: 'text-center align-middle'
                },
                {
                    targets: [1], // Order number column
                    width: '100px',
                    className: 'text-center align-middle'
                },
                {
                    targets: [3, 4, 5, 6], // Items, Total, Status, Payment columns
                    width: '100px',
                    className: 'text-center align-middle'
                }
            ],
            buttons: [
                {
                    extend: 'excel',
                    text: '<i class="fas fa-file-excel me-1"></i>Excel',
                    className: 'btn btn-success btn-sm me-1'
                },
                {
                    extend: 'pdf',
                    text: '<i class="fas fa-file-pdf me-1"></i>PDF',
                    className: 'btn btn-danger btn-sm me-1'
                },
                {
                    extend: 'print',
                    text: '<i class="fas fa-print me-1"></i>Print',
                    className: 'btn btn-info btn-sm me-1'
                }
            ],
            order: [[1, 'desc']],
            language: {
                search: "_INPUT_",
                searchPlaceholder: "Search orders...",
                lengthMenu: "Show _MENU_ entries",
                info: "Showing _START_ to _END_ of _TOTAL_ entries",
                infoEmpty: "Showing 0 to 0 of 0 entries",
                infoFiltered: "(filtered from _MAX_ total entries)",
                emptyTable: "No orders available",
                loadingRecords: "Loading orders...",
                processing: '<div class="d-flex align-items-center"><div class="spinner-border spinner-border-sm me-2" role="status"></div>Loading orders...</div>',
                paginate: {
                    first: '<i class="fas fa-angle-double-left"></i>',
                    previous: '<i class="fas fa-angle-left"></i>',
                    next: '<i class="fas fa-angle-right"></i>',
                    last: '<i class="fas fa-angle-double-right"></i>'
                }
            },
            drawCallback: function() {
                // Apply enhanced pagination styling after each draw
                $('.dataTables_paginate .paginate_button').addClass('page-link');
                $('.dataTables_paginate .paginate_button.current').addClass('active');
                $('.dataTables_length select').addClass('form-select form-select-sm');
                $('.dataTables_filter input').addClass('form-control form-control-sm');
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

        try {
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

            if (response.success) {
                Swal.fire({
                    icon: 'success',
                    title: 'Success!',
                    html: `
                        <div style="text-align: left;">
                            <p><strong>✅ Order status updated successfully</strong></p>
                            <p><strong>📧 Email notification sent to customer</strong></p>
                            <p><strong>📄 PDF receipt attached to email</strong></p>
                        </div>
                    `,
                    confirmButtonText: 'Great!'
                });
                $('#statusUpdateModal').modal('hide');
                this.refreshTable();
            } else {
                this.showError('Error', response.message || 'Failed to update order status');
            }
        } catch (error) {
            console.error('Update status error:', error);
            const errorMessage = error.responseJSON?.message || 'Failed to update order status';
            this.showError('Error', errorMessage);
        }
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
        window.ordersManager.refreshTable();
    }
}

function exportOrders() {
    if (window.ordersManager && window.ordersManager.ordersTable) {
        window.ordersManager.ordersTable.buttons.exportData();
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
});

