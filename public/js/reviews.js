// Review System for ThreadedTreasure
// Handles product reviews, ratings, and user interactions

class ReviewManager {
    constructor() {
        this.apiBase = 'http://localhost:3000/api';
        this.currentProductId = null;
        this.currentUser = null;
        this.userHasPurchased = false;
    }

    async initializeReviews(productId) {
        console.log('🔍 Initializing reviews for product:', productId);
        this.currentProductId = productId;
        
        // Get current user
        this.currentUser = this.getCurrentUser();
        console.log('Current user:', this.currentUser);
        
        // Check if user has purchased this product
        if (this.currentUser && this.currentUser.id && this.currentUser.is_active === 1) {
            this.userHasPurchased = await this.checkUserPurchase(productId);
            console.log('User has purchased product:', this.userHasPurchased);
        }
        
        // Load and display reviews
        await this.loadReviews(productId);
    }

    getCurrentUser() {
        try {
            const userData = localStorage.getItem('userData');
            if (!userData) return null;
            
            const user = JSON.parse(userData);
            return user && user.id && user.is_active === 1 ? user : null;
        } catch (error) {
            console.error('Error getting current user:', error);
            return null;
        }
    }

    async checkUserPurchase(productId) {
        if (!this.currentUser || !this.currentUser.id) return false;
        
        try {
            const token = localStorage.getItem('userToken');
            const response = await fetch(`${this.apiBase}/orders/user/${this.currentUser.id}/check-purchase/${productId}`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            
            if (response.ok) {
                const result = await response.json();
                return result.hasPurchased || false;
            }
        } catch (error) {
            console.error('Error checking user purchase:', error);
        }
        
        return false;
    }

    async loadReviews(productId) {
        try {
            console.log('📝 Loading reviews for product:', productId);
            
            // Fetch reviews
            const response = await fetch(`${this.apiBase}/reviews/product/${productId}`);
            if (!response.ok) {
                throw new Error(`Failed to fetch reviews: ${response.status}`);
            }
            
            const result = await response.json();
            console.log('Reviews response:', result);
            
            if (result.success) {
                this.renderReviews(result.data || []);
            } else {
                throw new Error(result.message || 'Failed to load reviews');
            }
        } catch (error) {
            console.error('Error loading reviews:', error);
            this.renderError('Failed to load reviews');
        }
    }

    renderReviews(reviews) {
        const container = document.getElementById('productReviews');
        if (!container) {
            console.error('Reviews container not found');
            return;
        }

        // Calculate review statistics
        const stats = this.calculateReviewStats(reviews);
        
        container.innerHTML = `
            <div class="reviews-section">
                <div class="reviews-header">
                    <h3>Customer Reviews</h3>
                    <p class="text-muted">${reviews.length} review${reviews.length !== 1 ? 's' : ''}</p>
                </div>

                ${this.renderReviewStats(stats, reviews.length)}
                ${this.renderReviewForm()}
                ${this.renderReviewsList(reviews)}
            </div>
        `;

        // Attach event listeners
        this.attachEventListeners();
    }

    calculateReviewStats(reviews) {
        if (reviews.length === 0) {
            return {
                averageRating: 0,
                distribution: [0, 0, 0, 0, 0]
            };
        }

        const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0);
        const averageRating = totalRating / reviews.length;
        
        // Count ratings for each star level (1-5)
        const distribution = [0, 0, 0, 0, 0];
        reviews.forEach(review => {
            if (review.rating >= 1 && review.rating <= 5) {
                distribution[review.rating - 1]++;
            }
        });

        return { averageRating, distribution };
    }

