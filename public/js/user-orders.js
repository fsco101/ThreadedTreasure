// User Orders Manager - ThreadedTreasure
// Handles user order viewing and management

const API_BASE_URL = 'http://localhost:3000/api';

class UserOrdersManager {
    constructor() {
        this.ordersTable = null;
        this.currentFilter = 'all';
        this.orders = [];
        
        this.init();
    }

    async init() {
        console.log('🚀 Starting User Orders Manager initialization...');
        
        // Check user authentication
        if (!this.checkUserAuth()) {
            return;
        }
        
        console.log('✅ User authentication verified');

        // Initialize components
        this.setupEventListeners();
        
        try {
            await this.loadOrders();
            console.log('🚀 User Orders Manager initialized successfully');
        } catch (error) {
            console.error('❌ Failed to initialize user orders:', error);
            this.showError('Initialization Failed', 'Failed to load your orders. Please refresh the page.');
        }
    }

    checkUserAuth() {
        const userData = localStorage.getItem('userData');
        const token = localStorage.getItem('userToken');
        
        // Check if user has no token
        if (!token) {
            this.redirectToLogin();
            return false;
        }
        
        // Check if user data exists and is not a guest
        if (userData) {
            try {
                const user = JSON.parse(userData);
                if (user.isGuest) {
                    this.redirectToLogin();
                    return false;
                }
            } catch (error) {
                console.error('Error parsing user data:', error);
                this.redirectToLogin();
                return false;
            }
        }
        
        return true;
    }

    redirectToLogin() {
        localStorage.removeItem('userToken');
        localStorage.removeItem('userData');
        const returnUrl = encodeURIComponent(window.location.pathname);
        window.location.href = `login.html?return=${returnUrl}`;
    }

    setupEventListeners() {
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
                const statusColumn = data[4]; // Status column index
                const filterStatus = this.currentFilter.toUpperCase();
                if (!statusColumn.includes(filterStatus)) {
                    return false;
                }
            }
            
