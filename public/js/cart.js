// Cart functionality for ThreadedTreasure
const API_BASE_URL = 'http://localhost:3000/api';

class CartManager {
    constructor() {
        this.cart = [];
        this.subtotal = 0;
        this.shipping = 0;
        this.tax = 0;
        this.total = 0;
        this.currentUser = this.getCurrentUser();
        
        this.init();
    }

    getCurrentUser() {
        try {
            const userData = localStorage.getItem('userData');
            const token = localStorage.getItem('userToken');
            if (!userData || !token) {
                return null;
            }
            const user = JSON.parse(userData);
            if (user && user.id && user.id !== 'guest' && !user.isGuest) {
                return user;
            }
            return null;
        } catch (error) {
            console.error('Error getting current user:', error);
            return null;
        }
    }

    getCartKey() {
        // Only allow cart for authenticated users
        if (this.currentUser && this.currentUser.id) {
            return `cart_user_${this.currentUser.id}`;
        }
        return null;
    }

    init() {
        this.loadCart();
        this.calculateTotals();
        this.renderCart();
    }

    loadCart() {
        try {
            const cartKey = this.getCartKey();
            if (!cartKey) {
                this.cart = [];
                return;
            }
            const cartData = localStorage.getItem(cartKey);
            if (cartData) {
                this.cart = JSON.parse(cartData);
            } else {
                this.cart = [];
            }
            console.log(`Loaded cart for user ${this.currentUser.id}:`, this.cart);
        } catch (error) {
            console.error('Error loading cart:', error);
            this.cart = [];
        }
    }

    saveCart() {
        try {
            const cartKey = this.getCartKey();
            if (!cartKey) return;
            localStorage.setItem(cartKey, JSON.stringify(this.cart));
            console.log(`Saved cart for user ${this.currentUser.id}:`, this.cart);
        } catch (error) {
            console.error('Error saving cart:', error);
        }
    }

    renderCart() {
        const container = document.getElementById('cart-items-container');
        if (!container) return;

        if (this.cart.length === 0) {
            container.innerHTML = `
                <div class="empty-cart">
                    <i class="fas fa-shopping-cart"></i>
                    <h3>Your cart is empty</h3>
                    <p>Add some items to your cart to get started!</p>
                    <button class="btn btn-primary" onclick="window.location.href='shop.html'">
                        <i class="fas fa-shopping-bag"></i> Start Shopping
                    </button>
                </div>
            `;
            
            // Disable checkout button
            const checkoutBtn = document.querySelector('.checkout-btn');
            if (checkoutBtn) {
                checkoutBtn.disabled = true;
                checkoutBtn.innerHTML = '<i class="fas fa-shopping-cart"></i> Cart is Empty';
            }
            return;
        }

        container.innerHTML = this.cart.map(item => `
            <div class="cart-item" data-id="${item.id}">
                <div class="item-image">
                    ${item.image ? 
                        `<img src="${item.image}" alt="${item.name}">` : 
                        '<i class="fas fa-image" style="color: #ddd; font-size: 2rem;"></i>'
                    }
                </div>
                <div class="item-details">
                    <div class="item-name">${item.name}</div>
                    <div class="item-info">
                        Size: ${item.size} | Color: ${item.color}
                    </div>
                    <div class="item-price">$${item.price.toFixed(2)} each</div>
                    <div class="quantity-controls">
                        <button class="quantity-btn" onclick="updateQuantity(${item.id}, ${item.quantity - 1})">
                            <i class="fas fa-minus"></i>
                        </button>
                        <input type="number" class="quantity-input" value="${item.quantity}" 
                               min="1" max="99" onchange="updateQuantity(${item.id}, this.value)">
                        <button class="quantity-btn" onclick="updateQuantity(${item.id}, ${item.quantity + 1})">
                            <i class="fas fa-plus"></i>
                        </button>
                    </div>
                    <button class="remove-btn" onclick="removeItem(${item.id})">
                        <i class="fas fa-trash"></i> Remove
                    </button>
                </div>
                <div class="item-total">
                    <strong>$${(item.price * item.quantity).toFixed(2)}</strong>
                </div>
            </div>
        `).join('');

        // Enable checkout button
        const checkoutBtn = document.querySelector('.checkout-btn');
        if (checkoutBtn) {
            checkoutBtn.disabled = false;
            checkoutBtn.innerHTML = '<i class="fas fa-credit-card"></i> Proceed to Checkout';
        }
    }

    calculateTotals() {
        this.subtotal = this.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        
        // Free shipping over $100
        this.shipping = this.subtotal > 100 ? 0 : 9.99;
        
        // 8% tax rate
        this.tax = this.subtotal * 0.08;
        
        // Calculate total
        this.total = this.subtotal + this.shipping + this.tax;
        
        this.updateTotalDisplay();
    }

    updateTotalDisplay() {
        document.getElementById('subtotal').textContent = `$${this.subtotal.toFixed(2)}`;
        document.getElementById('shipping').textContent = this.shipping === 0 ? 'FREE' : `$${this.shipping.toFixed(2)}`;
        document.getElementById('tax').textContent = `$${this.tax.toFixed(2)}`;
        document.getElementById('total').textContent = `$${this.total.toFixed(2)}`;
    }

