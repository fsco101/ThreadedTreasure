// Review System for ThreadedTreasure
// Handles product reviews, ratings, and user interactions

class ReviewManager {
    constructor() {
        this.apiBase = 'http://localhost:3000/api';
        this.currentProductId = null;
        this.currentUser = null;
        this.userHasPurchased = false;
        this.loadedReviews = [];
    }

    async initializeReviews(productId) {
        this.currentProductId = productId;
        this.currentUser = this.getCurrentUser();
        this.userHasPurchased = false;
        if (this.currentUser && this.currentUser.id && this.currentUser.is_active === 1) {
            this.userHasPurchased = await this.checkUserPurchase(productId);
        }
        await this.loadReviews(productId);
    }

    getCurrentUser() {
        try {
            const userData = localStorage.getItem('userData');
            if (!userData) return null;
            const user = JSON.parse(userData);
            return user && user.id && user.is_active === 1 ? user : null;
        } catch {
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
        } catch {}
        return false;
    }

    async loadReviews(productId) {
        try {
            const response = await fetch(`${this.apiBase}/reviews/products/${productId}`);
            if (!response.ok) throw new Error(`Failed to fetch reviews: ${response.status}`);
            const result = await response.json();
            if (result.success) {
                // Use result.data.reviews for the array, and pass stats/pagination if needed
                this.renderReviews(result.data.reviews || [], result.data.stats, result.data.pagination);
            } else {
                throw new Error(result.message || 'Failed to load reviews');
            }
        } catch (error) {
            this.renderError('Failed to load reviews');
        }
    }

    // Update renderReviews to accept stats and pagination (optional)
    renderReviews(reviews, stats, pagination) {
        this.loadedReviews = reviews; // <-- Add this line
        const container = document.getElementById('productReviews');
        if (!container) return;
        container.innerHTML = `
            <div class="reviews-section">
                <div class="reviews-header">
                    <h3>Customer Reviews</h3>
                    <p class="text-muted">${reviews.length} review${reviews.length !== 1 ? 's' : ''}</p>
                </div>
                ${this.renderReviewStats(stats || this.calculateReviewStats(reviews), reviews.length)}
                ${this.renderReviewForm()}
                ${this.renderReviewsList(reviews)}
            </div>
        `;
        this.attachEventListeners();
    }

