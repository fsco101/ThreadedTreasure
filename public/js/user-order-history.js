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
