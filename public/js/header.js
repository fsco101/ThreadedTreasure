// Header JavaScript for ThreadedTreasure
// Handles authentication, user dropdowns, admin functionality, and cart count updates

class HeaderAuth {
    constructor() {
        this.isInitialized = false;
        this.init();
    }

    init() {
        console.log('🚀 Initializing HeaderAuth...');
        
        // Wait for DOM to be fully loaded before proceeding
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                this.performInit();
            });
        } else {
            this.performInit();
        }
    }

    performInit() {
        try {
            this.checkAuthStatus();
            this.updateCartCount();
            this.setupMobileMenu();
            this.setupDropdowns();
            this.setupEventListeners();
            
            // Listen for storage changes
            window.addEventListener('storage', (e) => {
                console.log('🔄 Storage changed, rechecking auth...', e.key);
                if (e.key === 'userToken' || e.key === 'userData' || e.key?.startsWith('cart_')) {
                    this.checkAuthStatus();
                    this.updateCartCount();
                }
            });

            // Expose refresh method globally for debugging
            window.refreshHeaderAuth = () => {
                console.log('🔄 Manual auth refresh triggered');
                this.checkAuthStatus();
                this.updateCartCount();
            };

            // Set initialized flag
            this.isInitialized = true;
            console.log('✅ HeaderAuth initialized successfully');
        } catch (error) {
            console.error('❌ Error initializing HeaderAuth:', error);
        }
    }

    setupEventListeners() {
        // Listen for cart updates from other components
        window.addEventListener('cartUpdated', () => {
            console.log('🛒 Cart update event received');
            this.updateCartCount();
        });

        // Listen for auth changes from other components
        window.addEventListener('authChanged', () => {
            console.log('🔄 Auth change event received');
            this.checkAuthStatus();
        });

        // Listen for login success events
        window.addEventListener('loginSuccess', (event) => {
            console.log('✅ Login success event received', event.detail);
            setTimeout(() => {
                this.checkAuthStatus();
                this.updateCartCount();
            }, 100); // Small delay to ensure localStorage is updated
        });

        // Listen for logout events
        window.addEventListener('logoutSuccess', () => {
            console.log('👋 Logout success event received');
            this.cleanupInvalidAuth();
            this.showUnauthenticatedState();
            this.updateCartCount();
        });
    }

    checkAuthStatus() {
        console.log('🔍 Checking authentication status...');
        
        const token = localStorage.getItem('userToken');
        const userData = localStorage.getItem('userData');
        
        console.log('Token found:', !!token);
        console.log('UserData found:', !!userData);
        
        // Check if both token and userData exist and are valid
        if (token && userData && token !== 'null' && userData !== 'null' && token.trim() !== '' && userData.trim() !== '') {
            try {
                const user = JSON.parse(userData);
                if (user && typeof user === 'object' && (user.id || user.email)) {
                    console.log('✅ User authenticated:', user.name || user.email);
                    this.showAuthenticatedState(user);
                } else {
                    console.log('❌ Invalid user object structure');
                    this.cleanupInvalidAuth();
                    this.showUnauthenticatedState();
                }
            } catch (error) {
                console.error('❌ Error parsing user data:', error);
                this.cleanupInvalidAuth();
                this.showUnauthenticatedState();
            }
        } else {
            console.log('👤 No valid authentication found');
            this.cleanupInvalidAuth();
            this.showUnauthenticatedState();
        }
    }

    cleanupInvalidAuth() {
        // Clean up any invalid tokens
        localStorage.removeItem('userToken');
        localStorage.removeItem('userData');
    }

    showUnauthenticatedState() {
        console.log('👤 Showing unauthenticated state');
        // Hide all nav links for unauthenticated users
        document.querySelectorAll('.nav-links li').forEach(li => li.style.display = 'none');
        
        // Show only home navigation
        const homeElement = document.querySelector('.nav-home');
        if (homeElement) homeElement.style.display = '';
        
        // Hide user dropdown and admin dropdown
        const userDropdown = document.querySelector('.nav-user-dropdown');
        const adminDropdown = document.querySelector('.nav-admin-dropdown');
        const profileLink = document.querySelector('.nav-profile');
        const logoutLink = document.querySelector('.nav-logout');
        
        if (userDropdown) userDropdown.style.display = 'none';
        if (adminDropdown) adminDropdown.style.display = 'none';
        if (profileLink) profileLink.style.display = 'none';
        if (logoutLink) logoutLink.style.display = 'none';
        
        // Show cart in header actions (not in nav-links)
        const headerActions = document.querySelector('.header-actions');
        if (headerActions) headerActions.style.display = 'flex';
        
        if (typeof window.refreshUserContext === 'function') window.refreshUserContext();
    }

    showAuthenticatedState(user) {
        console.log('🔐 Showing authenticated state for:', user.name || user.email);
        // Hide all nav links first
        document.querySelectorAll('.nav-links li').forEach(li => li.style.display = 'none');
        
        // Show common user links with null checks
        const navElements = {
            home: document.querySelector('.nav-home'),
            userDropdown: document.querySelector('.nav-user-dropdown'),
            adminDropdown: document.querySelector('.nav-admin-dropdown'),
            profile: document.querySelector('.nav-profile'),
            logout: document.querySelector('.nav-logout')
        };
        
        // Always show these for authenticated users
        if (navElements.home) navElements.home.style.display = '';
        if (navElements.userDropdown) navElements.userDropdown.style.display = '';
        if (navElements.profile) navElements.profile.style.display = '';
        if (navElements.logout) navElements.logout.style.display = '';

        // Show admin dropdown only for admin users
        const isAdmin = user.role === 'admin' || user.is_admin === 1 || user.is_admin === '1' || user.is_admin === true;
        if (navElements.adminDropdown) {
            if (isAdmin) {
                navElements.adminDropdown.style.display = '';
                console.log('✅ Admin dropdown shown');
            } else {
                navElements.adminDropdown.style.display = 'none';
                console.log('✅ Admin dropdown hidden for customer');
            }
        }

        // Always show cart in header actions
        const headerActions = document.querySelector('.header-actions');
        if (headerActions) headerActions.style.display = 'flex';

        // Update user info in dropdown
        this.updateUserInfo(user);
        if (typeof window.refreshUserContext === 'function') window.refreshUserContext();
    }

    updateUserInfo(user) {
        // Update user name and email in the header dropdown
        const userElements = {
            headerUserName: document.getElementById('header-user-name'),
            headerUserEmail: document.getElementById('header-user-email'),
            dropdownUserName: document.getElementById('dropdown-user-name'),
            dropdownUserEmail: document.getElementById('dropdown-user-email'),
            headerUserAvatar: document.getElementById('header-user-avatar'),
            dropdownUserAvatar: document.getElementById('dropdown-user-avatar')
        };
        
        const displayName = user.name || user.first_name || 'User';
        const displayEmail = user.email || 'user@example.com';
        
        // Update header user info
        if (userElements.headerUserName) userElements.headerUserName.textContent = displayName;
        if (userElements.headerUserEmail) userElements.headerUserEmail.textContent = displayEmail;
        if (userElements.dropdownUserName) userElements.dropdownUserName.textContent = displayName;
        if (userElements.dropdownUserEmail) userElements.dropdownUserEmail.textContent = displayEmail;
        
        // Update avatar if available
        if (user.profile_photo || user.avatar) {
            const photoField = user.profile_photo || user.avatar;
            let avatarUrl;
            
            if (photoField.startsWith('http://') || photoField.startsWith('https://')) {
                avatarUrl = photoField;
            } else if (photoField.startsWith('/uploads/')) {
                avatarUrl = photoField;
            } else if (photoField.startsWith('users/')) {
                avatarUrl = `/uploads/${photoField.replace('users/', '')}`;
            } else {
                avatarUrl = `/uploads/${photoField}`;
            }
            
            // Update header avatar
            if (userElements.headerUserAvatar) {
                userElements.headerUserAvatar.innerHTML = `<img src="${avatarUrl}" alt="Profile" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%;" onerror="this.parentElement.innerHTML='<i class=\\"fas fa-user\\"></i>';">`;
            }
            
            // Update dropdown avatar
            if (userElements.dropdownUserAvatar) {
                userElements.dropdownUserAvatar.innerHTML = `<img src="${avatarUrl}" alt="Profile" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%;" onerror="this.parentElement.innerHTML='<i class=\\"fas fa-user\\"></i>';">`;
            }
        } else {
            // Reset to default avatar icon if no profile photo
            if (userElements.headerUserAvatar) {
                userElements.headerUserAvatar.innerHTML = '<i class="fas fa-user"></i>';
            }
            if (userElements.dropdownUserAvatar) {
                userElements.dropdownUserAvatar.innerHTML = '<i class="fas fa-user"></i>';
            }
        }
    }

    updateCartCount() {
        try {
            // Get current user to determine cart key
            const token = localStorage.getItem('userToken');
            const userData = localStorage.getItem('userData');
            
            let cartKey = null;
            let totalItems = 0;
            
            if (token && userData && token !== 'null' && userData !== 'null') {
                try {
                    const user = JSON.parse(userData);
                    if (user && user.id) {
                        cartKey = `cart_user_${user.id}`;
                        const cartData = localStorage.getItem(cartKey);
                        const cart = cartData ? JSON.parse(cartData) : [];
                        totalItems = Array.isArray(cart) ? cart.reduce((sum, item) => sum + (parseInt(item.quantity) || 0), 0) : 0;
                    }
                } catch (error) {
                    console.error('Error parsing user data in header:', error);
                    totalItems = 0;
                }
            }
            
            const cartCounts = document.querySelectorAll('.cart-count');
            cartCounts.forEach(count => {
                if (count) {
                    count.textContent = totalItems;
                    count.style.display = totalItems > 0 ? 'block' : 'none';
                }
            });
            
            console.log(`Header: Updated cart count for ${cartKey || 'no cart'}: ${totalItems}`);
            
            // Dispatch cart count updated event for other components
            window.dispatchEvent(new CustomEvent('cartCountUpdated', { 
                detail: { count: totalItems, cartKey } 
            }));
            
        } catch (error) {
            console.error('Error updating cart count:', error);
            // Set cart count to 0 on error
            const cartCounts = document.querySelectorAll('.cart-count');
            cartCounts.forEach(count => {
                if (count) {
                    count.textContent = '0';
                    count.style.display = 'none';
                }
            });
        }
    }

    setupMobileMenu() {
        // Create mobile menu toggle
        const headerContent = document.querySelector('.header-content');
        const nav = document.querySelector('.main-nav');
        
        if (headerContent && nav && !document.querySelector('.mobile-menu-toggle')) {
            const toggle = document.createElement('button');
            toggle.className = 'mobile-menu-toggle';
            toggle.innerHTML = '<i class="fas fa-bars"></i>';
            toggle.setAttribute('aria-label', 'Toggle mobile menu');
            
            toggle.addEventListener('click', (e) => {
                e.preventDefault();
                nav.classList.toggle('active');
                
                // Update icon
                const icon = toggle.querySelector('i');
                if (nav.classList.contains('active')) {
                    icon.className = 'fas fa-times';
                } else {
                    icon.className = 'fas fa-bars';
                }
            });
            
            // Insert before header actions
            const headerActions = document.querySelector('.header-actions');
            headerContent.insertBefore(toggle, headerActions);
        }
        
        // Close mobile menu when clicking nav links
        const navLinks = document.querySelectorAll('.nav-links a');
        navLinks.forEach(link => {
            link.addEventListener('click', () => {
                if (nav) nav.classList.remove('active');
                const toggle = document.querySelector('.mobile-menu-toggle i');
                if (toggle) toggle.className = 'fas fa-bars';
            });
        });
    }

    setupDropdowns() {
        try {
            // Admin dropdown functionality
            this.setupAdminDropdown();
            
            // User dropdown functionality
            this.setupUserDropdown();
            
            // Generic dropdown functionality
            this.setupGenericDropdowns();
            
            // Close dropdowns when clicking outside
            document.addEventListener('click', this.handleOutsideClick.bind(this));
        } catch (error) {
            console.error('Error setting up dropdowns:', error);
        }
    }

    setupAdminDropdown() {
        const adminDropdownToggle = document.querySelector('.admin-dropdown-toggle');
        const adminDropdownMenu = document.querySelector('.admin-dropdown-menu');
        
        if (adminDropdownToggle && adminDropdownMenu) {
            // Remove existing listeners
            adminDropdownToggle.removeEventListener('click', this.handleAdminDropdownToggle);
            
            // Add new listener
            adminDropdownToggle.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                
                // Close other dropdowns
                document.querySelectorAll('.dropdown-menu:not(.admin-dropdown-menu)').forEach(menu => {
                    menu.classList.remove('show');
                });
                
                // Toggle admin dropdown
                adminDropdownMenu.classList.toggle('show');
                
                console.log('🔧 Admin dropdown toggled:', adminDropdownMenu.classList.contains('show'));
            });
        }
    }

    setupUserDropdown() {
        const userDropdownToggle = document.querySelector('.user-dropdown-toggle');
        const userDropdownMenu = document.querySelector('.user-dropdown-menu');
        
        if (userDropdownToggle && userDropdownMenu) {
            // Remove existing listeners
            userDropdownToggle.removeEventListener('click', this.handleUserDropdownToggle);
            
            // Add new listener
            userDropdownToggle.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                
                // Close other dropdowns
                document.querySelectorAll('.dropdown-menu:not(.user-dropdown-menu)').forEach(menu => {
                    menu.classList.remove('show');
                });
                
                // Toggle user dropdown
                userDropdownMenu.classList.toggle('show');
                
                console.log('👤 User dropdown toggled:', userDropdownMenu.classList.contains('show'));
            });
        }
    }

    setupGenericDropdowns() {
        // Handle any other dropdowns that might exist
        const dropdownToggles = document.querySelectorAll('.dropdown-toggle:not(.admin-dropdown-toggle):not(.user-dropdown-toggle)');
        
        dropdownToggles.forEach(toggle => {
            toggle.addEventListener('click', this.handleGenericDropdownToggle.bind(this));
        });
    }

    handleGenericDropdownToggle(e) {
        e.preventDefault();
        e.stopPropagation();
        
        const dropdown = e.target.closest('.dropdown');
        const menu = dropdown?.querySelector('.dropdown-menu');
        
        if (!menu) return;
        
        // Close other dropdowns
        document.querySelectorAll('.dropdown-menu').forEach(otherMenu => {
            if (otherMenu !== menu) {
                otherMenu.classList.remove('show');
            }
        });
        
        // Toggle current dropdown
        menu.classList.toggle('show');
    }

    handleOutsideClick(e) {
        if (!e.target.closest('.dropdown')) {
            document.querySelectorAll('.dropdown-menu').forEach(menu => {
                menu.classList.remove('show');
            });
        }
    }

    // Public API methods for external use
    refreshAuth() {
        this.checkAuthStatus();
        this.updateCartCount();
    }

    refreshCartCount() {
        this.updateCartCount();
    }

    getCurrentUser() {
        try {
            const userData = localStorage.getItem('userData');
            if (userData && userData !== 'null') {
                return JSON.parse(userData);
            }
        } catch (error) {
            console.error('Error getting current user:', error);
        }
        return null;
    }

    isUserAuthenticated() {
        const token = localStorage.getItem('userToken');
        const userData = localStorage.getItem('userData');
        return !!(token && userData && token !== 'null' && userData !== 'null');
    }

    isUserAdmin() {
        const user = this.getCurrentUser();
        return user && (user.role === 'admin' || user.is_admin === 1 || user.is_admin === '1' || user.is_admin === true);
    }

    // Debug method to check current authentication state
    debugAuthState() {
        console.log('=== HEADER AUTH DEBUG ===');
        console.log('Token:', localStorage.getItem('userToken'));
        console.log('UserData:', localStorage.getItem('userData'));
        
        const user = this.getCurrentUser();
        console.log('Parsed User:', user);
        console.log('Is Authenticated:', this.isUserAuthenticated());
        console.log('Is Admin:', this.isUserAdmin());
        
        // Check element visibility
        const elements = {
            home: document.querySelector('.nav-home'),
            profile: document.querySelector('.nav-profile'),
            logout: document.querySelector('.nav-logout'),
            userDropdown: document.querySelector('.nav-user-dropdown'),
            adminDropdown: document.querySelector('.nav-admin-dropdown'),
            headerActions: document.querySelector('.header-actions')
        };
        
        console.log('Element Visibility:');
        Object.keys(elements).forEach(key => {
            const element = elements[key];
            if (element) {
                console.log(`  ${key}: ${element.style.display !== 'none' ? 'visible' : 'hidden'}`);
            } else {
                console.log(`  ${key}: element not found`);
            }
        });
        console.log('========================');
    }
}

