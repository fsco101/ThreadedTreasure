// Checkout functionality for ThreadedTreasure
const API_BASE_URL = 'http://localhost:3000/api';

class CheckoutManager {
    constructor() {
        this.currentStep = 1;
        this.cart = [];
        this.selectedAddress = null;
        this.paymentMethod = 'card';
        this.orderData = {};
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
                return { id: 'guest', isGuest: true };
            }
            
            const user = JSON.parse(userData);
            
            // Set isGuest property based on user data
            if (user && user.id && user.id !== 'guest') {
                user.isGuest = false;
            } else {
                return { id: 'guest', isGuest: true };
            }
            
            return user;
        } catch (error) {
            console.error('Error getting current user:', error);
            return { id: 'guest', isGuest: true };
        }
    }

    getCartKey() {
        // Only allow cart for authenticated users
        if (this.currentUser && this.currentUser.id && !this.currentUser.isGuest) {
            return `cart_user_${this.currentUser.id}`;
        }
        // No cart for guests
        return null;
    }

    init() {
        this.checkGuestUser();
        this.loadCartItems();
        this.loadSavedAddresses();
        this.setupEventListeners();
        this.updateOrderSummary();
    }

    checkGuestUser() {
        const userData = localStorage.getItem('userData');
        const token = localStorage.getItem('userToken');
        // Enforce login: if no token or userData, redirect to login
        if (!token || !userData) {
            console.log('No user token or user data found, redirecting to login');
            this.redirectToLogin();
            return;
        }
        // Parse user and block guest checkout
        try {
            const user = JSON.parse(userData);
            if (user.isGuest) {
                console.log('Guest checkout is disabled. Redirecting to login.');
                this.redirectToLogin();
                return;
            }
        } catch (error) {
            console.error('Error parsing user data:', error);
            this.redirectToLogin();
            return;
        }
        // Authenticated user: allow checkout
        console.log('User authenticated:', userData);
    }

    redirectToLogin() {
        // Clean up any existing auth data
        localStorage.removeItem('userToken');
        localStorage.removeItem('userData');
        
        // Redirect to login with return URL
        const returnUrl = encodeURIComponent(window.location.pathname);
        window.location.href = `users/login.html?return=${returnUrl}`;
    }

    setupEventListeners() {
        // Payment method selection
        document.querySelectorAll('.payment-method').forEach(method => {
            method.addEventListener('click', () => {
                document.querySelectorAll('.payment-method').forEach(m => m.classList.remove('selected'));
                method.classList.add('selected');
                this.paymentMethod = method.dataset.method;
                this.togglePaymentDetails();
            });
        });

        // Address selection
        document.addEventListener('change', (e) => {
            if (e.target.name === 'selectedAddress') {
                this.selectedAddress = e.target.value;
                this.updateAddressSelection();
            }
        });

        // Card number formatting
        const cardNumberInput = document.getElementById('cardNumber');
        if (cardNumberInput) {
            cardNumberInput.addEventListener('input', this.formatCardNumber);
        }

        // Expiry date formatting
        const expiryInput = document.getElementById('expiryDate');
        if (expiryInput) {
            expiryInput.addEventListener('input', this.formatExpiryDate);
        }

        // CVV formatting
        const cvvInput = document.getElementById('cvv');
        if (cvvInput) {
            cvvInput.addEventListener('input', this.formatCVV);
        }

        // Form validation
        document.getElementById('shipping-form')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.validateShippingForm();
        });

        document.getElementById('payment-form')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.validatePaymentForm();
        });
    }

    async loadCartItems() {
        try {
            // Only allow cart for authenticated users
            const cartKey = this.getCartKey();
            if (!cartKey) {
                this.showError('You must be logged in to view your cart.');
                this.redirectToLogin();
                return;
            }
            const cartData = localStorage.getItem(cartKey);
            if (cartData) {
                this.cart = JSON.parse(cartData);
            } else {
                // Start with empty cart
                this.cart = [];
            }
            console.log(`Loaded checkout cart for user ${this.currentUser.id}:`, this.cart);
            this.renderCartItems();
            this.calculateTotals();
        } catch (error) {
            console.error('Error loading cart items:', error);
            this.cart = [];
            this.renderCartItems();
            this.calculateTotals();
        }
    }

    renderCartItems() {
        const cartContainer = document.getElementById('cart-items');
        if (!cartContainer) return;

        if (this.cart.length === 0) {
            cartContainer.innerHTML = `
                <div class="text-center">
                    <i class="fas fa-shopping-cart" style="font-size: 2rem; color: #ddd;"></i>
                    <p>Your cart is empty</p>
                </div>
            `;
            return;
        }

        cartContainer.innerHTML = this.cart.map(item => `
            <div class="order-item">
                <div class="item-details">
                    <div class="item-name">${item.name}</div>
                    <div class="item-info">
                        Size: ${item.size} | Color: ${item.color} | Qty: ${item.quantity}
                    </div>
                </div>
                <div class="item-price">$${(item.price * item.quantity).toFixed(2)}</div>
            </div>
        `).join('');
    }

    calculateTotals() {
        this.subtotal = this.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        this.shipping = this.subtotal > 100 ? 0 : 9.99; // Free shipping over $100
        this.tax = this.subtotal * 0.08; // 8% tax
        this.total = this.subtotal + this.shipping + this.tax;
        
        this.updateOrderSummary();
    }

    updateOrderSummary() {
        document.getElementById('subtotal').textContent = `$${this.subtotal.toFixed(2)}`;
        document.getElementById('shipping-cost').textContent = `$${this.shipping.toFixed(2)}`;
        document.getElementById('tax-amount').textContent = `$${this.tax.toFixed(2)}`;
        document.getElementById('total-amount').textContent = `$${this.total.toFixed(2)}`;
    }

    async loadSavedAddresses() {
        try {
            const token = localStorage.getItem('userToken');
            if (!token) {
                this.showNewAddressForm();
                this.autoFillShippingFormFromUser();
                return;
            }

            const response = await fetch(`${API_BASE_URL}/user/addresses`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                const addresses = await response.json();
                this.renderSavedAddresses(addresses);
                // Auto-fill shipping form with first address if available
                if (addresses.length > 0) {
                    this.autoFillShippingForm(addresses[0]);
                } else {
                    this.autoFillShippingFormFromUser();
                }
            } else {
                this.showNewAddressForm();
                this.autoFillShippingFormFromUser();
            }
        } catch (error) {
            console.error('Error loading addresses:', error);
            this.showNewAddressForm();
            this.autoFillShippingFormFromUser();
        }
    }
    autoFillShippingForm(address) {
        // Fill shipping form fields with address object
        if (!address) return;
        document.getElementById('firstName') && (document.getElementById('firstName').value = address.first_name || '');
        document.getElementById('lastName') && (document.getElementById('lastName').value = address.last_name || '');
        document.getElementById('address1') && (document.getElementById('address1').value = address.address_line_1 || '');
        document.getElementById('address2') && (document.getElementById('address2').value = address.address_line_2 || '');
        document.getElementById('city') && (document.getElementById('city').value = address.city || '');
        document.getElementById('state') && (document.getElementById('state').value = address.state || '');
        document.getElementById('zipCode') && (document.getElementById('zipCode').value = address.postal_code || '');
        document.getElementById('phone') && (document.getElementById('phone').value = address.phone || '');
    }

    autoFillShippingFormFromUser() {
        // Fill shipping form fields with currentUser info if available
        const user = this.currentUser;
        if (!user || user.isGuest) return;
        document.getElementById('firstName') && (document.getElementById('firstName').value = user.first_name || '');
        document.getElementById('lastName') && (document.getElementById('lastName').value = user.last_name || '');
        document.getElementById('address1') && (document.getElementById('address1').value = user.address_line_1 || user.address1 || '');
        document.getElementById('address2') && (document.getElementById('address2').value = user.address_line_2 || user.address2 || '');
        document.getElementById('city') && (document.getElementById('city').value = user.city || '');
        document.getElementById('state') && (document.getElementById('state').value = user.state || '');
        document.getElementById('zipCode') && (document.getElementById('zipCode').value = user.postal_code || user.zipCode || '');
        document.getElementById('phone') && (document.getElementById('phone').value = user.phone || '');
    }

    renderSavedAddresses(addresses) {
        const container = document.getElementById('saved-addresses');
        if (!container) return;

        if (addresses.length === 0) {
            container.innerHTML = '<p>No saved addresses found.</p>';
            return;
        }

        container.innerHTML = addresses.map((address, index) => `
            <div class="address-option ${index === 0 ? 'selected' : ''}" onclick="selectAddress(${address.id})">
                <input type="radio" name="selectedAddress" value="${address.id}" ${index === 0 ? 'checked' : ''}>
                <div>
                    <strong>${address.first_name} ${address.last_name}</strong>
                    ${address.company ? `<br>${address.company}` : ''}
                    <br>${address.address_line_1}
                    ${address.address_line_2 ? `<br>${address.address_line_2}` : ''}
                    <br>${address.city}, ${address.state} ${address.postal_code}
                    <br>${address.phone}
                </div>
            </div>
        `).join('');

        if (addresses.length > 0) {
            this.selectedAddress = addresses[0].id;
        }
    }

    showNewAddressForm() {
        document.getElementById('new-address-form').style.display = 'block';
        document.querySelector('.new-address-btn').textContent = 'Cancel';
        document.querySelector('.new-address-btn').onclick = this.hideNewAddressForm;
    }

    hideNewAddressForm() {
        document.getElementById('new-address-form').style.display = 'none';
        document.querySelector('.new-address-btn').textContent = '+ Add New Address';
        document.querySelector('.new-address-btn').onclick = this.showNewAddressForm;
    }

    togglePaymentDetails() {
        const cardDetails = document.getElementById('card-details');
        if (this.paymentMethod === 'card') {
            cardDetails.style.display = 'block';
        } else {
            cardDetails.style.display = 'none';
        }
    }

    formatCardNumber(e) {
        let value = e.target.value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
        const matches = value.match(/\d{4,16}/g);
        const match = matches && matches[0] || '';
        const parts = [];

        for (let i = 0, len = match.length; i < len; i += 4) {
            parts.push(match.substring(i, i + 4));
        }

        if (parts.length) {
            e.target.value = parts.join(' ');
        } else {
            e.target.value = value;
        }
    }

    formatExpiryDate(e) {
        let value = e.target.value.replace(/\D/g, '');
        if (value.length >= 2) {
            value = value.substring(0, 2) + '/' + value.substring(2, 4);
        }
        e.target.value = value;
    }

    formatCVV(e) {
        e.target.value = e.target.value.replace(/\D/g, '').substring(0, 4);
    }

    validateShippingForm() {
        const form = document.getElementById('shipping-form');
        const formData = new FormData(form);
        const errors = [];

        // Basic validation
        if (!formData.get('firstName')) errors.push('First name is required');
        if (!formData.get('lastName')) errors.push('Last name is required');
        if (!formData.get('address1')) errors.push('Address is required');
        if (!formData.get('city')) errors.push('City is required');
        if (!formData.get('state')) errors.push('State is required');
        if (!formData.get('zipCode')) errors.push('ZIP code is required');
        if (!formData.get('phone')) errors.push('Phone number is required');

        if (errors.length > 0) {
            this.showError(errors.join(', '));
            return false;
        }

        return true;
    }

    validatePaymentForm() {
        if (this.paymentMethod !== 'card') return true;

        const form = document.getElementById('payment-form');
        const formData = new FormData(form);
        const errors = [];

        if (!formData.get('cardNumber')) errors.push('Card number is required');
        if (!formData.get('expiryDate')) errors.push('Expiry date is required');
        if (!formData.get('cvv')) errors.push('CVV is required');
        if (!formData.get('cardName')) errors.push('Name on card is required');

        // Additional validation for card number
        const cardNumber = formData.get('cardNumber').replace(/\s/g, '');
        if (cardNumber.length < 13 || cardNumber.length > 19) {
            errors.push('Invalid card number');
        }

        if (errors.length > 0) {
            this.showError(errors.join(', '));
            return false;
        }

        return true;
    }

    nextStep() {
        if (this.currentStep === 1) {
            if (!this.selectedAddress && !this.validateShippingForm()) return;
        } else if (this.currentStep === 2) {
            if (!this.validatePaymentForm()) return;
        }

        this.currentStep++;
        this.updateStepDisplay();
        this.updateProgress();

        if (this.currentStep === 3) {
            this.populateReviewData();
        }
    }

    previousStep() {
        this.currentStep--;
        this.updateStepDisplay();
        this.updateProgress();
    }

    updateStepDisplay() {
        document.querySelectorAll('.checkout-step').forEach(step => {
            step.style.display = 'none';
        });

        const stepNames = ['', 'shipping', 'payment', 'review', 'complete'];
        document.getElementById(`step-${stepNames[this.currentStep]}`).style.display = 'block';
    }

    updateProgress() {
        document.querySelectorAll('.progress-step').forEach((step, index) => {
            step.classList.remove('active', 'completed');
            if (index + 1 < this.currentStep) {
                step.classList.add('completed');
            } else if (index + 1 === this.currentStep) {
                step.classList.add('active');
            }
        });
    }

    populateReviewData() {
        // Populate shipping info
        const shippingInfo = this.getShippingInfo();
        document.getElementById('review-shipping').innerHTML = `
            <div class="review-card">
                <strong>${shippingInfo.name}</strong><br>
                ${shippingInfo.address}<br>
                ${shippingInfo.phone}
            </div>
        `;

        // Populate payment info
        const paymentInfo = this.getPaymentInfo();
        document.getElementById('review-payment').innerHTML = `
            <div class="review-card">
                ${paymentInfo.method}<br>
                ${paymentInfo.details}
            </div>
        `;

        // Populate order items
        document.getElementById('review-items').innerHTML = this.cart.map(item => `
            <div class="order-item">
                <div class="item-details">
                    <div class="item-name">${item.name}</div>
                    <div class="item-info">Size: ${item.size} | Color: ${item.color} | Qty: ${item.quantity}</div>
                </div>
                <div class="item-price">$${(item.price * item.quantity).toFixed(2)}</div>
            </div>
        `).join('');
    }

    getShippingInfo() {
        // Get shipping information from form inputs
        const firstName = document.getElementById('firstName')?.value || 'John';
        const lastName = document.getElementById('lastName')?.value || 'Doe';
        const address1 = document.getElementById('address1')?.value || '123 Main St';
        const address2 = document.getElementById('address2')?.value || '';
        const city = document.getElementById('city')?.value || 'Anytown';
        const state = document.getElementById('state')?.value || 'CA';
        const zipCode = document.getElementById('zipCode')?.value || '12345';
        const phone = document.getElementById('phone')?.value || '(555) 123-4567';
        
        return {
            firstName: firstName,
            lastName: lastName,
            name: `${firstName} ${lastName}`,
            address1: address1,
            address_line_1: address1,
            address2: address2,
            address_line_2: address2,
            city: city,
            state: state,
            zipCode: zipCode,
            postal_code: zipCode,
            country: 'United States',
            phone: phone,
            // For display
            address: `${address1}${address2 ? ', ' + address2 : ''}, ${city}, ${state} ${zipCode}`
        };
    }

    getPaymentInfo() {
        const paymentMethod = this.paymentMethod || 'card';
        
        switch (paymentMethod) {
            case 'card':
                return {
                    method: 'card',
                    type: 'Credit Card',
                    details: '**** **** **** 1234'
                };
            case 'paypal':
                return {
                    method: 'paypal',
                    type: 'PayPal',
                    details: 'user@example.com'
                };
            case 'apple-pay':
                return {
                    method: 'apple-pay',
                    type: 'Apple Pay',
                    details: 'Touch ID or Face ID'
                };
            default:
                return {
                    method: 'card',
                    type: 'Credit Card',
                    details: 'Payment method'
                };
        }
    }

    async placeOrder() {
        const button = document.querySelector('.place-order-btn');
        const spinner = button.querySelector('.loading-spinner');
        // Block guest users from placing orders
        const cartKey = this.getCartKey();
        if (!cartKey) {
            this.showError('You must be logged in to place an order.');
            this.redirectToLogin();
            return;
        }
        // Validate cart is not empty
        if (!this.cart || this.cart.length === 0) {
            this.showError('Your cart is empty. Please add items before placing an order.');
            return;
        }
        // Validate required shipping information
        const shippingInfo = this.getShippingInfo();
        if (!shippingInfo.firstName || !shippingInfo.lastName || !shippingInfo.address1 || 
            !shippingInfo.city || !shippingInfo.state || !shippingInfo.zipCode) {
            this.showError('Please fill in all required shipping information fields.');
            return;
        }
        // Show loading state
        button.disabled = true;
        spinner.style.display = 'inline-block';
        try {
            const orderData = {
                items: this.cart,
                shippingAddress: this.getShippingInfo(),
                paymentMethod: this.paymentMethod,
                paymentDetails: this.getPaymentInfo(),
                subtotal: this.subtotal,
                shipping: this.shipping,
                tax: this.tax,
                total: this.total
            };
            console.log('Placing order with data:', orderData);
            const response = await fetch(`${API_BASE_URL}/orders`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('userToken')}`
                },
                body: JSON.stringify(orderData)
            });
            const result = await response.json();
            console.log('Order API response:', result);
            if (response.ok && result.success) {
                this.orderData = result.order;
                this.currentStep = 4;
                this.updateStepDisplay();
                this.updateProgress();
                this.showOrderConfirmation();
                // Clear cart using user-specific key
                localStorage.removeItem(cartKey);
                console.log('Order placed successfully:', result.order);
            } else {
                const errorMessage = result.message || `Failed to place order (Status: ${response.status})`;
                console.error('Order API error:', errorMessage, result);
                this.showError(errorMessage);
            }
        } catch (error) {
            console.error('Error placing order:', error);
            let errorMessage = 'Failed to place order. Please try again.';
            if (error.name === 'TypeError' && error.message.includes('fetch')) {
                errorMessage = 'Unable to connect to server. Please check your internet connection.';
            }
            this.showError(errorMessage);
        } finally {
            button.disabled = false;
            spinner.style.display = 'none';
        }
    }

    showOrderConfirmation() {
        const orderNumber = this.orderData.orderNumber || 'TT' + Date.now();
        const customerName = this.orderData.customer || 'Valued Customer';
        const emailSent = this.orderData.emailSent ? '✓' : '✗';
        
        // Get shipping info
        const shippingInfo = this.getShippingInfo();
        
        // Format items for display
        const itemsHTML = this.cart.map(item => `
            <div class="receipt-item">
                <div class="item-details">
                    <div class="item-name">${item.name}</div>
                    ${item.size || item.color ? `<div class="item-options">
                        ${item.size ? `Size: ${item.size}` : ''}
                        ${item.size && item.color ? ', ' : ''}
                        ${item.color ? `Color: ${item.color}` : ''}
                    </div>` : ''}
                </div>
                <div class="item-quantity">Qty: ${item.quantity}</div>
                <div class="item-price">$${(item.price * item.quantity).toFixed(2)}</div>
            </div>
        `).join('');

        document.getElementById('order-confirmation').innerHTML = `
            <div class="receipt-container">
                <div class="receipt-header">
                    <h4>Order Receipt</h4>
                    <div class="receipt-details">
                        <div><strong>Order #:</strong> ${orderNumber}</div>
                        <div><strong>Date:</strong> ${new Date().toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                        })}</div>
                        <div><strong>Customer:</strong> ${customerName}</div>
                        <div><strong>Email Receipt:</strong> <span class="email-status ${emailSent === '✓' ? 'sent' : 'failed'}">${emailSent} ${emailSent === '✓' ? 'Sent' : 'Failed'}</span></div>
                    </div>
                </div>

                <div class="receipt-section">
                    <h5>Items Ordered</h5>
                    <div class="receipt-items">
                        ${itemsHTML}
                    </div>
                </div>

                <div class="receipt-section">
                    <h5>Shipping Address</h5>
                    <div class="address-info">
                        <div><strong>${shippingInfo.firstName} ${shippingInfo.lastName}</strong></div>
                        <div>${shippingInfo.address1}</div>
                        ${shippingInfo.address2 ? `<div>${shippingInfo.address2}</div>` : ''}
                        <div>${shippingInfo.city}, ${shippingInfo.state} ${shippingInfo.zipCode}</div>
                        ${shippingInfo.phone ? `<div>Phone: ${shippingInfo.phone}</div>` : ''}
                    </div>
                </div>

                <div class="receipt-section">
                    <h5>Payment Method</h5>
                    <div class="payment-info">
                        <div><strong>${this.paymentMethod.method || 'Credit Card'}</strong></div>
                        ${this.paymentMethod.last4 ? `<div>**** **** **** ${this.paymentMethod.last4}</div>` : ''}
                    </div>
                </div>

                <div class="receipt-section">
                    <h5>Order Summary</h5>
                    <div class="receipt-totals">
                        <div class="total-row">
                            <span>Subtotal:</span>
                            <span>$${this.subtotal.toFixed(2)}</span>
                        </div>
                        <div class="total-row">
                            <span>Shipping:</span>
                            <span>$${this.shipping.toFixed(2)}</span>
                        </div>
                        ${this.tax > 0 ? `
                            <div class="total-row">
                                <span>Tax:</span>
                                <span>$${this.tax.toFixed(2)}</span>
                            </div>
                        ` : ''}
                        ${this.discount > 0 ? `
                            <div class="total-row">
                                <span>Discount:</span>
                                <span>-$${this.discount.toFixed(2)}</span>
                            </div>
                        ` : ''}
                        <div class="total-row final-total">
                            <span><strong>Total:</strong></span>
                            <span><strong>$${this.total.toFixed(2)}</strong></span>
                        </div>
                    </div>
                </div>

                <div class="receipt-section">
                    <h5>Delivery Information</h5>
                    <div class="delivery-info">
                        <div><strong>Estimated Delivery:</strong> 3-5 business days</div>
                        <div>We'll send tracking information to your email once your order ships.</div>
                    </div>
                </div>

                <div class="receipt-actions">
                    <button type="button" class="btn btn-outline-primary" onclick="window.print()">
                        <i class="fas fa-print"></i> Print Receipt
                    </button>
                    <button type="button" class="btn btn-outline-secondary" onclick="checkout.downloadReceipt('${orderNumber}')">
                        <i class="fas fa-download"></i> Download Receipt
                    </button>
                </div>
            </div>

            <style>
                .receipt-container {
                    background: white;
                    border: 1px solid #ddd;
                    border-radius: 8px;
                    padding: 2rem;
                    margin: 1rem 0;
                    box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                }

                .receipt-header {
                    border-bottom: 2px solid #667eea;
                    padding-bottom: 1rem;
                    margin-bottom: 1.5rem;
                    text-align: center;
                }

                .receipt-header h4 {
                    color: #667eea;
                    margin-bottom: 1rem;
                }

                .receipt-details {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 0.5rem;
                    text-align: left;
                    max-width: 400px;
                    margin: 0 auto;
                }

                .email-status.sent {
                    color: #28a745;
                }

                .email-status.failed {
                    color: #dc3545;
                }

                .receipt-section {
                    margin-bottom: 1.5rem;
                    padding-bottom: 1rem;
                    border-bottom: 1px solid #eee;
                }

                .receipt-section:last-of-type {
                    border-bottom: none;
                }

                .receipt-section h5 {
                    color: #333;
                    margin-bottom: 1rem;
                    font-weight: 600;
                }

                .receipt-item {
                    display: grid;
                    grid-template-columns: 1fr auto auto;
                    gap: 1rem;
                    align-items: center;
                    padding: 0.75rem 0;
                    border-bottom: 1px solid #f0f0f0;
                }

                .receipt-item:last-child {
                    border-bottom: none;
                }

                .item-name {
                    font-weight: 500;
                    color: #333;
                }

                .item-options {
                    font-size: 0.9rem;
                    color: #666;
                    margin-top: 0.25rem;
                }

                .item-quantity {
                    color: #666;
                    font-size: 0.9rem;
                }

                .item-price {
                    font-weight: 600;
                    color: #667eea;
                }

                .address-info, .payment-info, .delivery-info {
                    background: #f8f9fa;
                    padding: 1rem;
                    border-radius: 6px;
                    border-left: 4px solid #667eea;
                }

                .receipt-totals {
                    background: #f8f9fa;
                    padding: 1rem;
                    border-radius: 6px;
                }

                .total-row {
                    display: flex;
                    justify-content: space-between;
                    margin-bottom: 0.5rem;
                }

                .total-row:last-child {
                    margin-bottom: 0;
                }

                .final-total {
                    border-top: 2px solid #ddd;
                    padding-top: 0.5rem;
                    margin-top: 0.5rem;
                    font-size: 1.1rem;
                    color: #333;
                }

                .receipt-actions {
                    display: flex;
                    gap: 1rem;
                    justify-content: center;
                    margin-top: 2rem;
                    padding-top: 1rem;
                    border-top: 2px solid #f0f0f0;
                }

                .receipt-actions .btn {
                    padding: 0.75rem 1.5rem;
                    border-radius: 6px;
                    font-weight: 500;
                    transition: all 0.3s ease;
                }

                @media print {
                    .receipt-actions {
                        display: none;
                    }
                }

                @media (max-width: 768px) {
                    .receipt-details {
                        grid-template-columns: 1fr;
                        text-align: center;
                    }
                    
                    .receipt-item {
                        grid-template-columns: 1fr;
                        text-align: center;
                        gap: 0.5rem;
                    }

                    .receipt-actions {
                        flex-direction: column;
                    }
                }
            </style>
        `;
    }

    showError(message) {
        // Create or update error message
        let errorDiv = document.getElementById('error-message');
        if (!errorDiv) {
            errorDiv = document.createElement('div');
            errorDiv.id = 'error-message';
            errorDiv.className = 'alert alert-danger';
            document.querySelector('.checkout-main').prepend(errorDiv);
        }
        
        errorDiv.innerHTML = `<i class="fas fa-exclamation-triangle"></i> ${message}`;
        errorDiv.scrollIntoView({ behavior: 'smooth' });
        
        // Auto-hide after 5 seconds
        setTimeout(() => {
            if (errorDiv) errorDiv.remove();
        }, 5000);
    }

    showSuccess(message) {
        // No promo functionality - remove this method or repurpose for other success messages
        console.log('Success:', message);
    }

    downloadReceipt(orderNumber) {
        // Create a printable version of the receipt
        const receiptContent = document.querySelector('.receipt-container').cloneNode(true);
        
        // Remove action buttons from the cloned content
        const actions = receiptContent.querySelector('.receipt-actions');
        if (actions) actions.remove();

        // Create a new window with the receipt content
        const receiptWindow = window.open('', '_blank', 'width=800,height=600');
        receiptWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Receipt - Order ${orderNumber}</title>
                <style>
                    body {
                        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                        line-height: 1.6;
                        color: #333;
                        margin: 0;
                        padding: 20px;
                        background: white;
                    }
                    .receipt-container {
                        max-width: 600px;
                        margin: 0 auto;
                        background: white;
                        border: 1px solid #ddd;
                        border-radius: 8px;
                        padding: 2rem;
                        box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                    }
                    .receipt-header {
                        border-bottom: 2px solid #667eea;
                        padding-bottom: 1rem;
                        margin-bottom: 1.5rem;
                        text-align: center;
                    }
                    .receipt-header h4 {
                        color: #667eea;
                        margin-bottom: 1rem;
                    }
                    .receipt-details {
                        display: grid;
                        grid-template-columns: 1fr 1fr;
                        gap: 0.5rem;
                        text-align: left;
                        max-width: 400px;
                        margin: 0 auto;
                    }
                    .email-status.sent { color: #28a745; }
                    .email-status.failed { color: #dc3545; }
                    .receipt-section {
                        margin-bottom: 1.5rem;
                        padding-bottom: 1rem;
                        border-bottom: 1px solid #eee;
                    }
                    .receipt-section:last-of-type { border-bottom: none; }
                    .receipt-section h5 {
                        color: #333;
                        margin-bottom: 1rem;
                        font-weight: 600;
                    }
                    .receipt-item {
                        display: grid;
                        grid-template-columns: 1fr auto auto;
                        gap: 1rem;
                        align-items: center;
                        padding: 0.75rem 0;
                        border-bottom: 1px solid #f0f0f0;
                    }
                    .receipt-item:last-child { border-bottom: none; }
                    .item-name {
                        font-weight: 500;
                        color: #333;
                    }
                    .item-options {
                        font-size: 0.9rem;
                        color: #666;
                        margin-top: 0.25rem;
                    }
                    .item-quantity {
                        color: #666;
                        font-size: 0.9rem;
                    }
                    .item-price {
                        font-weight: 600;
                        color: #667eea;
                    }
                    .address-info, .payment-info, .delivery-info {
                        background: #f8f9fa;
                        padding: 1rem;
                        border-radius: 6px;
                        border-left: 4px solid #667eea;
                    }
                    .receipt-totals {
                        background: #f8f9fa;
                        padding: 1rem;
                        border-radius: 6px;
                    }
                    .total-row {
                        display: flex;
                        justify-content: space-between;
                        margin-bottom: 0.5rem;
                    }
                    .total-row:last-child { margin-bottom: 0; }
                    .final-total {
                        border-top: 2px solid #ddd;
                        padding-top: 0.5rem;
                        margin-top: 0.5rem;
                        font-size: 1.1rem;
                        color: #333;
                    }
                    @media print {
                        body { margin: 0; padding: 10px; }
                        .receipt-container { 
                            box-shadow: none; 
                            border: none; 
                            padding: 1rem; 
                        }
                    }
                </style>
            </head>
            <body>
                ${receiptContent.outerHTML}
                <script>
                    window.onload = function() {
                        setTimeout(() => {
                            window.print();
                            setTimeout(() => window.close(), 1000);
                        }, 500);
                    }
                </script>
            </body>
            </html>
        `);
        receiptWindow.document.close();
    }
}

// Global functions for HTML onclick handlers
function selectAddress(addressId) {
    document.querySelectorAll('.address-option').forEach(option => {
        option.classList.remove('selected');
    });
    
    event.target.closest('.address-option').classList.add('selected');
    checkout.selectedAddress = addressId;
}

function showNewAddressForm() {
    checkout.showNewAddressForm();
}

function nextStep() {
    checkout.nextStep();
}

function previousStep() {
    checkout.previousStep();
}

function placeOrder() {
    checkout.placeOrder();
}

// Initialize checkout when DOM is loaded
let checkout;
document.addEventListener('DOMContentLoaded', function() {
    checkout = new CheckoutManager();
    // Ensure shipping form is auto-filled after DOM and fields are present
    setTimeout(() => {
        // Try to auto-fill from address or user info again
        if (checkout.selectedAddress && checkout.addresses && checkout.addresses.length > 0) {
            const selected = checkout.addresses.find(a => a.id === checkout.selectedAddress);
            if (selected) checkout.autoFillShippingForm(selected);
        } else {
            checkout.autoFillShippingFormFromUser();
        }
    }, 300);
});

// Export for other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CheckoutManager;
}
