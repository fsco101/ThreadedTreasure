// Global Authentication Utility
// Use this across all admin files for consistent authentication

class AdminAuth {
    constructor() {
        this.tokenKey = 'userToken';
        this.userDataKey = 'userData';
    }

    // Check if user is authenticated and is admin
    checkAuth() {
        const token = this.getToken();
        const userData = this.getUserData();
        
        if (!token || !userData) {
            console.log('⚠️ No token or user data found');
            return false;
        }
        
        try {
            const user = JSON.parse(userData);
            if (user.role !== 'admin') {
                console.log('⚠️ User is not admin:', user.role);
                return false;
            }
            console.log('✅ Admin authentication verified');
            return true;
        } catch (error) {
            console.error('Error parsing user data:', error);
            return false;
        }
    }

    // Get authentication token
    getToken() {
        return localStorage.getItem(this.tokenKey);
    }

    // Get user data
    getUserData() {
        return localStorage.getItem(this.userDataKey);
    }

    // Get parsed user object
    getUser() {
        const userData = this.getUserData();
        if (userData) {
            try {
                return JSON.parse(userData);
            } catch (error) {
                console.error('Error parsing user data:', error);
                return null;
            }
        }
        return null;
    }

    // Get authorization headers for API calls
    getAuthHeaders() {
        const token = this.getToken();
        return {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        };
    }

    // Redirect to login page
    redirectToLogin() {
        window.location.href = 'users/login.html';
    }

    // Logout function
    logout() {
        localStorage.removeItem(this.tokenKey);
        localStorage.removeItem(this.userDataKey);
        localStorage.removeItem('adminSettings');
        sessionStorage.clear();
        window.location.href = 'users/logout.html';
    }

    // Initialize admin interface (set user name, etc.)
    initAdminInterface() {
        const user = this.getUser();
        if (user) {
            // Update admin name in various elements
            const adminNameElements = document.querySelectorAll('#admin-name, .admin-name, [data-admin-name]');
            adminNameElements.forEach(element => {
                if (element) element.textContent = user.name;
            });
            
            const adminEmailElements = document.querySelectorAll('#admin-email, .admin-email, [data-admin-email]');
            adminEmailElements.forEach(element => {
                if (element) element.textContent = user.email;
            });
        }
    }

    // Make authenticated API call
    async apiCall(url, method = 'GET', data = null) {
        const options = {
            method: method,
            headers: this.getAuthHeaders()
        };

        if (data && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
            options.body = JSON.stringify(data);
        }

        try {
            const response = await fetch(url, options);
            
            if (response.status === 401) {
                // Token expired or invalid
                this.logout();
                return null;
            }
            
            return response;
        } catch (error) {
            console.error('API call error:', error);
            throw error;
        }
    }

    // jQuery AJAX setup with authentication
    setupJQueryAuth() {
        const self = this;
        
        // Set default headers for all jQuery AJAX calls
        $.ajaxSetup({
            beforeSend: function(xhr) {
                const token = self.getToken();
                if (token) {
                    xhr.setRequestHeader('Authorization', `Bearer ${token}`);
                }
            },
            error: function(xhr, status, error) {
                if (xhr.status === 401) {
                    self.logout();
                }
            }
        });
    }
}

// Create global instance
window.adminAuth = new AdminAuth();

// Global functions for backward compatibility
function checkAuth() {
    return window.adminAuth.checkAuth();
}

function getAuthToken() {
    return window.adminAuth.getToken();
}

function logout() {
    window.adminAuth.logout();
}

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', function() {
    if (window.adminAuth) {
        window.adminAuth.setupJQueryAuth();
    }
});