    updateQuantity(itemId, newQuantity) {
        newQuantity = parseInt(newQuantity);
        
        if (newQuantity < 1) {
            this.removeItem(itemId);
            return;
        }

        if (newQuantity > 99) {
            this.showMessage('Maximum quantity is 99', 'warning');
            return;
        }

        const item = this.cart.find(item => item.id === itemId);
        if (item) {
            item.quantity = newQuantity;
            this.saveCart();
            this.calculateTotals();
            this.renderCart();
            this.showMessage('Quantity updated', 'success');
        }
    }

    removeItem(itemId) {
        const itemIndex = this.cart.findIndex(item => item.id === itemId);
        if (itemIndex > -1) {
            const item = this.cart[itemIndex];
            this.cart.splice(itemIndex, 1);
            this.saveCart();
            this.calculateTotals();
            this.renderCart();
            this.showMessage(`${item.name} removed from cart`, 'info');
        }
    }

    addItem(product, size, color, quantity = 1) {
        const existingItem = this.cart.find(item => 
            item.id === product.id && item.size === size && item.color === color
        );

        if (existingItem) {
            existingItem.quantity += quantity;
        } else {
            this.cart.push({
                id: product.id,
                name: product.name,
                price: product.price,
                quantity: quantity,
                size: size,
                color: color,
                image: product.image
            });
        }

        this.saveCart();
        this.calculateTotals();
        this.renderCart();
        this.showMessage(`${product.name} added to cart`, 'success');
    }

    clearCart() {
        this.cart = [];
        this.saveCart();
        this.calculateTotals();
        this.renderCart();
        this.showMessage('Cart cleared', 'info');
    }

    getCartCount() {
        return this.cart.reduce((count, item) => count + item.quantity, 0);
    }

    getCartTotal() {
        return this.total;
    }

    proceedToCheckout() {
        if (this.cart.length === 0) {
            this.showMessage('Your cart is empty', 'warning');
            return;
        }
        // Enforce authentication
        if (!this.currentUser || !this.currentUser.id) {
            const returnUrl = encodeURIComponent(window.location.pathname);
            this.showMessage('Please log in to proceed to checkout', 'warning');
            setTimeout(() => {
                window.location.href = `users/login.html?return=${returnUrl}`;
            }, 1500);
            return;
        }
        // Redirect to checkout
        window.location.href = 'checkout.html';
    }

    showMessage(message, type = 'info') {
        // Create or update message element
        let messageEl = document.getElementById('cart-message');
        if (!messageEl) {
            messageEl = document.createElement('div');
            messageEl.id = 'cart-message';
            messageEl.className = 'alert';
            messageEl.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                z-index: 1000;
                max-width: 300px;
                padding: 1rem;
                border-radius: 8px;
                box-shadow: 0 5px 15px rgba(0,0,0,0.2);
                animation: slideIn 0.3s ease-out;
            `;
            document.body.appendChild(messageEl);
        }

        // Set message type styling
        const typeStyles = {
            success: 'background: #d4edda; color: #155724; border: 1px solid #c3e6cb;',
            error: 'background: #f8d7da; color: #721c24; border: 1px solid #f5c6cb;',
            warning: 'background: #fff3cd; color: #856404; border: 1px solid #ffeaa7;',
            info: 'background: #d1ecf1; color: #0c5460; border: 1px solid #bee5eb;'
        };

        messageEl.style.cssText += typeStyles[type];
        messageEl.innerHTML = `
            <i class="fas fa-${type === 'success' ? 'check-circle' : 
                            type === 'error' ? 'exclamation-circle' : 
                            type === 'warning' ? 'exclamation-triangle' : 'info-circle'}"></i>
            ${message}
        `;

        // Auto-hide after 3 seconds
        setTimeout(() => {
            if (messageEl) {
                messageEl.style.animation = 'slideOut 0.3s ease-out';
                setTimeout(() => messageEl.remove(), 300);
            }
        }, 3000);
    }
}

// Global functions for HTML onclick handlers
function updateQuantity(itemId, quantity) {
    cart.updateQuantity(itemId, quantity);
}

function removeItem(itemId) {
    if (confirm('Are you sure you want to remove this item from your cart?')) {
        cart.removeItem(itemId);
    }
}

function proceedToCheckout() {
    cart.proceedToCheckout();
}

function clearCart() {
    if (confirm('Are you sure you want to clear your entire cart?')) {
        cart.clearCart();
    }
}

// Initialize cart when DOM is loaded
let cart;
document.addEventListener('DOMContentLoaded', function() {
    cart = new CartManager();
    
    // Update cart count in header if it exists
    updateCartCount();
    
    // Listen for cart updates from other pages (like checkout)
    window.addEventListener('cartUpdated', function(event) {
        console.log('Cart updated event received:', event.detail);
        if (cart) {
            cart.loadCart();
            cart.calculateTotals();
            cart.renderCart();
            updateCartCount();
        }
    });
});

function updateCartCount() {
    const cartCountEl = document.getElementById('cart-count');
    if (cartCountEl && cart) {
        cartCountEl.textContent = cart.getCartCount();
    }
}

// Add CSS animations
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    
    @keyframes slideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }
`;
document.head.appendChild(style);

// Export for other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CartManager;
}
