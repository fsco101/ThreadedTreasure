// Profile Management JavaScript
const API_BASE_URL = 'http://localhost:3000/api';

class ProfileManager {
    constructor() {
        this.currentUser = null;
        this.currentSection = 'personal-info';
        this.init();
    }

    init() {
        // Check if user is logged in
        if (!this.isLoggedIn()) {
            window.location.href = '/users/login.html';
            return;
        }

        // Setup event listeners
        this.setupEventListeners();
        
        // Load initial data
        this.loadProfile();
        this.loadOrders();
    }

    isLoggedIn() {
        const token = localStorage.getItem('userToken');
        const userData = localStorage.getItem('userData');
        return !!(token && userData);
    }

    getAuthHeaders() {
        const token = localStorage.getItem('userToken');
        return {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        };
    }

    setupEventListeners() {
        // Navigation
        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const section = link.dataset.section;
                this.showSection(section);
            });
        });

        // Forms
        document.getElementById('personal-info-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.updateProfile();
        });

        document.getElementById('password-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.changePassword();
        });

        document.getElementById('preferences-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.updatePreferences();
        });

        // Password strength checker
        document.getElementById('new_password').addEventListener('input', (e) => {
            this.checkPasswordStrength(e.target.value);
        });

        // Avatar upload
        document.getElementById('avatar-upload').addEventListener('change', (e) => {
            this.handleAvatarUpload(e.target.files[0]);
        });
    }

    showSection(sectionName) {
        // Update navigation
        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.remove('active');
        });
        document.querySelector(`[data-section="${sectionName}"]`).classList.add('active');

        // Update content
        document.querySelectorAll('.profile-section').forEach(section => {
            section.classList.add('hidden');
        });
        document.getElementById(sectionName).classList.remove('hidden');

        this.currentSection = sectionName;

        // Load section-specific data
        if (sectionName === 'orders') {
            this.loadOrders();
        } else if (sectionName === 'addresses') {
            this.loadAddresses();
        }
    }

    async loadProfile() {
        try {
            const response = await fetch(`${API_BASE_URL}/users/profile`, {
                headers: this.getAuthHeaders()
            });

            if (response.status === 401) {
                this.handleAuthError();
                return;
            }

            const data = await response.json();
            
            if (data.success) {
                this.currentUser = data.data;
                this.populateProfile(data.data);
            } else {
                this.showAlert('profile-alerts', data.message || 'Failed to load profile', 'error');
            }
        } catch (error) {
            console.error('Error loading profile:', error);
            this.showAlert('profile-alerts', 'Network error occurred', 'error');
        }
    }

    populateProfile(user) {
        // Header information
        document.getElementById('profile-name').textContent = user.name || 'User';
        document.getElementById('profile-email').textContent = user.email || 'email@example.com';

        // Member since
        if (user.created_at) {
            const memberSince = new Date(user.created_at).getFullYear();
            document.getElementById('member-since').textContent = memberSince;
        }

        // Form fields
        document.getElementById('name').value = user.name || '';
        document.getElementById('email').value = user.email || '';
        document.getElementById('phone').value = user.phone || '';
        document.getElementById('address').value = user.address || '';

        // Avatar
        if (user.profile_photo) {
            const avatarUrl = user.profile_photo.startsWith('/') ? user.profile_photo : `/uploads/${user.profile_photo}`;
            document.getElementById('profile-avatar').innerHTML = `
                <img src="${avatarUrl}" alt="Profile Avatar">
                <input type="file" id="avatar-upload" accept="image/*" style="display: none;">
                <div class="avatar-upload" onclick="document.getElementById('avatar-upload').click()">
                    <i class="fas fa-camera"></i>
                </div>
            `;
        }
    }

    async updateProfile() {
        const formData = new FormData(document.getElementById('personal-info-form'));
        let profileData = Object.fromEntries(formData.entries());
        // Only keep fields that exist in the DB: name, email, phone, address
        const allowedFields = ['name', 'email', 'phone', 'address'];
        Object.keys(profileData).forEach(key => {
            if (!allowedFields.includes(key)) {
                delete profileData[key];
            } else if (profileData[key] === '' || typeof profileData[key] === 'undefined') {
                profileData[key] = null;
            }
        });

        try {
            const response = await fetch(`${API_BASE_URL}/users/profile`, {
                method: 'PUT',
                headers: this.getAuthHeaders(),
                body: JSON.stringify(profileData)
            });

            const data = await response.json();
            
            if (data.success) {
                this.showAlert('profile-alerts', 'Profile updated successfully!', 'success');
                this.currentUser = data.data;
                this.populateProfile(data.data);
                // Update localStorage
                localStorage.setItem('userData', JSON.stringify(data.data));
            } else {
                this.showAlert('profile-alerts', data.message || 'Failed to update profile', 'error');
            }
        } catch (error) {
            console.error('Error updating profile:', error);
            this.showAlert('profile-alerts', 'Network error occurred', 'error');
        }
    }

    async changePassword() {
        const formData = new FormData(document.getElementById('password-form'));
        const passwordData = Object.fromEntries(formData.entries());

        // Validate passwords match
        if (passwordData.new_password !== passwordData.confirm_password) {
            this.showAlert('security-alerts', 'New passwords do not match', 'error');
            return;
        }

        // Validate password strength
        const strength = this.calculatePasswordStrength(passwordData.new_password);
        if (strength < 3) {
            this.showAlert('security-alerts', 'Password is too weak. Please choose a stronger password.', 'error');
            return;
        }

        try {
            const response = await fetch(`${API_BASE_URL}/users/change-password`, {
                method: 'PUT',
                headers: this.getAuthHeaders(),
                body: JSON.stringify({
                    currentPassword: passwordData.current_password,
                    newPassword: passwordData.new_password
                })
            });

            const data = await response.json();
            
            if (data.success) {
                this.showAlert('security-alerts', 'Password changed successfully!', 'success');
                document.getElementById('password-form').reset();
                document.getElementById('password-strength').className = 'password-strength';
            } else {
                this.showAlert('security-alerts', data.message || 'Failed to change password', 'error');
            }
        } catch (error) {
            console.error('Error changing password:', error);
            this.showAlert('security-alerts', 'Network error occurred', 'error');
        }
    }

    checkPasswordStrength(password) {
        const strength = this.calculatePasswordStrength(password);
        const strengthBar = document.getElementById('password-strength');
        
        strengthBar.className = 'password-strength';
        
        if (password.length === 0) return;
        
        if (strength === 1) {
            strengthBar.classList.add('strength-weak');
        } else if (strength === 2) {
            strengthBar.classList.add('strength-fair');
        } else if (strength === 3) {
            strengthBar.classList.add('strength-good');
        } else {
            strengthBar.classList.add('strength-strong');
        }
    }

    calculatePasswordStrength(password) {
        let strength = 0;
        
        if (password.length >= 8) strength++;
        if (password.match(/[a-z]/)) strength++;
        if (password.match(/[A-Z]/)) strength++;
        if (password.match(/[0-9]/)) strength++;
        if (password.match(/[^a-zA-Z0-9]/)) strength++;
        
        return strength;
    }

    async loadOrders() {
        const ordersLoading = document.getElementById('orders-loading');
        const ordersList = document.getElementById('orders-list');
        
        ordersLoading.classList.remove('hidden');
        ordersList.innerHTML = '';

        try {
            const response = await fetch(`${API_BASE_URL}/orders`, {
                headers: this.getAuthHeaders()
            });

            if (response.status === 401) {
                this.handleAuthError();
                return;
            }

            const data = await response.json();
            
            if (data.success) {
                this.displayOrders(data.data);
                
                // Update stats
                document.getElementById('total-orders').textContent = data.data.length;
                const totalSpent = data.data.reduce((sum, order) => sum + parseFloat(order.total_amount), 0);
                document.getElementById('total-spent').textContent = `$${totalSpent.toFixed(2)}`;
            } else {
                ordersList.innerHTML = '<p>No orders found.</p>';
            }
        } catch (error) {
            console.error('Error loading orders:', error);
            ordersList.innerHTML = '<p>Failed to load orders.</p>';
        } finally {
            ordersLoading.classList.add('hidden');
        }
    }

    displayOrders(orders) {
        const ordersList = document.getElementById('orders-list');
        
        if (orders.length === 0) {
            ordersList.innerHTML = `
                <div style="text-align: center; padding: 3rem; color: var(--text-light);">
                    <i class="fas fa-shopping-bag" style="font-size: 3rem; margin-bottom: 1rem; opacity: 0.5;"></i>
                    <p>You haven't placed any orders yet.</p>
                    <a href="/shop.html" class="btn btn-primary" style="margin-top: 1rem;">Start Shopping</a>
                </div>
            `;
            return;
        }

        const ordersHtml = orders.map(order => `
            <div class="order-card">
                <div class="order-header">
                    <div class="order-id">Order #${order.id}</div>
                    <div class="order-status status-${order.status}">${this.formatStatus(order.status)}</div>
                </div>
                <div class="order-details">
                    <div>
                        <strong>Date:</strong> ${this.formatDate(order.created_at)}<br>
                        <strong>Items:</strong> ${order.item_count || 'N/A'} item(s)
                    </div>
                    <div>
                        <strong>Total:</strong> $${parseFloat(order.total_amount).toFixed(2)}
                    </div>
                    <div>
                        <a href="/order-details.html?id=${order.id}" class="btn btn-secondary" style="padding: 0.5rem 1rem; font-size: 0.9rem;">
                            View Details
                        </a>
                    </div>
                </div>
            </div>
        `).join('');
        
        ordersList.innerHTML = ordersHtml;
    }

    async loadAddresses() {
        // This would load user addresses - placeholder for now
        const addressesList = document.getElementById('addresses-list');
        addressesList.innerHTML = `
            <div style="text-align: center; padding: 3rem; color: var(--text-light);">
                <i class="fas fa-map-marker-alt" style="font-size: 3rem; margin-bottom: 1rem; opacity: 0.5;"></i>
                <p>Address management feature coming soon!</p>
            </div>
        `;
    }

    async updatePreferences() {
        const formData = new FormData(document.getElementById('preferences-form'));
        const preferences = Object.fromEntries(formData.entries());
        
        // Convert checkboxes to boolean
        preferences.email_orders = document.getElementById('email_orders').checked;
        preferences.email_promotions = document.getElementById('email_promotions').checked;
        preferences.email_newsletter = document.getElementById('email_newsletter').checked;

        try {
            // This would save preferences to backend - placeholder for now
            console.log('Saving preferences:', preferences);
            this.showAlert('profile-alerts', 'Preferences saved successfully!', 'success');
        } catch (error) {
            console.error('Error updating preferences:', error);
        }
    }

    async handleAvatarUpload(file) {
        if (!file) return;

        // Validate file type and size
        if (!file.type.startsWith('image/')) {
            this.showAlert('profile-alerts', 'Please select a valid image file', 'error');
            return;
        }

        if (file.size > 5 * 1024 * 1024) { // 5MB limit
            this.showAlert('profile-alerts', 'Image file size should not exceed 5MB', 'error');
            return;
        }

        const formData = new FormData();
        formData.append('avatar', file);

        try {
            const response = await fetch(`${API_BASE_URL}/users/avatar`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('userToken')}`
                },
                body: formData
            });

            const data = await response.json();
            
            if (data.success) {
                this.showAlert('profile-alerts', 'Avatar updated successfully!', 'success');
                // Update avatar display
                document.getElementById('profile-avatar').innerHTML = `
                    <img src="${data.data.avatar}" alt="Profile Avatar">
                    <input type="file" id="avatar-upload" accept="image/*" style="display: none;">
                    <div class="avatar-upload" onclick="document.getElementById('avatar-upload').click()">
                        <i class="fas fa-camera"></i>
                    </div>
                `;
            } else {
                this.showAlert('profile-alerts', data.message || 'Failed to update avatar', 'error');
            }
        } catch (error) {
            console.error('Error uploading avatar:', error);
            this.showAlert('profile-alerts', 'Network error occurred', 'error');
        }
    }

    showAlert(containerId, message, type) {
        const container = document.getElementById(containerId);
        const alertDiv = document.createElement('div');
        alertDiv.className = `alert alert-${type}`;
        alertDiv.innerHTML = `
            <i class="fas fa-${type === 'success' ? 'check-circle' : 'exclamation-circle'}"></i>
            ${message}
        `;
        
        container.innerHTML = '';
        container.appendChild(alertDiv);
        
        // Auto-remove after 5 seconds
        setTimeout(() => {
            alertDiv.remove();
        }, 5000);
    }

    formatStatus(status) {
        return status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' ');
    }

    formatDate(dateString) {
        const options = { 
            year: 'numeric', 
            month: 'short', 
            day: 'numeric' 
        };
        return new Date(dateString).toLocaleDateString('en-US', options);
    }

    handleAuthError() {
        localStorage.removeItem('userToken');
        localStorage.removeItem('userData');
        window.location.href = '/users/login.html';
    }

    confirmDeleteAccount() {
        if (confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
            if (confirm('This will permanently delete all your data. Are you absolutely sure?')) {
                this.deleteAccount();
            }
        }
    }

    async deleteAccount() {
        try {
            const response = await fetch(`${API_BASE_URL}/users/profile`, {
                method: 'DELETE',
                headers: this.getAuthHeaders()
            });

            const data = await response.json();
            
            if (data.success) {
                alert('Your account has been deleted successfully.');
                localStorage.removeItem('userToken');
                localStorage.removeItem('userData');
                window.location.href = '/';
            } else {
                alert(data.message || 'Failed to delete account');
            }
        } catch (error) {
            console.error('Error deleting account:', error);
            alert('Network error occurred');
        }
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new ProfileManager();
});

// Helper functions for other components
window.showAddAddressForm = function() {
    alert('Add address functionality coming soon!');
};