    renderReviewStats(stats, totalReviews) {
        if (totalReviews === 0) {
            return `
                <div class="review-stats">
                    <div class="overall-rating">
                        <div class="rating-display">
                            <div class="rating-number">0.0</div>
                            <div class="stars">
                                ${this.renderStars(0)}
                            </div>
                        </div>
                        <div class="review-count">No reviews yet</div>
                    </div>
                </div>
            `;
        }

        return `
            <div class="review-stats">
                <div class="overall-rating">
                    <div class="rating-display">
                        <div class="rating-number">${stats.averageRating.toFixed(1)}</div>
                        <div class="stars">
                            ${this.renderStars(stats.averageRating)}
                        </div>
                    </div>
                    <div class="review-count">${totalReviews} review${totalReviews !== 1 ? 's' : ''}</div>
                </div>
                
                <div class="rating-breakdown">
                    <div class="rating-bars">
                        ${[5, 4, 3, 2, 1].map(star => {
                            const count = stats.distribution[star - 1];
                            const percentage = totalReviews > 0 ? (count / totalReviews) * 100 : 0;
                            return `
                                <div class="rating-bar-row">
                                    <div class="rating-label">${star} star${star !== 1 ? 's' : ''}</div>
                                    <div class="rating-bar">
                                        <div class="rating-bar-fill" style="width: ${percentage}%"></div>
                                    </div>
                                    <div class="rating-count">${count}</div>
                                </div>
                            `;
                        }).join('')}
                    </div>
                </div>
            </div>
        `;
    }

    renderReviewForm() {
        if (!this.currentUser) {
            return `
                <div class="review-form-container">
                    <div class="card">
                        <div class="card-body text-center">
                            <h5>Want to write a review?</h5>
                            <p class="text-muted">Please <a href="users/login.html">log in</a> to write a review.</p>
                        </div>
                    </div>
                </div>
            `;
        }

        if (!this.userHasPurchased) {
            return `
                <div class="review-form-container">
                    <div class="card">
                        <div class="card-body text-center">
                            <h5>Write a Review</h5>
                            <p class="text-muted">Only customers who have purchased this product can write a review.</p>
                        </div>
                    </div>
                </div>
            `;
        }

        return `
            <div class="review-form-container">
                <div class="card">
                    <div class="card-body">
                        <h5 class="card-title">Write a Review</h5>
                        <form id="reviewForm">
                            <div class="mb-3">
                                <label class="form-label">Rating</label>
                                <div class="rating-input">
                                    ${[1, 2, 3, 4, 5].map(rating => `
                                        <label class="rating-star">
                                            <input type="radio" name="rating" value="${rating}" required>
                                            <i class="fas fa-star star-lg"></i>
                                        </label>
                                    `).join('')}
                                </div>
                            </div>
                            
                            <div class="mb-3">
                                <label for="reviewTitle" class="form-label">Review Title (Optional)</label>
                                <input type="text" class="form-control" id="reviewTitle" maxlength="191" 
                                       placeholder="Summarize your review in a few words">
                            </div>
                            
                            <div class="mb-3">
                                <label for="reviewComment" class="form-label">Your Review</label>
                                <textarea class="form-control" id="reviewComment" rows="4" 
                                          placeholder="Share your thoughts about this product..."></textarea>
                            </div>
                            
                            <button type="submit" class="btn btn-primary">Submit Review</button>
                        </form>
                    </div>
                </div>
            </div>
        `;
    }

    renderReviewsList(reviews) {
        if (reviews.length === 0) {
            return `
                <div class="reviews-container">
                    <div class="no-reviews">
                        <i class="fas fa-comment-alt"></i>
                        <h4>No reviews yet</h4>
                        <p>Be the first to share your thoughts about this product!</p>
                    </div>
                </div>
            `;
        }

        return `
            <div class="reviews-container">
                <h4>Customer Reviews</h4>
                ${reviews.map(review => this.renderReviewItem(review)).join('')}
            </div>
        `;
    }