// Global header auth instance
let headerAuth;

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    console.log('🎯 DOM loaded, initializing header auth...');
    headerAuth = new HeaderAuth();
    
    // Make it globally available
    window.headerAuth = headerAuth;
});

// Periodic check for authentication state (fallback)
setInterval(() => {
    if (headerAuth && headerAuth.isInitialized) {
        try {
            const token = localStorage.getItem('userToken');
            const userData = localStorage.getItem('userData');
            
            // Check if there are any user action elements to determine current display state
            const userDropdown = document.querySelector('.nav-user-dropdown');
            const homeNav = document.querySelector('.nav-home');
            
            if (!userDropdown && !homeNav) return; // Skip if elements don't exist
            
            const isCurrentlyShowingAuth = userDropdown && userDropdown.style.display !== 'none';
            const hasValidAuth = !!(token && userData && token !== 'null' && userData !== 'null' && token.trim() !== '' && userData.trim() !== '');
            
            // Only refresh if state mismatch detected
            if (isCurrentlyShowingAuth !== hasValidAuth) {
                console.log('🔄 State mismatch detected, refreshing auth...');
                headerAuth.checkAuthStatus();
            }
        } catch (error) {
            console.error('Error in periodic auth check:', error);
        }
    }
}, 5000); // Check every 5 seconds

// Export for module use if needed
if (typeof module !== 'undefined' && module.exports) {
    module.exports = HeaderAuth;
}

// Global utility functions for backward compatibility
window.refreshHeaderAuth = () => {
    if (headerAuth) {
        headerAuth.refreshAuth();
    }
};

window.updateHeaderCartCount = () => {
    if (headerAuth) {
        headerAuth.refreshCartCount();
    }
};

// Debug function for troubleshooting
window.debugHeaderAuth = () => {
    if (headerAuth) {
        headerAuth.debugAuthState();
    } else {
        console.log('HeaderAuth not initialized yet');
    }
};
