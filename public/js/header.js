/**
 * Header Component JavaScript
 * Handles navigation, authentication, admin menus, and cart functionality
 */

class HeaderManager {
    constructor() {
        this.userData = {};
        this.isInitialized = false;
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
    setupHeader() {
        // Check if header elements are available
        const header = document.querySelector('.main-header');
        if (!header) {
            // If header not loaded yet, retry after a short delay
            setTimeout(() => this.setupHeader(), 100);
            return;
        }

        this.setupMobileMenu();
        this.loadUserData();
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
     * Load user data from localStorage
     */
    loadUserData() {
        try {
            this.userData = JSON.parse(localStorage.getItem('userData') || '{}');
        } catch (error) {
            console.warn('⚠️ Failed to parse user data from localStorage:', error);
            this.userData = {};
        }
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
     * Update profile photo
     */
    updateProfilePhoto(photoElement) {
        if (photoElement && this.userData.photo) {
            photoElement.src = this.userData.photo.startsWith('/')
                ? this.userData.photo
                : '/uploads/users/' + this.userData.photo;
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
     * Setup cart functionality
     */
    setupCartFunctionality() {
        this.updateCartCount();
        
        // Listen for storage changes (cart updates from other tabs)
        window.addEventListener('storage', () => {
            this.updateCartCount();
        });

        // Listen for custom cart update events
        window.addEventListener('cartUpdated', () => {
            this.updateCartCount();
        });
    }

    /**
     * Update cart count display
     */
    updateCartCount() {
        const cartCountEl = document.getElementById('cartCount');
        const cartNotificationEl = document.getElementById('cartNotification');
        
        let cart = [];
        try {
            cart = JSON.parse(localStorage.getItem('cart') || '[]');
        } catch (error) {
            console.warn('⚠️ Failed to parse cart data:', error);
            cart = [];
        }

        const count = cart.length;
        
        if (cartCountEl) {
            cartCountEl.textContent = count;
            cartCountEl.style.display = count > 0 ? 'inline-block' : 'none';
        }
        
        if (cartNotificationEl) {
            cartNotificationEl.style.display = count > 0 ? 'inline-block' : 'none';
        }
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
    refresh() {
        this.loadUserData();
        this.setupNavigation();
        this.setupAdminMenu();
        this.updateCartCount();
        console.log('🔄 Header refreshed');
    }

    /**
     * Update user data and refresh header
     */
    updateUserData(newUserData) {
        this.userData = newUserData;
        localStorage.setItem('userData', JSON.stringify(newUserData));
        this.refresh();
    }

    /**
     * Clear user data and refresh header
     */
    logout() {
        this.userData = {};
        localStorage.removeItem('userData');
        this.refresh();
        console.log('👋 User logged out, header updated');
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