    calculateReviewStats(reviews) {
        if (reviews.length === 0) return { averageRating: 0, distribution: [0, 0, 0, 0, 0] };
        const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0);
        const averageRating = totalRating / reviews.length;
        const distribution = [0, 0, 0, 0, 0];
        reviews.forEach(review => {
            if (review.rating >= 1 && review.rating <= 5) distribution[review.rating - 1]++;
        });
        return { averageRating, distribution };
    }

    renderReviewStats(stats, totalReviews) {
        // Map backend stats to frontend expected keys
        if (stats && stats.average_rating !== undefined) {
            stats = {
                ...stats,
                averageRating: parseFloat(stats.average_rating),
                distribution: [
                    parseInt(stats.one_star) || 0,
                    parseInt(stats.two_stars) || 0,
                    parseInt(stats.three_stars) || 0,
                    parseInt(stats.four_stars) || 0,
                    parseInt(stats.five_stars) || 0
                ]
            };
        }
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
                        <div class="rating-number">${stats.averageRating ? stats.averageRating.toFixed(1) : '0.0'}</div>
                        <div class="stars">
                            ${this.renderStars(stats.averageRating || 0)}
                        </div>
                    </div>
                    <div class="review-count">${totalReviews} review${totalReviews !== 1 ? 's' : ''}</div>
                </div>
                <div class="rating-breakdown">
                    <div class="rating-bars">
                        ${[5, 4, 3, 2, 1].map(star => {
                            const count = stats.distribution ? stats.distribution[star - 1] : 0;
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
                                <input type="text" class="form-control" id="reviewTitle" name="reviewTitle" maxlength="191" 
                                       placeholder="Summarize your review in a few words">
                            </div>
                            <div class="mb-3">
                                <label for="reviewComment" class="form-label">Your Review</label>
                                <textarea class="form-control" id="reviewComment" name="reviewComment" rows="4" 
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

    // Add edit/delete buttons for user's own review
    renderReviewItem(review) {
        const reviewDate = new Date(review.created_at).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
        const isOwner = this.currentUser && review.user_id === this.currentUser.id;
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
                ${isOwner ? `
                    <div class="review-actions">
                        <button class="btn btn-secondary" onclick="window.reviewManager.startEditReview(${review.id})">Edit</button>
                        <button class="btn btn-secondary" onclick="window.reviewManager.deleteReview(${review.id})">Delete</button>
                    </div>
                ` : ''}
            </div>
        `;
    }

    renderStars(rating, interactive = false) {
        const fullStars = Math.floor(rating);
        const hasHalfStar = rating % 1 >= 0.5;
        const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);
        let starsHtml = '';
        for (let i = 0; i < fullStars; i++) {
            starsHtml += `<i class="fas fa-star star-lg${interactive ? ' interactive' : ''}"></i>`;
        }
        if (hasHalfStar) {
            starsHtml += `<i class="fas fa-star-half-alt star-lg${interactive ? ' interactive' : ''}"></i>`;
        }
        for (let i = 0; i < emptyStars; i++) {
            starsHtml += `<i class="far fa-star star-lg${interactive ? ' interactive' : ''}"></i>`;
        }
        return starsHtml;
    }

    attachEventListeners() {
        // Review form submission
        const reviewForm = document.getElementById('reviewForm');
        if (reviewForm) {
            reviewForm.addEventListener('submit', (e) => this.handleReviewSubmit(e));
        }
        // Rating input stars (scoped to review form)
        if (reviewForm) {
            const ratingStars = reviewForm.querySelectorAll('.rating-star input');
            ratingStars.forEach((input, index) => {
                input.addEventListener('change', () => this.updateStarDisplay(index + 1, reviewForm));
            });
            // Hover effects for rating stars
            const starLabels = reviewForm.querySelectorAll('.rating-star');
            starLabels.forEach((label, index) => {
                label.addEventListener('mouseenter', () => this.highlightStars(index + 1, reviewForm));
                label.addEventListener('mouseleave', () => this.resetStarHighlight(reviewForm));
            });
        }
    }

    updateStarDisplay(rating, form) {
        const stars = form.querySelectorAll('.rating-star i');
        stars.forEach((star, index) => {
            if (index < rating) {
                star.className = 'fas fa-star star-lg';
            } else {
                star.className = 'far fa-star star-lg';
            }
        });
    }

    highlightStars(rating, form) {
        const stars = form.querySelectorAll('.rating-star i');
        stars.forEach((star, index) => {
            if (index < rating) {
                star.style.color = '#f59e0b';
            } else {
                star.style.color = '#e5e7eb';
            }
        });
    }

    resetStarHighlight(form) {
        const selectedRating = form.querySelector('.rating-star input:checked');
        if (selectedRating) {
            this.updateStarDisplay(parseInt(selectedRating.value), form);
        } else {
            const stars = form.querySelectorAll('.rating-star i');
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
        const form = event.target;
        const formData = new FormData(form);
        const reviewData = {
            rating: parseInt(formData.get('rating')),
            title: formData.get('reviewTitle') || '',
            comment: formData.get('reviewComment') || ''
        };
        try {
            const token = localStorage.getItem('userToken');
            // FIX: Post to the correct endpoint
            const response = await fetch(`${this.apiBase}/reviews/products/${this.currentProductId}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(reviewData)
            });
            const result = await response.json();
            if (response.ok && result.success) {
                this.showNotification('Review submitted successfully!', 'success');
                form.reset();
                // Reload reviews to show the new one
                await this.loadReviews(this.currentProductId);
            } else {
                throw new Error(result.message || 'Failed to submit review');
            }
        } catch (error) {
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
        if (typeof showNotification === 'function') {
            showNotification(message, type);
        } else {
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

    // Add edit and delete methods
    async startEditReview(reviewId) {
        // Fetch review data (or pass it in), show a modal or inline form for editing
        // For simplicity, reload reviews and show a prompt
        const review = (await this.getReviewById(reviewId));
        if (!review) return;
        const newComment = prompt('Edit your review:', review.comment);
        if (newComment && newComment.length >= 10) {
            await this.updateReview(reviewId, review.rating, review.title, newComment);
        }
    }
    async getReviewById(reviewId) {
        return this.loadedReviews.find(r => r.id === reviewId) || null;
    }
    async updateReview(reviewId, rating, title, comment) {
        try {
            const token = localStorage.getItem('userToken');
            const response = await fetch(`${this.apiBase}/reviews/${reviewId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ rating, title, comment })
            });
            const result = await response.json();
            if (response.ok && result.success) {
                this.showNotification('Review updated successfully!', 'success');
                await this.loadReviews(this.currentProductId);
            } else {
                throw new Error(result.message || 'Failed to update review');
            }
        } catch (error) {
            this.showNotification(error.message || 'Failed to update review', 'error');
        }
    }
    async deleteReview(reviewId) {
        if (!confirm('Are you sure you want to delete your review?')) return;
        try {
            const token = localStorage.getItem('userToken');
            const response = await fetch(`${this.apiBase}/reviews/${reviewId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            const result = await response.json();
            if (response.ok && result.success) {
                this.showNotification('Review deleted successfully!', 'success');
                await this.loadReviews(this.currentProductId);
            } else {
                throw new Error(result.message || 'Failed to delete review');
            }
        } catch (error) {
            this.showNotification(error.message || 'Failed to delete review', 'error');
        }
    }
}

window.ReviewManager = ReviewManager;
