// Checkout functionality for ThreadedTreasure
const API_BASE_URL = 'http://localhost:3000/api';

class CheckoutManager {
    constructor() {
        this.currentStep = 1;
        this.cart = [];
        this.selectedAddress = null;
        this.paymentMethod = 'cod'; // Default to Cash on Delivery
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
        this.initializeValidation();
        
        // Add debug info to console
        console.log('Checkout initialized with user:', this.currentUser);
        console.log('Cart key:', this.getCartKey());
    }

    // Method to check product inventory
    async checkProductInventory(productId) {
        try {
            const response = await fetch(`${API_BASE_URL}/inventory/products/${productId}`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('userToken') || ''}`
                }
            });
            
            if (response.ok) {
                const result = await response.json();
                if (result.success && result.data) {
                    // Return total stock quantity for the product (sum of all size/color combinations)
                    return result.data.total_stock || 0;
                }
            }
            return 0;
        } catch (error) {
            console.error('Error checking inventory:', error);
            return 0;
        }
    }

    initializeValidation() {
        // Initialize jQuery validation for shipping form only
        $('#shipping-form').validate({
            rules: {
                fullName: {
                    required: true,
                    minlength: 2
                },
                address1: {
                    required: true,
                    minlength: 5
                },
                phone: {
                    required: true,
                    phone: true,
                    minlength: 10
                }
            },
            messages: {
                fullName: {
                    required: "Please enter your full name",
                    minlength: "Name must be at least 2 characters long"
                },
                address1: {
                    required: "Please enter your address",
                    minlength: "Address must be at least 5 characters long"
                },
                phone: {
                    required: "Please enter your phone number",
                    phone: "Please enter a valid phone number",
                    minlength: "Phone number must be at least 10 digits"
                }
            },
            errorElement: 'label',
            errorClass: 'error',
            validClass: 'valid',
            errorPlacement: function(error, element) {
                error.insertAfter(element);
            },
            highlight: function(element) {
                $(element).addClass('error').removeClass('valid');
            },
            unhighlight: function(element) {
                $(element).removeClass('error').addClass('valid');
            }
        });

        // Add custom phone validation method
        $.validator.addMethod("phone", function(value, element) {
            return this.optional(element) || /^[\+]?[1-9][\d]{0,15}$/.test(value.replace(/[\s\(\)\-]/g, ''));
        }, "Please enter a valid phone number");
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
        // Payment method radio button selection
        document.addEventListener('change', (e) => {
            if (e.target.name === 'paymentMethod') {
                this.paymentMethod = e.target.value;
                console.log('Payment method changed to:', this.paymentMethod);
            }
            if (e.target.name === 'selectedAddress') {
                this.selectedAddress = e.target.value;
            }
        });

        // Legacy payment method selection (remove this if not needed)
        document.querySelectorAll('.payment-method').forEach(method => {
            method.addEventListener('click', () => {
                document.querySelectorAll('.payment-method').forEach(m => m.classList.remove('selected'));
                method.classList.add('selected');
                this.paymentMethod = method.dataset.method;
                this.togglePaymentDetails();
            });
        });

        // Note: Removed card number, expiry, and CVV formatting since we no longer use credit cards
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
        // Simple address loading - just auto-fill form with user data
        try {
            const user = this.currentUser;
            if (user && user.name && user.address) {
                // User has data, show it as saved address
                const userAddress = {
                    id: 'user_profile',
                    name: user.name,
                    address: user.address,
                    phone: user.phone || ''
                };
                this.renderSavedAddresses([userAddress]);
                this.selectedAddress = 'user_profile';
            } else {
                // No user data, show new address form
                this.showNewAddressForm();
            }
        } catch (error) {
            console.error('Error loading address:', error);
            this.showNewAddressForm();
        }
    }
    autoFillShippingForm(address) {
        // Fill shipping form fields with address object (users table format)
        if (!address) return;
        
        console.log('Auto-filling form with address:', address);
        
        const fullNameField = document.getElementById('fullName');
        const address1Field = document.getElementById('address1');
        const phoneField = document.getElementById('phone');
        
        if (fullNameField) fullNameField.value = address.name || '';
        if (address1Field) address1Field.value = address.address || '';
        if (phoneField) phoneField.value = address.phone || '';
        
        console.log('Form fields filled:', {
            fullName: fullNameField?.value,
            address1: address1Field?.value,
            phone: phoneField?.value
        });
    }

    autoFillShippingFormFromUser() {
        // Fill shipping form fields with currentUser info if available (users table format)
        const user = this.currentUser;
        if (!user || user.isGuest) {
            console.log('No user data available for auto-fill');
            return;
        }
        
        console.log('Auto-filling form from user data:', user);
        
        const fullNameField = document.getElementById('fullName');
        const address1Field = document.getElementById('address1');
        const phoneField = document.getElementById('phone');
        
        // Use full name directly
        const fullName = user.name || '';
        if (fullNameField) fullNameField.value = fullName;
        
        // Use address field directly
        const fullAddress = user.address || '';
        if (address1Field) address1Field.value = fullAddress;
        
        // Use phone directly
        const phone = user.phone || '';
        if (phoneField) phoneField.value = phone;
        
        console.log('Form auto-filled with:', {
            fullName: fullName,
            address: fullAddress,
            phone: phone
        });
    }

    renderSavedAddresses(addresses) {
        const container = document.getElementById('saved-addresses');
        if (!container) return;

        if (addresses.length === 0) {
            container.innerHTML = '<p>No saved addresses found.</p>';
            return;
        }

        container.innerHTML = addresses.map((address, index) => `
            <div class="address-option ${index === 0 ? 'selected' : ''}" onclick="selectAddress('${address.id}')">
                <input type="radio" name="selectedAddress" value="${address.id}" ${index === 0 ? 'checked' : ''}>
                <div>
                    <strong>${address.name}</strong>
                    <br>${address.address || 'No address provided'}
                    <br>${address.phone || 'No phone provided'}
                </div>
            </div>
        `).join('');

        if (addresses.length > 0) {
            this.selectedAddress = addresses[0].id;
        }
    }

    showNewAddressForm() {
        const form = document.getElementById('new-address-form');
        const btn = document.querySelector('.new-address-btn');
        
        if (form) {
            form.style.display = 'block';
            // Auto-fill with user data
            this.autoFillForm();
        }
        
        if (btn) {
            btn.textContent = 'Cancel';
            btn.onclick = () => this.hideNewAddressForm();
        }
    }

    hideNewAddressForm() {
        const form = document.getElementById('new-address-form');
        const btn = document.querySelector('.new-address-btn');
        
        if (form) form.style.display = 'none';
        
        if (btn) {
            btn.innerHTML = '<i class="fas fa-plus"></i> Add New Address';
            btn.onclick = () => this.showNewAddressForm();
        }
    }

    autoFillForm() {
        const user = this.currentUser;
        if (!user) return;
        
        const fullNameField = document.getElementById('fullName');
        const address1Field = document.getElementById('address1');
        const phoneField = document.getElementById('phone');
        
        if (fullNameField && user.name) fullNameField.value = user.name;
        if (address1Field && user.address) address1Field.value = user.address;
        if (phoneField && user.phone) phoneField.value = user.phone;
    }

    togglePaymentDetails() {
        // No longer needed since we don't have card details form
        // Keep method for compatibility but it does nothing
        console.log('Payment method selected:', this.paymentMethod);
    }

    validateShippingForm() {
        // Use jQuery validation
        const form = $('#shipping-form');
        if (form.length === 0) {
            // No form visible, validate selected address instead
            if (!this.selectedAddress) {
                this.showError('Please select a shipping address.');
                return false;
            }
            return true;
        }
        
        // Validate form using jQuery validation
        const isValid = form.valid();
        
        if (!isValid) {
            this.showError('Please correct the errors in the shipping form.');
            return false;
        }
        
        return true;
    }

    validatePaymentForm() {
        // Simple validation - just check if a payment method is selected
        const selectedPayment = document.querySelector('input[name="paymentMethod"]:checked');
        
        if (!selectedPayment) {
            this.showError('Please select a payment method.');
            return false;
        }
        
        // Update our payment method based on selection
        this.paymentMethod = selectedPayment.value;
        console.log('Payment method validated:', this.paymentMethod);
        return true;
    }

    nextStep() {
        // Validate current step using jQuery validation
        if (this.currentStep === 1) {
            // Shipping step validation
            if (!this.validateShippingForm()) {
                return;
            }
        } else if (this.currentStep === 2) {
            // Payment step validation
            if (!this.validatePaymentForm()) {
                return;
            }
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
        // Simple shipping info - get from form or user profile
        const user = this.currentUser;
        
        // Try form fields first
        const fullNameField = document.getElementById('fullName');
        const address1Field = document.getElementById('address1');
        const address2Field = document.getElementById('address2');
        const phoneField = document.getElementById('phone');
        
        const fullName = fullNameField?.value || user?.name || '';
        const address1 = address1Field?.value || user?.address || '';
        const address2 = address2Field?.value || '';
        const phone = phoneField?.value || user?.phone || '';
        
        return {
            name: fullName,
            fullName: fullName,
            address1: address1,
            address2: address2,
            phone: phone,
            address: `${address1}${address2 ? ', ' + address2 : ''}`
        };
    }

    getPaymentInfo() {
        const paymentMethod = this.paymentMethod || 'cod';
        
        switch (paymentMethod) {
            case 'cod':
                return {
                    method: 'cod',
                    type: 'Cash on Delivery',
                    details: 'Payment upon delivery'
                };
            case 'bank-transfer':
                return {
                    method: 'bank-transfer',
                    type: 'Bank Transfer',
                    details: 'ThreadedTreasure Bank - Account: 1234-5678-9012-3456'
                };
            case 'gcash':
                return {
                    method: 'gcash',
                    type: 'GCash',
                    details: 'GCash Number: +63 912 345 6789'
                };
            default:
                return {
                    method: 'cod',
                    type: 'Cash on Delivery',
                    details: 'Payment upon delivery'
                };
        }
    }

async placeOrder() {
    const button = document.querySelector('.place-order-btn') || 
                  document.querySelector('.btn-success[onclick="placeOrder()"]') ||
                  document.querySelector('button[onclick="placeOrder()"]');
    
    if (!button) {
        console.error('Place order button not found');
        this.showError('Unable to find order button. Please refresh the page.');
        return;
    }

    const spinner = button.querySelector('.loading-spinner');
    
    // Basic validation
    if (!this.currentUser || this.currentUser.isGuest) {
        this.showError('You must be logged in to place an order.');
        return;
    }
    
    if (!this.cart || this.cart.length === 0) {
        this.showError('Your cart is empty.');
        return;
    }
    
    const shippingValid = this.validateShippingForm();
    if (!shippingValid) {
        this.showError('Please provide valid shipping information.');
        return;
    }
    
    const paymentValid = this.validatePaymentForm();
    if (!paymentValid) {
        this.showError('Please select a payment method.');
        return;
    }
    
    const shippingInfo = this.getShippingInfo();
    if (!shippingInfo.name || !shippingInfo.address1) {
        this.showError('Please provide complete shipping information.');
        return;
    }
    
    // Show loading state
    button.disabled = true;
    if (spinner) spinner.style.display = 'inline-block';
    
    try {
        // Validate inventory before placing order
        console.log('🔍 Validating inventory before placing order...');
        for (const item of this.cart) {
            const availableStock = await this.checkProductInventory(item.id);
            if (item.quantity > availableStock) {
                button.disabled = false;
                if (spinner) spinner.style.display = 'none';
                this.showError(`Insufficient stock for ${item.name}. Available: ${availableStock}, Requested: ${item.quantity}. Please update your cart.`);
                return;
            }
        }
        console.log('✅ Inventory validation passed');

        // Transform cart items to match API expectations
        const transformedItems = this.cart.map(item => ({
            id: item.id || item.product_id,
            product_id: item.id || item.product_id,
            name: item.name,
            product_name: item.name,
            size: item.size || 'M',
            color: item.color || 'Default',
            quantity: item.quantity || 1,
            price: item.price || 0,
            unit_price: item.price || 0
        }));

        const orderData = {
            items: transformedItems,
            shippingAddress: shippingInfo,
            paymentMethod: this.paymentMethod,
            subtotal: this.subtotal,
            shipping: this.shipping,
            tax: this.tax,
            total: this.total
        };
        
        console.log('Placing order with data:', orderData);
        console.log('API URL:', `${API_BASE_URL}/orders`);
        
        const response = await fetch(`${API_BASE_URL}/orders`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('userToken') || ''}`
            },
            body: JSON.stringify(orderData)
        });
        
        console.log('Order response status:', response.status);
        console.log('Order response headers:', response.headers);
        
        let responseText;
        try {
            responseText = await response.text();
            console.log('Order response text:', responseText);
        } catch (e) {
            console.error('Failed to read response text:', e);
            responseText = '';
        }
        
        if (!response.ok) {
            console.error('Order API error:', response.status, responseText);
            this.showError(`Failed to save order. Server responded with: ${response.status} - ${responseText}`);
            button.disabled = false;
            if (spinner) spinner.style.display = 'none';
            return;
        }

        // Parse successful response
        let result;
        try {
            if (!responseText.trim()) {
                console.warn('Empty response received from server');
                result = {
                    success: true,
                    order: {
                        orderNumber: 'TT' + Date.now(),
                        paymentMethod: this.paymentMethod,
                        total: this.total
                    }
                };
            } else {
                result = JSON.parse(responseText);
                console.log('Parsed response:', result);
            }
        } catch (e) {
            console.error('JSON parse error:', e, 'Response text:', responseText);
            this.showError('Order submission error: Invalid server response. Please try again.');
            button.disabled = false;
            if (spinner) spinner.style.display = 'none';
            return;
        }

        // Handle successful order
        if (result && result.success) {
            this.orderData = result.order || result.data || { 
                orderNumber: result.orderNumber || 'TT' + Date.now(),
                paymentMethod: this.paymentMethod,
                total: this.total
            };
        } else if (result && result.order) {
            this.orderData = result.order;
        } else {
            // Fallback order data if response structure is unexpected
            this.orderData = {
                orderNumber: 'TT' + Date.now(),
                paymentMethod: this.paymentMethod,
                total: this.total
            };
        }

        // Store original totals in orderData for receipt display
        this.orderData.subtotal = this.subtotal;
        this.orderData.shipping = this.shipping;
        this.orderData.tax = this.tax;
        this.orderData.total = this.total;
        this.orderData.items = [...this.cart]; // Store copy of cart items

        console.log('Order placed successfully:', this.orderData);
        
        // Clear all checkout data completely
        console.log('Clearing all checkout data after successful order...');
        this.clearAllCheckoutData();
        
        // Update display to show order completion
        this.currentStep = 4;
        this.updateStepDisplay();
        this.updateProgress();
        this.showOrderConfirmation();
        
        // Double-check everything is cleared and force UI update
        setTimeout(() => {
            this.clearAllCheckoutData();
            console.log('All checkout data double-checked and cleared');
        }, 500);

        button.disabled = false;
        if (spinner) spinner.style.display = 'none';
        
        console.log('Order completion process finished successfully');
    } catch (error) {
        console.error('Order placement error:', error);
        console.error('Error details:', {
            message: error.message,
            stack: error.stack,
            currentUser: this.currentUser,
            cartLength: this.cart.length,
            apiUrl: `${API_BASE_URL}/orders`
        });
        
        // Check if it's a network error
        if (error.name === 'TypeError' && error.message.includes('fetch')) {
            this.showError('Network error: Please check your internet connection and server status.');
        } else if (error.message.includes('Failed to fetch')) {
            this.showError('Server connection failed: Please make sure the server is running on port 3000.');
        } else {
            this.showError(`Order failed: ${error.message}. Please try again.`);
        }
        
        button.disabled = false;
        if (spinner) spinner.style.display = 'none';
    }
}




    showOrderConfirmation() {
        const orderNumber = this.orderData.orderNumber || 'TT' + Date.now();
        const shippingInfo = this.getShippingInfo();
        const paymentInfo = this.getPaymentInfo();
        
        // Preserve the original order totals for the receipt
        const originalSubtotal = this.orderData.subtotal || this.subtotal;
        const originalShipping = this.orderData.shipping || this.shipping;
        const originalTax = this.orderData.tax || this.tax;
        const originalTotal = this.orderData.total || this.total;
        
        const itemsHTML = (this.orderData.items || this.cart).map(item => `
            <div style="border-bottom: 1px solid #eee; padding: 10px 0;">
                <strong>${item.name}</strong> - Qty: ${item.quantity} - $${(item.price * item.quantity).toFixed(2)}
                <br><small style="color: #666;">Size: ${item.size} | Color: ${item.color}</small>
            </div>
        `).join('');
        
        const stepCompleteElement = document.getElementById('step-complete');
        if (!stepCompleteElement) {
            console.error('step-complete element not found in DOM');
            return;
        }
        
        stepCompleteElement.innerHTML = `
            <div style="background: white; padding: 20px; border-radius: 8px; border: 1px solid #ddd;">
                <div style="text-align: center; margin-bottom: 20px;">
                    <i class="fas fa-check-circle" style="font-size: 3rem; color: #28a745; margin-bottom: 10px;"></i>
                    <h4 style="color: #28a745; margin: 0;">Order Placed Successfully!</h4>
                </div>
                
                <div style="background: #f8f9fa; padding: 15px; border-radius: 6px; margin-bottom: 20px;">
                    <h5 style="margin: 0 0 10px 0; color: #333;">Order #${orderNumber}</h5>
                    <p style="margin: 0;"><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>
                    <p style="margin: 5px 0 0 0;"><strong>Payment Method:</strong> ${paymentInfo.type}</p>
                </div>
                
                <h5 style="color: #333; border-bottom: 2px solid #667eea; padding-bottom: 5px;">Shipping To:</h5>
                <div style="background: #f8f9fa; padding: 15px; border-radius: 6px; margin-bottom: 20px;">
                    <strong>${shippingInfo.name}</strong><br>
                    ${shippingInfo.address}<br>
                    Phone: ${shippingInfo.phone}
                </div>
                
                <h5 style="color: #333; border-bottom: 2px solid #667eea; padding-bottom: 5px;">Items Ordered:</h5>
                <div style="margin-bottom: 20px;">
                    ${itemsHTML}
                </div>
                
                <div style="background: #f8f9fa; padding: 15px; border-radius: 6px;">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                        <span>Subtotal:</span>
                        <span>$${originalSubtotal.toFixed(2)}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                        <span>Shipping:</span>
                        <span>$${originalShipping.toFixed(2)}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                        <span>Tax:</span>
                        <span>$${originalTax.toFixed(2)}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; border-top: 2px solid #667eea; padding-top: 10px; font-size: 1.2rem; font-weight: bold;">
                        <span>Total:</span>
                        <span style="color: #667eea;">$${originalTotal.toFixed(2)}</span>
                    </div>
                </div>
                
                ${this.getPaymentInstructions(originalTotal)}
                
                <div style="margin-top: 30px; text-align: center; border-top: 1px solid #ddd; padding-top: 20px;">
                    <button onclick="startNewOrder()" class="btn btn-primary" style="background: #3182ce; border: none; padding: 12px 24px; border-radius: 6px; margin-right: 10px;">
                        <i class="fas fa-shopping-cart"></i> Start New Order
                    </button>
                    <button onclick="goToOrders()" class="btn btn-outline-primary" style="border: 2px solid #3182ce; color: #3182ce; background: white; padding: 12px 24px; border-radius: 6px; margin-left: 10px;">
                        <i class="fas fa-list"></i> View My Orders
                    </button>
                </div>
            </div>
        `;
    }

    getPaymentInstructions(orderTotal = null) {
        const paymentMethod = this.paymentMethod || 'cod';
        const totalAmount = orderTotal || this.total;
        
        switch (paymentMethod) {
            case 'cod':
                return `
                    <div style="background: #e7f3ff; border: 1px solid #b3d9ff; border-radius: 6px; padding: 15px; margin-top: 20px;">
                        <h6 style="color: #0066cc; margin-bottom: 10px;"><i class="fas fa-info-circle"></i> Payment Instructions</h6>
                        <p style="margin: 0; color: #333;">
                            <strong>Cash on Delivery:</strong> Please prepare the exact amount of <strong>$${totalAmount.toFixed(2)}</strong> 
                            for payment upon delivery. A valid ID may be required.
                        </p>
                    </div>
                `;
            case 'bank-transfer':
                return `
                    <div style="background: #e7f3ff; border: 1px solid #b3d9ff; border-radius: 6px; padding: 15px; margin-top: 20px;">
                        <h6 style="color: #0066cc; margin-bottom: 10px;"><i class="fas fa-info-circle"></i> Payment Instructions</h6>
                        <p style="margin-bottom: 10px; color: #333;">
                            <strong>Bank Transfer:</strong> Please transfer <strong>$${totalAmount.toFixed(2)}</strong> to:
                        </p>
                        <div style="background: white; padding: 10px; border-radius: 4px;">
                            <strong>Bank:</strong> ThreadedTreasure Bank<br>
                            <strong>Account Name:</strong> ThreadedTreasure Store<br>
                            <strong>Account Number:</strong> 1234-5678-9012-3456<br>
                            <strong>Reference:</strong> ${this.orderData.orderNumber}
                        </div>
                        <p style="margin: 10px 0 0 0; font-size: 0.9rem; color: #666;">
                            Please send proof of payment to orders@threadedtreasure.com
                        </p>
                    </div>
                `;
            case 'gcash':
                return `
                    <div style="background: #e7f3ff; border: 1px solid #b3d9ff; border-radius: 6px; padding: 15px; margin-top: 20px;">
                        <h6 style="color: #0066cc; margin-bottom: 10px;"><i class="fas fa-info-circle"></i> Payment Instructions</h6>
                        <p style="margin-bottom: 10px; color: #333;">
                            <strong>GCash Payment:</strong> Please send <strong>$${totalAmount.toFixed(2)}</strong> to:
                        </p>
                        <div style="background: white; padding: 10px; border-radius: 4px;">
                            <strong>GCash Number:</strong> +63 912 345 6789<br>
                            <strong>Account Name:</strong> ThreadedTreasure Store<br>
                            <strong>Reference:</strong> ${this.orderData.orderNumber}
                        </div>
                        <p style="margin: 10px 0 0 0; font-size: 0.9rem; color: #666;">
                            Please send screenshot of payment confirmation to orders@threadedtreasure.com
                        </p>
                    </div>
                `;
            default:
                return '';
        }
    }

    clearCart() {
        // Clear cart from memory
        this.cart = [];
        
        // Clear cart from localStorage
        const cartKey = this.getCartKey();
        if (cartKey) {
            localStorage.removeItem(cartKey);
            console.log(`Cart cleared for user ${this.currentUser.id}`);
        }
        
        // Update cart display
        this.renderCartItems();
        this.calculateTotals();
        
        // Update cart count in header if it exists
        this.updateCartCount();
        
        // Dispatch event to notify other components (like header cart count)
        window.dispatchEvent(new CustomEvent('cartUpdated', {
            detail: { cartCount: 0, cartTotal: 0 }
        }));
        
        // Force update cart count immediately
        setTimeout(() => {
            this.updateCartCount();
            // Also call global updateCartCount if it exists
            if (typeof window.updateCartCount === 'function') {
                window.updateCartCount();
            }
        }, 100);
    }

    updateCartCount() {
        // Update cart count in header
        const cartCountEl = document.getElementById('cart-count');
        if (cartCountEl) {
            cartCountEl.textContent = '0';
            cartCountEl.style.display = 'none';
        }
        
        // Update any other cart count elements
        const cartCountElements = document.querySelectorAll('.cart-count, #cart-count, [data-cart-count]');
        cartCountElements.forEach(el => {
            el.textContent = '0';
            if (el.style) el.style.display = 'none';
        });
        
        console.log('Cart count updated to 0');
    }

    clearAllCheckoutData() {
        console.log('Clearing all checkout data...');
        
        // 1. Clear cart data
        this.clearCart();
        
        // 2. Clear all form data
        this.clearAllForms();
        
        // 3. Reset checkout state
        this.resetCheckoutState();
        
        // 4. Clear selected options
        this.clearSelections();
        
        // 5. Clear temporary/session data
        this.clearTemporaryData();
        
        // 6. Update UI displays
        this.updateAllDisplays();
        
        console.log('All checkout data cleared successfully');
    }

    clearAllForms() {
        // Clear shipping form
        const shippingForm = document.getElementById('shipping-form');
        if (shippingForm) {
            shippingForm.reset();
            // Clear validation errors
            if (typeof $.fn.validate !== 'undefined') {
                $(shippingForm).validate().resetForm();
                $(shippingForm).find('.error').removeClass('error');
            }
        }
        
        // Clear individual form fields
        const formFields = [
            'fullName', 'address1', 'address2', 'city', 'state', 'zipCode', 'phone'
        ];
        
        formFields.forEach(fieldId => {
            const field = document.getElementById(fieldId);
            if (field) {
                field.value = '';
                field.readOnly = false;
                field.classList.remove('error', 'valid');
            }
        });
        
        // Clear any error messages
        const errorLabels = document.querySelectorAll('label.error');
        errorLabels.forEach(label => label.remove());
        
        console.log('All forms cleared');
    }

    resetCheckoutState() {
        // Reset checkout properties but preserve orderData for receipt display
        this.selectedAddress = null;
        this.paymentMethod = 'cod'; // Reset to default
        // Keep this.orderData intact for receipt display
        this.subtotal = 0;
        this.shipping = 0;
        this.tax = 0;
        this.total = 0;
        
        console.log('Checkout state reset (order data preserved for receipt)');
    }

    clearSelections() {
        // Clear address selections
        const addressOptions = document.querySelectorAll('.address-option');
        addressOptions.forEach(option => {
            option.classList.remove('selected');
        });
        
        const addressRadios = document.querySelectorAll('input[name="selectedAddress"]');
        addressRadios.forEach(radio => {
            radio.checked = false;
        });
        
        // Clear payment method selections
        const paymentRadios = document.querySelectorAll('input[name="paymentMethod"]');
        paymentRadios.forEach(radio => {
            radio.checked = false;
        });
        
        // Reset to default payment method (COD)
        const codRadio = document.querySelector('input[name="paymentMethod"][value="cod"]');
        if (codRadio) {
            codRadio.checked = true;
            this.paymentMethod = 'cod';
        }
        
        // Clear payment method visual selections (if any)
        const paymentMethods = document.querySelectorAll('.payment-method');
        paymentMethods.forEach(method => {
            method.classList.remove('selected');
        });
        
        console.log('All selections cleared');
    }

    clearTemporaryData() {
        // Clear any checkout-related session storage
        const sessionKeysToRemove = [];
        for (let i = 0; i < sessionStorage.length; i++) {
            const key = sessionStorage.key(i);
            if (key && (key.includes('checkout') || key.includes('order') || key.includes('shipping'))) {
                sessionKeysToRemove.push(key);
            }
        }
        sessionKeysToRemove.forEach(key => sessionStorage.removeItem(key));
        
        // Clear any temporary order data from localStorage
        const tempKeysToRemove = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && (key.includes('temp_order') || key.includes('checkout_temp'))) {
                tempKeysToRemove.push(key);
            }
        }
        tempKeysToRemove.forEach(key => localStorage.removeItem(key));
        
        // Clear any form validation classes/states
        const allInputs = document.querySelectorAll('input, select, textarea');
        allInputs.forEach(input => {
            input.classList.remove('error', 'valid', 'is-invalid', 'is-valid');
        });
        
        console.log('Temporary data cleared');
    }

    updateAllDisplays() {
        // Update order summary to show zero values (but keep receipt intact)
        this.updateOrderSummary();
        
        // Update cart display to show empty
        this.renderCartItems();
        
        // Update cart count
        this.updateCartCount();
        
        // Clear any success/error messages
        const errorDiv = document.getElementById('error-message');
        if (errorDiv) errorDiv.remove();
        
        // DO NOT clear order confirmation - keep the receipt visible
        // Only clear other confirmation elements that are not the main order receipt
        const otherConfirmations = document.querySelectorAll('[id*="confirmation"]:not(#order-confirmation):not(#step-complete)');
        otherConfirmations.forEach(element => {
            if (element.innerHTML) element.innerHTML = '';
        });
        
        console.log('Order summary cleared but receipt preserved');
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

function triggerAutoFill() {
    if (checkout) {
        console.log('Manually triggering auto-fill...');
        checkout.autoFillShippingFormFromUser();
    }
}

function debugCheckout() {
    if (checkout) {
        console.log('=== Checkout Debug Info ===');
        console.log('Current user:', checkout.currentUser);
        console.log('Selected address:', checkout.selectedAddress);
        console.log('Cart items:', checkout.cart);
        console.log('Current step:', checkout.currentStep);
        console.log('Totals:', {
            subtotal: checkout.subtotal,
            shipping: checkout.shipping,
            tax: checkout.tax,
            total: checkout.total
        });
        
        // Check form visibility
        const form = document.getElementById('new-address-form');
        console.log('New address form visible:', form ? form.style.display !== 'none' : 'form not found');
        
        // Check saved addresses
        const savedAddresses = document.getElementById('saved-addresses');
        console.log('Saved addresses content:', savedAddresses ? savedAddresses.innerHTML : 'container not found');
        
        console.log('=== End Debug Info ===');
    }
}

function debugOrderData() {
    if (checkout) {
        console.log('=== Order Data Debug ===');
        const shippingInfo = checkout.getShippingInfo();
        const transformedItems = checkout.cart.map(item => ({
            id: item.id || item.product_id,
            product_id: item.id || item.product_id,
            name: item.name,
            product_name: item.name,
            size: item.size || 'M',
            color: item.color || 'Default',
            quantity: item.quantity || 1,
            price: item.price || 0,
            unit_price: item.price || 0
        }));
        
        const orderData = {
            items: transformedItems,
            shippingAddress: shippingInfo,
            paymentMethod: checkout.paymentMethod,
            subtotal: checkout.subtotal,
            shipping: checkout.shipping,
            tax: checkout.tax,
            total: checkout.total
        };
        
        console.log('Order data that would be sent:', orderData);
        console.log('User token:', localStorage.getItem('userToken') ? 'Present' : 'Missing');
        console.log('API URL:', `${API_BASE_URL}/orders`);
        console.log('=== End Order Data Debug ===');
    }
}

function startNewOrder() {
    if (checkout) {
        console.log('Starting new order - clearing all data and resetting to step 1');
        
        // Clear all checkout data
        checkout.clearAllCheckoutData();
        
        // Reset to first step
        checkout.currentStep = 1;
        checkout.updateStepDisplay();
        checkout.updateProgress();
        
        // Reload cart items (should be empty)
        checkout.loadCartItems();
        
        // Redirect to shop to add items
        window.location.href = 'shop.html';
    }
}

function goToOrders() {
    // Redirect to user orders page
    window.location.href = 'users/my-orders.html';
}

// Initialize checkout when DOM and jQuery are loaded
let checkout;
$(document).ready(function() {
    // Ensure jQuery validation is available
    if (typeof $.validator !== 'undefined') {
        checkout = new CheckoutManager();
        console.log('Checkout initialized with jQuery validation');
    } else {
        console.error('jQuery validation plugin not loaded');
        // Fallback to basic initialization
        checkout = new CheckoutManager();
    }
    // Ensure jQuery validation is available and auto-fill user data
    if (typeof $.validator !== 'undefined') {
        if (checkout) checkout.autoFillShippingFormFromUser();
    } else {
        setTimeout(() => {
            if (checkout) checkout.autoFillShippingFormFromUser();
        }, 500);
    }
});

// Legacy DOM ready for non-jQuery dependent code
document.addEventListener('DOMContentLoaded', function() {
    if (!checkout) {
        checkout = new CheckoutManager();
    }
});

// Export for other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CheckoutManager;
}