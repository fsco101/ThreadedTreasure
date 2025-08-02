/**
 * Header Component JavaScript
 * Handles navigation, authentication, admin menus, and cart functionality
 */

class HeaderManager {
    constructor() {
        this.userData = {};
        this.isInitialized = false;
        this.API_BASE_URL = 'http://localhost:3000/api';
        this.lastCartCount = 0;
        this.cartWatcherInterval = null;
        this.init();
    }

    /**
     * Initialize the header manager
     */
    init() {
        // Wait for DOM and component to be loaded
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.setupHeader());
        } else {
            // If DOM is already loaded, wait a bit for component to load
            setTimeout(() => this.setupHeader(), 100);
        }
    }

    /**
     * Setup header functionality after component is loaded
     */
    async setupHeader() {
        // Check if header elements are available
        const header = document.querySelector('.main-header');
        if (!header) {
            // If header not loaded yet, retry after a short delay
            setTimeout(() => this.setupHeader(), 100);
            return;
        }

        this.setupMobileMenu();
        await this.loadUserData();
        this.setupNavigation();
        this.setupAdminMenu();
        this.setupCartFunctionality();
        this.isInitialized = true;
        
        console.log('🔧 Header Manager initialized successfully');
    }

    /**
     * Setup mobile menu toggle
     */
    setupMobileMenu() {
        const mobileToggle = document.querySelector('.mobile-menu-toggle');
        const mainNav = document.querySelector('.main-nav');
        
        if (mobileToggle && mainNav) {
            mobileToggle.addEventListener('click', () => {
                mainNav.classList.toggle('active');
            });
        }
    }

    /**
     * Load user data from localStorage and API
     */
    async loadUserData() {
        try {
            // First try to get from localStorage (for quick initial load)
            const storedUserData = localStorage.getItem('userData');
            const token = localStorage.getItem('userToken');
            
            if (storedUserData) {
                this.userData = JSON.parse(storedUserData);
            }

            // If we have a token, fetch fresh data from API
            if (token) {
                try {
                    const response = await fetch(`${this.API_BASE_URL}/users/profile`, {
                        method: 'GET',
                        headers: {
                            'Authorization': `Bearer ${token}`,
                            'Content-Type': 'application/json'
                        }
                    });

                    if (response.ok) {
                        const result = await response.json();
                        if (result.success && result.data) {
                            this.userData = result.data;
                            // Update localStorage with fresh data
                            localStorage.setItem('userData', JSON.stringify(result.data));
                            console.log('✅ User data refreshed from API:', this.userData.name);
                        }
                    } else if (response.status === 401) {
                        // Token is invalid, clear auth data
                        this.clearAuthData();
                        console.log('🚫 Invalid token, cleared auth data');
                    }
                } catch (apiError) {
                    console.warn('⚠️ Failed to fetch user data from API:', apiError);
                    // Continue with stored data if API fails
                }
            }
        } catch (error) {
            console.warn('⚠️ Failed to load user data:', error);
            this.userData = {};
        }
    }

    /**
     * Clear authentication data
     */
    clearAuthData() {
        this.userData = {};
        localStorage.removeItem('userData');
        localStorage.removeItem('userToken');
    }

    /**
     * Setup navigation visibility based on user authentication
     */
    setupNavigation() {
        const isActive = this.userData && this.userData.is_active === 1;
        const role = this.userData && typeof this.userData.role === 'string' 
            ? this.userData.role.trim().toLowerCase() 
            : '';

        // Get navigation elements
        const navLogin = document.querySelector('.nav-login');
        const navLogout = document.querySelector('.nav-logout');
        const navProfile = document.querySelector('.nav-profile');
        const navMyOrders = document.querySelector('.nav-my-orders');
        const profileBtn = document.getElementById('profileBtn');
        const userProfilePhoto = document.getElementById('userProfilePhoto');

        if (isActive) {
            // User is logged in and active
            this.showElement(navLogout);
            this.showElement(navProfile);
            this.showElement(navMyOrders);
            this.hideElement(navLogin);
            
            if (profileBtn) {
                profileBtn.style.display = 'inline-flex';
                this.updateProfilePhoto(userProfilePhoto);
            }
        } else {
            // User is not logged in or not active
            this.showElement(navLogin);
            this.hideElement(navLogout);
            this.hideElement(navProfile);
            this.hideElement(navMyOrders);
            this.hideElement(profileBtn);
        }

        console.log(`👤 Navigation setup for ${isActive ? 'authenticated' : 'guest'} user${role ? ` (${role})` : ''}`);
    }

    /**
     * Update profile photo with proper path handling
     */
    updateProfilePhoto(photoElement) {
        if (photoElement && this.userData.profile_photo) {
            let photoUrl;
            
            // Handle different photo path formats
            if (this.userData.profile_photo.startsWith('http://') || this.userData.profile_photo.startsWith('https://')) {
                // Full URL
                photoUrl = this.userData.profile_photo;
            } else if (this.userData.profile_photo.startsWith('/')) {
                // Already has leading slash
                photoUrl = this.userData.profile_photo;
            } else {
                // Profile photos are stored directly in uploads/ directory
                // Just add the uploads/ prefix
                photoUrl = '/uploads/' + this.userData.profile_photo;
            }
            
            photoElement.src = photoUrl;
            photoElement.alt = `${this.userData.name || 'User'}'s profile`;
            
            // Add error handling for broken images
            photoElement.onerror = () => {
                photoElement.src = '/uploads/users/default-avatar.svg';
                console.warn('⚠️ Failed to load profile photo, using default');
            };
            
            console.log(`📸 Profile photo updated: ${photoUrl}`);
        } else if (photoElement) {
            // Use default avatar
            photoElement.src = '/uploads/users/default-avatar.svg';
            photoElement.alt = 'Default profile';
        }
    }

    /**
     * Setup admin menu functionality
     */
    setupAdminMenu() {
        const isActive = this.userData && this.userData.is_active === 1;
        const role = this.userData && typeof this.userData.role === 'string' 
            ? this.userData.role.trim().toLowerCase() 
            : '';

        const adminDropdown = document.querySelector('.nav-admin-dropdown');
        
        if (adminDropdown) {
            // Show/hide admin dropdown based on user role
            const shouldShowAdmin = isActive && role === 'admin';
            adminDropdown.style.display = shouldShowAdmin ? '' : 'none';

            if (shouldShowAdmin) {
                this.setupAdminDropdownEvents(adminDropdown);
                console.log('🔑 Admin menu enabled');
            }
        }
    }

    /**
     * Setup admin dropdown events
     */
    setupAdminDropdownEvents(adminDropdown) {
        const adminMenuToggle = document.getElementById('adminMenuToggle');
        const adminMenu = adminDropdown.querySelector('.admin-dropdown-menu');
        
        if (adminMenuToggle && adminMenu) {
            // Toggle dropdown on click
            adminMenuToggle.addEventListener('click', (e) => {
                e.preventDefault();
                const isVisible = adminMenu.classList.contains('show');
                
                if (isVisible) {
                    this.hideAdminMenu(adminMenu);
                } else {
                    this.showAdminMenu(adminMenu);
                }
            });

            // Close dropdown when clicking outside
            document.addEventListener('click', (e) => {
                if (!adminDropdown.contains(e.target) && adminMenu.classList.contains('show')) {
                    this.hideAdminMenu(adminMenu);
                }
            });
        }
    }

    /**
     * Show admin menu
     */
    showAdminMenu(adminMenu) {
        adminMenu.style.display = 'block';
        adminMenu.classList.add('show');
    }

    /**
     * Hide admin menu
     */
    hideAdminMenu(adminMenu) {
        adminMenu.style.display = 'none';
        adminMenu.classList.remove('show');
    }

    /**
     * Setup cart functionality with proper integration
     */
    setupCartFunctionality() {
        this.updateCartCount();
        
        // Listen for storage changes (cart updates from other tabs)
        window.addEventListener('storage', (e) => {
            if (e.key && (e.key.startsWith('cart_user_') || e.key === 'cart')) {
                this.updateCartCount();
            }
        });

        // Listen for custom cart update events
        window.addEventListener('cartUpdated', () => {
            this.updateCartCount();
        });

        // Listen for item added to cart events
        window.addEventListener('itemAddedToCart', () => {
            this.updateCartCount();
            this.showCartNotification();
        });

        // Set up MutationObserver to watch for cart changes in localStorage
        this.setupCartWatcher();
    }

    /**
     * Setup cart watcher for immediate updates
     */
    setupCartWatcher() {
        // Check for cart changes every 100ms for immediate feedback
        this.cartWatcherInterval = setInterval(() => {
            this.updateCartCount();
        }, 100);

        // Stop watching after 30 seconds to avoid performance issues
        setTimeout(() => {
            if (this.cartWatcherInterval) {
                clearInterval(this.cartWatcherInterval);
                this.cartWatcherInterval = null;
            }
        }, 30000);
    }

    /**
     * Get the appropriate cart key for the current user
     */
    getCartKey() {
        if (this.userData && this.userData.id && this.userData.id !== 'guest') {
            return `cart_user_${this.userData.id}`;
        }
        return 'cart'; // Fallback for guest users
    }

    /**
     * Update cart count display with proper user-specific cart
     */
    updateCartCount() {
        const cartCountEl = document.getElementById('cartCount');
        const cartNotificationEl = document.getElementById('cartNotification');
        
        let cart = [];
        let count = 0;
        
        try {
            const cartKey = this.getCartKey();
            const cartData = localStorage.getItem(cartKey);
            if (cartData) {
                cart = JSON.parse(cartData);
                count = Array.isArray(cart) ? cart.length : 0;
            }
        } catch (error) {
            console.warn('⚠️ Failed to parse cart data:', error);
            cart = [];
            count = 0;
        }

        // Update cart count element
        if (cartCountEl) {
            cartCountEl.textContent = count;
            cartCountEl.style.display = count > 0 ? 'inline-block' : 'none';
            
            // Add pulse animation if count increased
            if (count > this.lastCartCount) {
                cartCountEl.style.animation = 'pulse 0.6s ease-in-out';
                setTimeout(() => {
                    cartCountEl.style.animation = '';
                }, 600);
            }
        }
        
        // Update cart notification element
        if (cartNotificationEl) {
            cartNotificationEl.style.display = count > 0 ? 'inline-block' : 'none';
        }

        // Store last count for comparison
        this.lastCartCount = count;

        console.log(`🛒 Cart updated: ${count} items (key: ${this.getCartKey()})`);
        
        return count;
    }

    /**
     * Show cart notification animation
     */
    showCartNotification() {
        const cartBtn = document.getElementById('cartBtn');
        const cartNotification = document.getElementById('cartNotification');
        const cartCount = document.getElementById('cartCount');
        
        if (cartBtn) {
            // Add pulse animation to the entire cart button
            cartBtn.style.animation = 'pulse 0.6s ease-in-out';
            cartBtn.style.transform = 'scale(1.1)';
            
            // Reset animation after completion
            setTimeout(() => {
                cartBtn.style.animation = '';
                cartBtn.style.transform = '';
            }, 600);
        }
        
        if (cartNotification) {
            cartNotification.style.animation = 'pulse 0.6s ease-in-out';
            
            setTimeout(() => {
                cartNotification.style.animation = '';
            }, 600);
        }

        if (cartCount) {
            cartCount.style.animation = 'pulse 0.6s ease-in-out';
            cartCount.style.backgroundColor = '#28a745'; // Green for added
            
            setTimeout(() => {
                cartCount.style.animation = '';
                cartCount.style.backgroundColor = '#e53e3e'; // Back to red
            }, 600);
        }

        console.log('🎉 Cart notification shown');
    }

    /**
     * Helper method to show element
     */
    showElement(element) {
        if (element) {
            element.style.display = '';
        }
    }

    /**
     * Helper method to hide element
     */
    hideElement(element) {
        if (element) {
            element.style.display = 'none';
        }
    }

    /**
     * Refresh header data (useful for re-authentication)
     */
    async refresh() {
        await this.loadUserData();
        this.setupNavigation();
        this.setupAdminMenu();
        this.updateCartCount();
        console.log('🔄 Header refreshed');
    }

    /**
     * Update user data and refresh header
     */
    async updateUserData(newUserData) {
        this.userData = newUserData;
        localStorage.setItem('userData', JSON.stringify(newUserData));
        await this.refresh();
    }

    /**
     * Clear user data and refresh header (logout)
     */
    async logout() {
        this.clearAuthData();
        this.cleanupIntervals();
        await this.refresh();
        console.log('👋 User logged out, header updated');
    }

    /**
     * Cleanup intervals and watchers
     */
    cleanupIntervals() {
        if (this.cartWatcherInterval) {
            clearInterval(this.cartWatcherInterval);
            this.cartWatcherInterval = null;
        }
    }

    /**
     * Get current user data
     */
    getCurrentUser() {
        return this.userData;
    }

    /**
     * Check if user is authenticated
     */
    isAuthenticated() {
        return this.userData && this.userData.id && this.userData.is_active === 1;
    }

    /**
     * Check if user is admin
     */
    isAdmin() {
        return this.isAuthenticated() && this.userData.role === 'admin';
    }
}