            return true;
        });
    }

    async loadOrders() {
        this.showLoading(true);
        
        try {
            const token = localStorage.getItem('userToken');
            const response = await $.ajax({
                url: `${API_BASE_URL}/orders/my-orders`,
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            
            if (response.success && response.data) {
                this.orders = response.data;
                console.log('✅ User orders loaded:', this.orders.length);
                
                if (this.orders.length === 0) {
                    this.showEmptyState();
                } else {
                    this.initializeTable();
                }
            } else {
                console.error('❌ Orders API Error: Invalid response format', response);
                this.showEmptyState();
            }
        } catch (error) {
            console.error('❌ Orders API Error:', error);
            
            if (error.status === 401) {
                this.redirectToLogin();
                return;
            }
            
            this.showError('Error Loading Orders', 'Failed to load your orders. Please try again.');
            this.showEmptyState();
        } finally {
            this.showLoading(false);
        }
    }

    initializeTable() {
        $('#ordersTableContainer').show();
        $('#emptyState').hide();
        
        if (this.ordersTable) {
            this.ordersTable.destroy();
        }
        
        this.ordersTable = $('#ordersTable').DataTable({
            data: this.orders,
            ...this.getTableConfig()
        });
    }

    getTableConfig() {
        return {
            responsive: true,
            processing: true,
            serverSide: false,
            pageLength: 10,
            lengthMenu: [
                [5, 10, 15, 25, 50, -1], 
                [5, 10, 15, 25, 50, "All"]
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
                    targets: [0], // Order number column
                    width: '120px',
                    className: 'text-center align-middle'
                },
                {
                    targets: [1], // Date column
                    width: '120px',
                    className: 'text-center align-middle'
                },
                {
                    targets: [2], // Items column
                    width: '100px',
                    className: 'text-center align-middle'
                },
                {
                    targets: [3], // Total column
                    width: '100px',
                    className: 'text-center align-middle'
                },
                {
                    targets: [4, 5], // Status columns
                    width: '120px',
                    className: 'text-center align-middle'
                },
                {
                    targets: [6], // Actions column
                    width: '150px',
                    className: 'text-center align-middle'
                }
            ],
            buttons: [
                {
                    extend: 'excel',
                    text: '<i class="fas fa-file-excel"></i> Excel',
                    className: 'btn btn-success btn-sm me-1',
                    exportOptions: {
                        columns: [0, 1, 2, 3, 4, 5] // Exclude actions column
                    },
                    title: 'My Orders - ThreadedTreasure'
                },
                {
                    extend: 'pdf',
                    text: '<i class="fas fa-file-pdf"></i> PDF',
                    className: 'btn btn-danger btn-sm me-1',
                    exportOptions: {
                        columns: [0, 1, 2, 3, 4, 5]
                    },
                    title: 'My Orders - ThreadedTreasure'
                },
                {
                    extend: 'print',
                    text: '<i class="fas fa-print"></i> Print',
                    className: 'btn btn-info btn-sm',
                    exportOptions: {
                        columns: [0, 1, 2, 3, 4, 5]
                    },
                    title: 'My Orders - ThreadedTreasure'
                }
            ],
            order: [[1, 'desc']], // Sort by date descending
            pagingType: 'full_numbers',
            pageInfo: true,
            searching: true,
            searchHighlight: true,
            columns: [
                { 
                    data: 'order_number',
                    title: 'Order #',
                    render: (data, type, row) => {
                        if (type === 'export') return `#${data || row.id}`;
                        return `<strong>#${data || row.id}</strong>`;
                    }
                },
                { 
                    data: 'created_at',
                    title: 'Date',
                    render: (data, type) => {
                        if (!data) return 'N/A';
                        const date = new Date(data);
                        if (type === 'export') return date.toLocaleDateString();
                        return `<span title="${date.toLocaleString()}">${date.toLocaleDateString()}</span>`;
                    }
                },
                { 
                    data: 'item_count',
                    title: 'Items',
                    render: (data, type) => {
                        const count = data || 0;
                        if (type === 'export') return `${count} ${count === 1 ? 'item' : 'items'}`;
                        return `<span class="badge bg-secondary">${count} ${count === 1 ? 'item' : 'items'}</span>`;
                    }
                },
                { 
                    data: 'total_amount',
                    title: 'Total',
                    render: (data, type) => {
                        const amount = data ? `$${parseFloat(data).toFixed(2)}` : '$0.00';
                        if (type === 'export') return amount;
                        return `<strong>${amount}</strong>`;
                    }
                },
                { 
                    data: 'status',
                    title: 'Status',
                    render: (data, type) => {
                        const status = (data || 'pending').toUpperCase();
                        if (type === 'export') return status;
                        const statusClass = `status-${(data || 'pending').toLowerCase()}`;
                        return `<span class="order-status ${statusClass}">${status}</span>`;
                    }
                },
                { 
                    data: 'payment_status',
                    title: 'Payment',
                    render: (data, type) => {
                        const status = (data || 'pending').toUpperCase();
                        if (type === 'export') return status;
                        const statusClass = `payment-${(data || 'pending').toLowerCase()}`;
                        return `<span class="payment-status ${statusClass}">${status}</span>`;
                    }
                },
                {
                    data: null,
                    title: 'Actions',
                    orderable: false,
                    searchable: false,
                    render: (data, type, row) => {
                        if (type === 'export') return '';
                        return this.getActionButtons(row);
                    }
                }
            ],
            drawCallback: function() {
                // Update pagination info
                const api = this.api();
                const info = api.page.info();
                const pageInfo = `Page ${info.page + 1} of ${info.pages} (${info.recordsTotal} total orders)`;
                $('.dataTables_info').text(pageInfo);
                
                // Add debugging
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
                loadingRecords: "Loading your orders...",
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

    getActionButtons(order) {
        const buttons = [];
        
        // View Order button - always available
        buttons.push(`
            <button class="action-btn btn-view" onclick="userOrders.viewOrder(${order.id})" title="View Details">
                <i class="fas fa-eye"></i>
            </button>
        `);
        
        // Track Order button - for shipped orders
        if (order.status === 'shipped' || order.status === 'delivered') {
            buttons.push(`
                <button class="action-btn btn-track" onclick="userOrders.trackOrder(${order.id})" title="Track Order">
                    <i class="fas fa-truck"></i>
                </button>
            `);
        }
        
        // Download Receipt button - for completed payments
        if (order.payment_status === 'completed') {
            buttons.push(`
                <button class="action-btn btn-download" onclick="userOrders.downloadReceipt(${order.id})" title="Download Receipt">
                    <i class="fas fa-download"></i>
                </button>
            `);
        }
        
        // Reorder button - for delivered orders
        if (order.status === 'delivered') {
            buttons.push(`
                <button class="action-btn btn-reorder" onclick="userOrders.reorderItems(${order.id})" title="Reorder">
                    <i class="fas fa-redo"></i>
                </button>
            `);
        }
        
        return `<div class="btn-group" role="group">${buttons.join('')}</div>`;
    }

    async viewOrder(orderId) {
        try {
            const token = localStorage.getItem('userToken');
            const response = await $.ajax({
                url: `${API_BASE_URL}/orders/${orderId}`,
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            
            if (response.success && response.data) {
                this.showOrderDetailsModal(response.data);
            } else {
                this.showError('Error', 'Failed to load order details');
            }
        } catch (error) {
            console.error('View order error:', error);
            this.showError('Error', 'Failed to load order details');
        }
    }

    showOrderDetailsModal(order) {
        let orderItems = '';
        if (order.order_items && order.order_items.length > 0) {
            orderItems = order.order_items.map(item => `
                <div class="order-item">
                    <div class="item-details">
                        <div class="item-name">${item.product_name || 'Unknown Product'}</div>
                        <div class="item-options">
                            Quantity: ${item.quantity || 1} × $${parseFloat(item.price || 0).toFixed(2)}
                        </div>
                    </div>
                    <div class="item-price">
                        $${(parseFloat(item.price || 0) * parseInt(item.quantity || 1)).toFixed(2)}
                    </div>
                </div>
            `).join('');
        }

        const content = `
            <div class="row">
                <div class="col-md-6">
                    <h6><strong><i class="fas fa-info-circle me-2"></i>Order Information</strong></h6>
                    <p><strong>Order Number:</strong> #${order.order_number || order.id}</p>
                    <p><strong>Order Date:</strong> ${new Date(order.created_at).toLocaleDateString()}</p>
                    <p><strong>Status:</strong> <span class="order-status status-${(order.status || 'pending').toLowerCase()}">${(order.status || 'pending').toUpperCase()}</span></p>
                    <p><strong>Payment Status:</strong> <span class="payment-status payment-${(order.payment_status || 'pending').toLowerCase()}">${(order.payment_status || 'pending').toUpperCase()}</span></p>
                </div>
                <div class="col-md-6">
                    <h6><strong><i class="fas fa-truck me-2"></i>Delivery Information</strong></h6>
                    ${order.shipping_address ? `
                        <p><strong>Shipping Address:</strong><br>
                        ${order.shipping_address}</p>
                    ` : '<p>No shipping address available</p>'}
                    <p><strong>Estimated Delivery:</strong> ${this.getEstimatedDelivery(order)}</p>
                </div>
                <div class="col-12 mt-3">
                    <h6><strong><i class="fas fa-box me-2"></i>Order Items</strong></h6>
                    <div class="order-items">
                        ${orderItems || '<p class="text-muted">No items found</p>'}
                    </div>
                </div>
                <div class="col-12">
                    <div class="order-summary-section">
                        <div class="summary-row">
                            <span>Subtotal:</span>
                            <span>$${parseFloat(order.subtotal || 0).toFixed(2)}</span>
                        </div>
                        <div class="summary-row">
                            <span>Shipping:</span>
                            <span>$${parseFloat(order.shipping_cost || 0).toFixed(2)}</span>
                        </div>
                        <div class="summary-row">
                            <span>Tax:</span>
                            <span>$${parseFloat(order.tax_amount || 0).toFixed(2)}</span>
                        </div>
                        <div class="summary-row">
                            <span><strong>Total:</strong></span>
                            <span><strong>$${parseFloat(order.total_amount || 0).toFixed(2)}</strong></span>
                        </div>
                    </div>
                </div>
            </div>
        `;

        $('#orderModalTitle').html(`<i class="fas fa-shopping-bag me-2"></i>Order #${order.order_number || order.id}`);
        $('#orderModalBody').html(content);
        
        // Show reorder button for delivered orders
        if (order.status === 'delivered') {
            $('#reorderBtn').show().off('click').on('click', () => this.reorderItems(order.id));
        } else {
            $('#reorderBtn').hide();
        }
        
        $('#orderDetailsModal').modal('show');
    }

    getEstimatedDelivery(order) {
        const orderDate = new Date(order.created_at);
        const status = order.status || 'pending';
        
        switch (status) {
            case 'delivered':
                return 'Delivered';
            case 'shipped':
                const deliveryDate = new Date(orderDate);
                deliveryDate.setDate(deliveryDate.getDate() + 2);
                return `Expected by ${deliveryDate.toLocaleDateString()}`;
            case 'processing':
                return '2-3 business days after processing';
            case 'confirmed':
                return '3-5 business days';
            default:
                return 'TBD - Order pending';
        }
    }

    async trackOrder(orderId) {
        // Show tracking modal with timeline
        const order = this.orders.find(o => o.id === orderId);
        if (!order) return;

        const trackingSteps = this.getTrackingSteps(order);
        
        const content = `
            <div class="tracking-timeline">
                <h6 class="mb-3">Order #${order.order_number || order.id}</h6>
                ${trackingSteps.map(step => `
                    <div class="timeline-item ${step.completed ? 'completed' : ''} ${step.current ? 'current' : ''}">
                        <div class="timeline-content">
                            <h6>${step.title}</h6>
                            <p class="text-muted">${step.description}</p>
                            ${step.date ? `<small class="text-muted">${step.date}</small>` : ''}
                        </div>
                    </div>
                `).join('')}
            </div>
            
            <style>
                .tracking-timeline {
                    position: relative;
                    padding-left: 30px;
                }
                
                .tracking-timeline::before {
                    content: '';
                    position: absolute;
                    left: 15px;
                    top: 0;
                    bottom: 0;
                    width: 2px;
                    background: #dee2e6;
                }
                
                .timeline-item {
                    position: relative;
                    padding-bottom: 2rem;
                }
                
                .timeline-item::before {
                    content: '';
                    position: absolute;
                    left: -23px;
                    top: 5px;
                    width: 16px;
                    height: 16px;
                    border-radius: 50%;
                    background: #dee2e6;
                    border: 3px solid white;
                    box-shadow: 0 0 0 2px #dee2e6;
                }
                
                .timeline-item.completed::before {
                    background: #28a745;
                    box-shadow: 0 0 0 2px #28a745;
                }
                
                .timeline-item.current::before {
                    background: #667eea;
                    box-shadow: 0 0 0 2px #667eea;
                    animation: pulse 2s infinite;
                }
                
                @keyframes pulse {
                    0% { box-shadow: 0 0 0 2px #667eea; }
                    50% { box-shadow: 0 0 0 8px rgba(102, 126, 234, 0.3); }
                    100% { box-shadow: 0 0 0 2px #667eea; }
                }
            </style>
        `;

        $('#trackingModalBody').html(content);
        $('#trackingModal').modal('show');
    }

    getTrackingSteps(order) {
        const status = order.status || 'pending';
        const orderDate = new Date(order.created_at);
        
        const steps = [
            {
                title: 'Order Placed',
                description: 'Your order has been received and is being processed',
                completed: true,
                date: orderDate.toLocaleDateString()
            },
            {
                title: 'Order Confirmed',
                description: 'Your order has been confirmed and payment processed',
                completed: ['confirmed', 'processing', 'shipped', 'delivered'].includes(status),
                current: status === 'confirmed'
            },
            {
                title: 'Processing',
                description: 'Your items are being prepared for shipment',
                completed: ['processing', 'shipped', 'delivered'].includes(status),
                current: status === 'processing'
            },
            {
                title: 'Shipped',
                description: 'Your order is on its way to you',
                completed: ['shipped', 'delivered'].includes(status),
                current: status === 'shipped'
            },
            {
                title: 'Delivered',
                description: 'Your order has been delivered',
                completed: status === 'delivered',
                current: status === 'delivered'
            }
        ];
        
        return steps;
    }

    async downloadReceipt(orderId) {
        try {
            const order = this.orders.find(o => o.id === orderId);
            if (!order) return;

            // Create a receipt window
            const receiptWindow = window.open('', '_blank');
            receiptWindow.document.write(this.generateReceiptHTML(order));
            receiptWindow.document.close();
            receiptWindow.print();
        } catch (error) {
            console.error('Download receipt error:', error);
            this.showError('Error', 'Failed to generate receipt');
        }
    }

    generateReceiptHTML(order) {
        const orderItems = order.order_items || [];
        const itemsHTML = orderItems.map(item => `
            <tr>
                <td>${item.product_name}</td>
                <td style="text-align: center;">${item.quantity}</td>
                <td style="text-align: right;">$${parseFloat(item.price || 0).toFixed(2)}</td>
                <td style="text-align: right;">$${(parseFloat(item.price || 0) * parseInt(item.quantity || 1)).toFixed(2)}</td>
            </tr>
        `).join('');

        return `
            <!DOCTYPE html>
            <html>
            <head>
                <title>Receipt - Order #${order.order_number || order.id}</title>
                <style>
                    body { font-family: Arial, sans-serif; margin: 20px; }
                    .receipt-header { text-align: center; margin-bottom: 30px; }
                    .receipt-details { margin-bottom: 20px; }
                    .receipt-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
                    .receipt-table th, .receipt-table td { padding: 10px; border-bottom: 1px solid #ddd; }
                    .receipt-table th { background-color: #f5f5f5; font-weight: bold; }
                    .total-section { margin-top: 20px; text-align: right; }
                    @media print { body { margin: 0; } }
                </style>
            </head>
            <body>
                <div class="receipt-header">
                    <h1>ThreadedTreasure</h1>
                    <h3>Order Receipt</h3>
                    <p>Order #${order.order_number || order.id}</p>
                    <p>Date: ${new Date(order.created_at).toLocaleDateString()}</p>
                </div>
                
                <div class="receipt-details">
                    <p><strong>Status:</strong> ${(order.status || 'pending').toUpperCase()}</p>
                    <p><strong>Payment Status:</strong> ${(order.payment_status || 'pending').toUpperCase()}</p>
                </div>
                
                <table class="receipt-table">
                    <thead>
                        <tr>
                            <th>Item</th>
                            <th style="text-align: center;">Qty</th>
                            <th style="text-align: right;">Price</th>
                            <th style="text-align: right;">Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${itemsHTML}
                    </tbody>
                </table>
                
                <div class="total-section">
                    <p>Subtotal: $${parseFloat(order.subtotal || 0).toFixed(2)}</p>
                    <p>Shipping: $${parseFloat(order.shipping_cost || 0).toFixed(2)}</p>
                    <p>Tax: $${parseFloat(order.tax_amount || 0).toFixed(2)}</p>
                    <p><strong>Total: $${parseFloat(order.total_amount || 0).toFixed(2)}</strong></p>
                </div>
                
                <div style="margin-top: 30px; text-align: center; color: #666;">
                    <p>Thank you for your purchase!</p>
                    <p>For questions, contact us at support@threadedtreasure.com</p>
                </div>
            </body>
            </html>
        `;
    }

    async reorderItems(orderId) {
        try {
            const order = this.orders.find(o => o.id === orderId);
            if (!order || !order.order_items) {
                this.showError('Error', 'Order items not found');
                return;
            }

            // Get current user for cart key
            const userData = localStorage.getItem('userData');
            const token = localStorage.getItem('userToken');
            let cartKey = 'cart_guest';
            
            if (token && userData) {
                try {
                    const user = JSON.parse(userData);
                    if (user && user.id && !user.isGuest) {
                        cartKey = `cart_user_${user.id}`;
                    }
                } catch (error) {
                    console.error('Error parsing user data:', error);
                }
            }

            // Add items to user-specific cart
            let cart = JSON.parse(localStorage.getItem(cartKey) || '[]');
            let addedItems = 0;

            order.order_items.forEach(item => {
                // Check if item already exists in cart
                const existingItem = cart.find(cartItem => 
                    cartItem.id === item.product_id && 
                    cartItem.size === item.size && 
                    cartItem.color === item.color
                );

                if (existingItem) {
                    existingItem.quantity += item.quantity;
                } else {
                    cart.push({
                        id: item.product_id,
                        name: item.product_name,
                        price: item.price,
                        quantity: item.quantity,
                        size: item.size || 'M',
                        color: item.color || 'Default',
                        image: item.product_image || '../uploads/placeholder.jpg'
                    });
                }
                addedItems++;
            });

            localStorage.setItem(cartKey, JSON.stringify(cart));
            console.log(`Reorder: Added ${addedItems} items to ${cartKey}`);
            
            Swal.fire({
                icon: 'success',
                title: 'Items Added to Cart!',
                text: `${addedItems} items have been added to your cart.`,
                showCancelButton: true,
                confirmButtonText: 'Go to Cart',
                cancelButtonText: 'Continue Shopping'
            }).then((result) => {
                if (result.isConfirmed) {
                    window.location.href = '../cart.html';
                }
            });

        } catch (error) {
            console.error('Reorder error:', error);
            this.showError('Error', 'Failed to add items to cart');
        }
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
                    <td colspan="7" class="text-center p-3">
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
        
        // Show loading state
        this.showLoading(true);
        
        // Reset filter to 'all'
        this.currentFilter = 'all';
        document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
        document.querySelector('[data-status="all"]').classList.add('active');
        
        // Reload orders
        this.loadOrders();
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
            this.ordersTable.column(0).search(orderNumber).draw();
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

    showLoading(show) {
        if (show) {
            $('#loadingSpinner').addClass('active');
            $('#ordersTableContainer').hide();
            $('#emptyState').hide();
        } else {
            $('#loadingSpinner').removeClass('active');
        }
    }

    showEmptyState() {
        $('#ordersTableContainer').hide();
        $('#emptyState').show();
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
}

// Global functions for onclick events
function refreshOrders() {
    if (window.userOrders) {
        window.userOrders.refreshOrders();
    }
}

function exportOrders(format = 'excel') {
    if (window.userOrders) {
        window.userOrders.exportOrders(format);
    }
}

function clearAllFilters() {
    if (window.userOrders) {
        window.userOrders.clearAllFilters();
    }
}

function searchByOrderNumber(orderNumber) {
    if (window.userOrders) {
        window.userOrders.searchByOrderNumber(orderNumber);
    }
}

// Initialize User Orders Manager
let userOrders;
$(document).ready(() => {
    userOrders = new UserOrdersManager();
    window.userOrders = userOrders;
    
    // Add keyboard shortcuts
    $(document).on('keydown', (e) => {
        // Ctrl/Cmd + R for refresh
        if ((e.ctrlKey || e.metaKey) && e.key === 'r') {
            e.preventDefault();
            refreshOrders();
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
    
    console.log('🎯 User Orders Manager with enhanced filtering initialized');
});