    renderReviewItem(review) {
        const reviewDate = new Date(review.created_at).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });

        return `
            <div class="review-item">
                <div class="review-header">
                    <div class="reviewer-info">
                        <div class="reviewer-name">${this.escapeHtml(review.user_name || 'Anonymous')}</div>
                        ${review.is_verified_purchase ? '<div class="verified-badge"><i class="fas fa-check-circle"></i> Verified Purchase</div>' : ''}
                    </div>
                    <div class="review-date">${reviewDate}</div>
                </div>
                
                <div class="review-rating">
                    ${this.renderStars(review.rating)}
                </div>
                
                ${review.title ? `<div class="review-title">${this.escapeHtml(review.title)}</div>` : ''}
                
                ${review.comment ? `<div class="review-content">${this.escapeHtml(review.comment)}</div>` : ''}
            </div>
        `;
    }

    renderStars(rating, interactive = false) {
        const fullStars = Math.floor(rating);
        const hasHalfStar = rating % 1 >= 0.5;
        const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);

        let starsHtml = '';
        
        // Full stars
        for (let i = 0; i < fullStars; i++) {
            starsHtml += `<i class="fas fa-star star-lg ${interactive ? 'interactive' : ''}"></i>`;
        }
        
        // Half star
        if (hasHalfStar) {
            starsHtml += `<i class="fas fa-star-half-alt star-lg ${interactive ? 'interactive' : ''}"></i>`;
        }
        
        // Empty stars
        for (let i = 0; i < emptyStars; i++) {
            starsHtml += `<i class="far fa-star star-lg ${interactive ? 'interactive' : ''}"></i>`;
        }
        
        return starsHtml;
    }

    attachEventListeners() {
        // Review form submission
        const reviewForm = document.getElementById('reviewForm');
        if (reviewForm) {
            reviewForm.addEventListener('submit', (e) => this.handleReviewSubmit(e));
        }

        // Rating input stars
        const ratingStars = document.querySelectorAll('.rating-star input');
        ratingStars.forEach((input, index) => {
            input.addEventListener('change', () => this.updateStarDisplay(index + 1));
        });

        // Hover effects for rating stars
        const starLabels = document.querySelectorAll('.rating-star');
        starLabels.forEach((label, index) => {
            label.addEventListener('mouseenter', () => this.highlightStars(index + 1));
            label.addEventListener('mouseleave', () => this.resetStarHighlight());
        });
    }

    updateStarDisplay(rating) {
        const stars = document.querySelectorAll('.rating-star i');
        stars.forEach((star, index) => {
            if (index < rating) {
                star.className = 'fas fa-star star-lg';
            } else {
                star.className = 'far fa-star star-lg';
            }
        });
    }

    highlightStars(rating) {
        const stars = document.querySelectorAll('.rating-star i');
        stars.forEach((star, index) => {
            if (index < rating) {
                star.style.color = '#f59e0b';
            } else {
                star.style.color = '#e5e7eb';
            }
        });
    }

    resetStarHighlight() {
        const selectedRating = document.querySelector('.rating-star input:checked');
        if (selectedRating) {
            this.updateStarDisplay(parseInt(selectedRating.value));
        } else {
            const stars = document.querySelectorAll('.rating-star i');
            stars.forEach(star => {
                star.className = 'far fa-star star-lg';
                star.style.color = '';
            });
        }
    }

    async handleReviewSubmit(event) {
        event.preventDefault();
        
        if (!this.currentUser || !this.userHasPurchased) {
            this.showNotification('You must purchase this product to write a review', 'error');
            return;
        }

        const formData = new FormData(event.target);
        const reviewData = {
            user_id: this.currentUser.id,
            product_id: this.currentProductId,
            rating: parseInt(formData.get('rating')),
            title: formData.get('title') || document.getElementById('reviewTitle').value || null,
            comment: document.getElementById('reviewComment').value || null,
            is_verified_purchase: 1
        };

        console.log('Submitting review:', reviewData);

        try {
            const token = localStorage.getItem('userToken');
            const response = await fetch(`${this.apiBase}/reviews`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(reviewData)
            });

            const result = await response.json();
            console.log('Review submission result:', result);

            if (response.ok && result.success) {
                this.showNotification('Review submitted successfully!', 'success');
                // Reload reviews to show the new one
                await this.loadReviews(this.currentProductId);
            } else {
                throw new Error(result.message || 'Failed to submit review');
            }
        } catch (error) {
            console.error('Error submitting review:', error);
            this.showNotification(error.message || 'Failed to submit review', 'error');
        }
    }

    renderError(message) {
        const container = document.getElementById('productReviews');
        if (container) {
            container.innerHTML = `
                <div class="reviews-section">
                    <div class="reviews-header">
                        <h3>Customer Reviews</h3>
                        <p class="text-danger">${message}</p>
                    </div>
                </div>
            `;
        }
    }

    showNotification(message, type = 'info') {
        // Use the existing notification system from shop.html
        if (typeof showNotification === 'function') {
            showNotification(message, type);
        } else {
            // Fallback notification
            alert(message);
        }
    }

    escapeHtml(text) {
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        return text ? text.replace(/[&<>"']/g, (m) => map[m]) : '';
    }
}

// Export for global use
window.ReviewManager = ReviewManager;
