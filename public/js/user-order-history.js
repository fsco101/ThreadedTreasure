// User Order History Manager - ThreadedTreasure (for users only)
// Handles user order history, status, and cancellation

const API_BASE_URL = 'http://localhost:3000/api';

class UserOrderHistoryManager {
    constructor() {
        this.ordersTable = null;
        this.orders = [];
        this.init();
    }

    async init() {
        if (!this.checkUserAuth()) return;
        this.setupEventListeners();
        await this.loadOrders();
    }

    checkUserAuth() {
        const userData = localStorage.getItem('userData');
        const token = localStorage.getItem('userToken');
        if (!token) {
            window.location.href = '../users/login.html';
            return false;
        }
        if (userData) {
            try {
                const user = JSON.parse(userData);
                if (user.isGuest) {
                    window.location.href = '../users/login.html';
                    return false;
                }
            } catch (e) {
                window.location.href = '../users/login.html';
                return false;
            }
        }
        return true;
    }

    setupEventListeners() {
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.filterOrders(e.target.dataset.status);
            });
        });
        $('#refreshBtn').on('click', () => this.loadOrders());
    }

    async loadOrders() {
        this.showLoading(true);
        try {
            const token = localStorage.getItem('userToken');
            const userData = localStorage.getItem('userData');
            let userId = null;
            if (userData) {
                const user = JSON.parse(userData);
                userId = user.id;
            }
            const response = await $.ajax({
                url: `${API_BASE_URL}/order-details/user/${userId}`,
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            if (response.success && response.orders) {
                this.orders = response.orders;
                this.initializeTable();
            } else {
                this.showEmptyState();
            }
        } catch (error) {
            this.showEmptyState();
        } finally {
            this.showLoading(false);
        }
    }

    initializeTable() {
        $('#ordersTableContainer').show();
        $('#emptyState').hide();
        if (this.ordersTable) this.ordersTable.destroy();
        this.ordersTable = $('#ordersTable').DataTable({
            data: this.orders,
            responsive: true,
            pageLength: 10,
            columns: [
                { data: 'order_number', render: (data, type, row) => `<strong>#${data}</strong>` },
                { data: 'created_at', render: (data) => data ? new Date(data).toLocaleDateString() : 'N/A' },
                { data: 'items', render: (items) => `<span class='badge bg-secondary'>${items.length} items</span>` },
                { data: 'total_amount', render: (data) => `$${parseFloat(data).toFixed(2)}` },
                { data: 'status', render: (data) => `<span class='order-status status-${data.toLowerCase()}'>${data.toUpperCase()}</span>` },
                { data: 'payment_status', render: (data) => `<span class='payment-status payment-${data.toLowerCase()}'>${data.toUpperCase()}</span>` },
                {
                    data: null,
                    orderable: false,
                    render: (data, type, row) => this.getActionButtons(row)
                }
            ]
        });
    }

    getActionButtons(order) {
        let btns = `<button class='action-btn btn-view' onclick='userOrderHistory.viewOrder(${order.order_id})'><i class='fas fa-eye'></i></button>`;
        
        if (order.status === 'pending' || order.status === 'processing') {
            btns += `<button class='action-btn btn-cancel' onclick='userOrderHistory.cancelOrder(${order.order_id})'><i class='fas fa-times'></i></button>`;
        }
        
        if (order.status === 'delivered') {
            btns += `<button class='action-btn btn-review' onclick='userOrderHistory.reviewOrder(${order.order_id})' title='Review Products'><i class='fas fa-star'></i></button>`;
        }
        
        if (order.status === 'shipped' || order.status === 'delivered') {
            btns += `<button class='action-btn btn-track' onclick='userOrderHistory.trackOrder(${order.order_id})' title='Track Order'><i class='fas fa-map-marker-alt'></i></button>`;
        }
        
        return `<div class='btn-group'>${btns}</div>`;
    }

    viewOrder(orderId) {
        const order = this.orders.find(o => o.order_id === orderId);
        if (!order) return;
        let itemsHtml = '';
        if (order.items && order.items.length > 0) {
            itemsHtml = order.items.map(item => `
                <div class='order-item'>
                    <div class='item-details'>
                        <div class='item-name'>${item.product_name}</div>
                        <div class='item-options'>Qty: ${item.quantity} × $${parseFloat(item.price).toFixed(2)}</div>
                    </div>
                    <div class='item-price'>$${(item.price * item.quantity).toFixed(2)}</div>
                </div>
            `).join('');
        }
        const modalHtml = `
            <div class='row'>
                <div class='col-md-6'>
                    <h6><strong>Order #${order.order_number}</strong></h6>
                    <p>Status: <span class='order-status status-${order.status.toLowerCase()}'>${order.status}</span></p>
                    <p>Payment: <span class='payment-status payment-${order.payment_status.toLowerCase()}'>${order.payment_status}</span></p>
                    <p>Date: ${new Date(order.created_at).toLocaleDateString()}</p>
                </div>
                <div class='col-md-6'>
                    <h6><strong>Items</strong></h6>
                    ${itemsHtml || '<p>No items found</p>'}
                </div>
            </div>
        `;
        $('#orderModalTitle').html(`Order #${order.order_number}`);
        $('#orderModalBody').html(modalHtml);
        $('#orderDetailsModal').modal('show');
    }

    async cancelOrder(orderId) {
        const token = localStorage.getItem('userToken');
        try {
            const response = await $.ajax({
                url: `${API_BASE_URL}/orders/${orderId}/cancel`,
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            if (response.success) {
                Swal.fire('Order Cancelled', 'Your order has been cancelled.', 'success');
                this.loadOrders();
                $('#orderDetailsModal').modal('hide');
            } else {
                Swal.fire('Error', response.message || 'Could not cancel order.', 'error');
            }
        } catch (error) {
            Swal.fire('Error', 'Could not cancel order.', 'error');
        }
    }

    async reviewOrder(orderId) {
        try {
            const order = this.orders.find(o => o.order_id === orderId);
            if (!order || order.status !== 'delivered') {
                Swal.fire('Error', 'You can only review delivered orders.', 'error');
                return;
            }

            // Check if order has items
            if (!order.items || order.items.length === 0) {
                Swal.fire('Error', 'No items found in this order.', 'error');
                return;
            }

            // If order has only one product, redirect directly to product review
            if (order.items.length === 1) {
                const productId = order.items[0].product_id;
                window.location.href = `../shop.html?product=${productId}&review=true`;
                return;
            }

            // If order has multiple products, show selection modal
            this.showReviewSelectionModal(order);

        } catch (error) {
            console.error('Error initiating review:', error);
            Swal.fire('Error', 'Could not open review interface.', 'error');
        }
    }

    showReviewSelectionModal(order) {
        const modalHtml = `
            <div class="review-selection-container">
                <h5 class="mb-3"><i class="fas fa-star text-warning me-2"></i>Select Product to Review</h5>
                <p class="text-muted mb-3">Choose which product from order #${order.order_number} you'd like to review:</p>
                <div class="products-list">
                    ${order.items.map(item => `
                        <div class="product-review-item border rounded p-3 mb-2" style="cursor: pointer;" 
                             onclick="userOrderHistory.redirectToProductReview(${item.product_id})">
                            <div class="d-flex justify-content-between align-items-center">
                                <div class="product-info">
                                    <h6 class="mb-1">${item.product_name}</h6>
                                    <small class="text-muted">
                                        ${item.size ? `Size: ${item.size}` : ''} 
                                        ${item.color ? `Color: ${item.color}` : ''}
                                        ${item.quantity ? `Qty: ${item.quantity}` : ''}
                                    </small>
                                </div>
                                <div class="review-action">
                                    <i class="fas fa-chevron-right text-primary"></i>
                                </div>
                            </div>
                        </div>
                    `).join('')}
                </div>
                <div class="mt-3">
                    <small class="text-muted">
                        <i class="fas fa-info-circle me-1"></i>
                        Click on any product to write a review for it.
                    </small>
                </div>
            </div>
        `;

        Swal.fire({
            html: modalHtml,
            width: '600px',
            showConfirmButton: false,
            showCancelButton: true,
            cancelButtonText: 'Close',
            customClass: {
                popup: 'review-selection-popup'
            }
        });
    }

    redirectToProductReview(productId) {
        Swal.close();
        window.location.href = `../shop.html?product=${productId}&review=true`;
    }

    async trackOrder(orderId) {
        try {
            const order = this.orders.find(o => o.order_id === orderId);
            if (!order) {
                Swal.fire('Error', 'Order not found.', 'error');
                return;
            }

            // Show tracking information modal
            const trackingHtml = `
                <div class="tracking-container">
                    <h5 class="mb-3"><i class="fas fa-truck text-primary me-2"></i>Order Tracking</h5>
                    <div class="order-info mb-3">
                        <strong>Order #${order.order_number}</strong><br>
                        <small class="text-muted">Placed on ${new Date(order.created_at).toLocaleDateString()}</small>
                    </div>
                    
                    <div class="tracking-status">
                        <div class="status-timeline">
                            <div class="status-step ${this.isStatusReached('pending', order.status) ? 'completed' : ''}">
                                <div class="step-icon"><i class="fas fa-clock"></i></div>
                                <div class="step-content">
                                    <h6>Order Placed</h6>
                                    <small>Your order has been placed successfully</small>
                                </div>
                            </div>
                            
                            <div class="status-step ${this.isStatusReached('confirmed', order.status) ? 'completed' : ''}">
                                <div class="step-icon"><i class="fas fa-check"></i></div>
                                <div class="step-content">
                                    <h6>Order Confirmed</h6>
                                    <small>We've confirmed your order and payment</small>
                                </div>
                            </div>
                            
                            <div class="status-step ${this.isStatusReached('processing', order.status) ? 'completed' : ''}">
                                <div class="step-icon"><i class="fas fa-cog"></i></div>
                                <div class="step-content">
                                    <h6>Processing</h6>
                                    <small>Your order is being prepared</small>
                                </div>
                            </div>
                            
                            <div class="status-step ${this.isStatusReached('shipped', order.status) ? 'completed' : ''}">
                                <div class="step-icon"><i class="fas fa-truck"></i></div>
                                <div class="step-content">
                                    <h6>Shipped</h6>
                                    <small>Your order is on its way</small>
                                </div>
                            </div>
                            
                            <div class="status-step ${this.isStatusReached('delivered', order.status) ? 'completed' : ''}">
                                <div class="step-icon"><i class="fas fa-home"></i></div>
                                <div class="step-content">
                                    <h6>Delivered</h6>
                                    <small>Your order has been delivered</small>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="current-status mt-3 p-3 bg-light rounded">
                        <strong>Current Status: </strong>
                        <span class="order-status status-${order.status.toLowerCase()}">${order.status.toUpperCase()}</span>
                    </div>
                </div>
            `;

            Swal.fire({
                html: trackingHtml,
                width: '600px',
                showConfirmButton: false,
                showCancelButton: true,
                cancelButtonText: 'Close',
                customClass: {
                    popup: 'tracking-popup'
                }
            });

        } catch (error) {
            console.error('Error showing tracking:', error);
            Swal.fire('Error', 'Could not load tracking information.', 'error');
        }
    }

    isStatusReached(targetStatus, currentStatus) {
        const statusOrder = ['pending', 'confirmed', 'processing', 'shipped', 'delivered'];
        const targetIndex = statusOrder.indexOf(targetStatus);
        const currentIndex = statusOrder.indexOf(currentStatus);
        return currentIndex >= targetIndex;
    }

    filterOrders(status) {
        if (this.ordersTable) {
            if (status === 'all') {
                this.ordersTable.search('').draw();
            } else {
                this.ordersTable.column(4).search(status.toUpperCase()).draw();
            }
        }
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
}

// Global instance
let userOrderHistory;
$(document).ready(() => {
    userOrderHistory = new UserOrderHistoryManager();
    window.userOrderHistory = userOrderHistory;
});