// Initialize header manager when script loads
let headerManager = null;

// Function to initialize header manager
function initializeHeader() {
    if (!headerManager) {
        headerManager = new HeaderManager();
    }
    return headerManager;
}

// Auto-initialize if DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeHeader);
} else {
    initializeHeader();
}

// Export for global use
window.HeaderManager = HeaderManager;
window.headerManager = headerManager;
window.initializeHeader = initializeHeader;

// Helper function to trigger cart update events
window.triggerCartUpdate = function() {
    if (headerManager) {
        headerManager.updateCartCount();
    }
    window.dispatchEvent(new CustomEvent('cartUpdated'));
};

// Helper function to notify item added to cart
window.notifyItemAddedToCart = function() {
    if (headerManager) {
        // Force immediate update
        setTimeout(() => {
            headerManager.updateCartCount();
            headerManager.showCartNotification();
        }, 10);
    }
    window.dispatchEvent(new CustomEvent('itemAddedToCart'));
};

// Helper function to add item to cart and update immediately
window.addToCartAndNotify = function(item) {
    try {
        // Get current user from header manager
        const user = headerManager ? headerManager.getCurrentUser() : null;
        const cartKey = user && user.id ? `cart_user_${user.id}` : 'cart';
        
        // Get existing cart
        let cart = [];
        try {
            const cartData = localStorage.getItem(cartKey);
            cart = cartData ? JSON.parse(cartData) : [];
        } catch (e) {
            cart = [];
        }
        
        // Add item to cart
        cart.push(item);
        
        // Save cart
        localStorage.setItem(cartKey, JSON.stringify(cart));
        
        // Trigger immediate notification
        window.notifyItemAddedToCart();
        
        console.log('✅ Item added to cart:', item);
        return true;
    } catch (error) {
        console.error('❌ Failed to add item to cart:', error);
        return false;
    }
};

// Helper function to get current user from header
window.getCurrentUser = function() {
    if (headerManager) {
        return headerManager.getCurrentUser();
    }
    return null;
};

// Helper function to check authentication status
window.isUserAuthenticated = function() {
    if (headerManager) {
        return headerManager.isAuthenticated();
    }
    return false;
};

// Helper function to refresh header after login/logout
window.refreshHeader = async function() {
    if (headerManager) {
        await headerManager.refresh();
    }
};

// Helper function to force cart count update
window.forceCartUpdate = function() {
    if (headerManager) {
        headerManager.updateCartCount();
        console.log('🔄 Forced cart update');
    }
};
