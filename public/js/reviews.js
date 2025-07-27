// Review System for ThreadedTreasure
// Handles product reviews, ratings, and user interactions

const API_BASE_URL = 'http://localhost:3000/api';

class ReviewManager {
    constructor() {
        this.currentProductId = null;
        this.userToken = localStorage.getItem('userToken');
        this.userData = null;
        this.reviews = [];
        this.reviewStats = null;
        this.userEligibility = null;
        
        // Initialize user data
        try {
            this.userData = JSON.parse(localStorage.getItem('userData'));
        } catch (e) {
            this.userData = null;
        }
    }

    /**
     * Initialize reviews for a product
     * @param {number} productId - The product ID
     */
    async initializeReviews(productId) {
        this.currentProductId = productId;
        
        // Check if user can review this product
        if (this.userToken && this.userData && !this.userData.isGuest) {
            await this.checkReviewEligibility();
        }
        
        // Load reviews
        await this.loadReviews();
        
        // Render the review section
        this.renderReviewSection();
    }

    /**
     * Check if user is eligible to review the product
     */
    async checkReviewEligibility() {
        try {
            const response = await $.ajax({
                url: `${API_BASE_URL}/reviews/eligibility/${this.currentProductId}`,
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${this.userToken}`,
                    'Content-Type': 'application/json'
                }
            });
            
            if (response.success) {
                this.userEligibility = response.data;
            }
        } catch (error) {
            console.error('Error checking review eligibility:', error);
            this.userEligibility = null;
        }
    }

    /**
     * Load reviews for the current product
     */
    async loadReviews(page = 1) {
        try {
            const response = await $.ajax({
                url: `${API_BASE_URL}/reviews/products/${this.currentProductId}?page=${page}&limit=10`,
                method: 'GET'
            });
            
            if (response.success) {
                this.reviews = response.data.reviews;
                this.reviewStats = response.data.stats;
                this.pagination = response.data.pagination;
            }
        } catch (error) {
            console.error('Error loading reviews:', error);
            this.reviews = [];
            this.reviewStats = null;
        }
    }

    /**
     * Render the complete review section
     */
    renderReviewSection() {
        const reviewContainer = document.getElementById('productReviews');
        if (!reviewContainer) {
            console.error('Reviews container not found');
            return;
        }

        const html = `
            <div class="reviews-section">
                <div class="reviews-header">
                    <h3>Customer Reviews</h3>
                    ${this.renderReviewStats()}
                </div>
                
                ${this.renderReviewForm()}
                
                <div class="reviews-list">
                    ${this.renderReviewsList()}
                </div>
                
                ${this.renderPagination()}
            </div>
        `;

        reviewContainer.innerHTML = html;
        this.attachEventListeners();
    }

    /**
     * Render review statistics
     */
    renderReviewStats() {
        if (!this.reviewStats || this.reviewStats.total_reviews === 0) {
            return '<p class="text-muted">No reviews yet. Be the first to review this product!</p>';
        }

        const avgRating = parseFloat(this.reviewStats.average_rating).toFixed(1);
        const totalReviews = this.reviewStats.total_reviews;

        return `
            <div class="review-stats">
                <div class="overall-rating">
                    <div class="rating-display">
                        <span class="rating-number">${avgRating}</span>
                        <div class="stars">
                            ${this.renderStars(avgRating)}
                        </div>
                        <span class="review-count">(${totalReviews} review${totalReviews > 1 ? 's' : ''})</span>
                    </div>
                </div>
                
                <div class="rating-breakdown">
                    ${this.renderRatingBreakdown()}
                </div>
            </div>
        `;
    }

    /**
     * Render star rating display
     */
    renderStars(rating, interactive = false, size = 'md') {
        const fullStars = Math.floor(rating);
        const hasHalfStar = rating % 1 >= 0.5;
        const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);
        
        let starsHtml = '';
        
        // Full stars
        for (let i = 0; i < fullStars; i++) {
            starsHtml += `<i class="fas fa-star star-${size} ${interactive ? 'interactive' : ''}" data-rating="${i + 1}"></i>`;
        }
        
        // Half star
        if (hasHalfStar) {
            starsHtml += `<i class="fas fa-star-half-alt star-${size} ${interactive ? 'interactive' : ''}"></i>`;
        }
        
        // Empty stars
        for (let i = 0; i < emptyStars; i++) {
            starsHtml += `<i class="far fa-star star-${size} ${interactive ? 'interactive' : ''}" data-rating="${fullStars + (hasHalfStar ? 1 : 0) + i + 1}"></i>`;
        }
        
        return starsHtml;
    }

    /**
     * Render rating breakdown bars
     */
    renderRatingBreakdown() {
        const stats = this.reviewStats;
        const total = stats.total_reviews;
        
        if (total === 0) return '';

        return `
            <div class="rating-bars">
                ${[5, 4, 3, 2, 1].map(rating => {
                    const count = stats[`${rating === 1 ? 'one' : rating === 2 ? 'two' : rating === 3 ? 'three' : rating === 4 ? 'four' : 'five'}_star${rating > 1 ? 's' : ''}`];
                    const percentage = total > 0 ? (count / total * 100).toFixed(1) : 0;
                    
                    return `
                        <div class="rating-bar-row">
                            <span class="rating-label">${rating} star${rating > 1 ? 's' : ''}</span>
                            <div class="rating-bar">
                                <div class="rating-bar-fill" style="width: ${percentage}%"></div>
                            </div>
                            <span class="rating-count">${count}</span>
                        </div>
                    `;
                }).join('')}
            </div>
        `;
    }

    /**
     * Render review form
     */
    renderReviewForm() {
        if (!this.userToken || !this.userData || this.userData.isGuest) {
            return `
                <div class="review-form-placeholder">
                    <p class="text-muted">
                        <a href="/login">Sign in</a> to write a review
                    </p>
                </div>
            `;
        }

        if (!this.userEligibility) {
            return `
                <div class="review-form-placeholder">
                    <p class="text-muted">Loading...</p>
                </div>
            `;
        }

        if (this.userEligibility.hasReviewed) {
            const review = this.userEligibility.existingReview;
            return `
                <div class="existing-review-notice">
                    <div class="alert alert-info">
                        <h5>Your Review</h5>
                        <div class="user-review-display">
                            <div class="stars mb-2">
                                ${this.renderStars(review.rating)}
                            </div>
                            ${review.title ? `<h6>${review.title}</h6>` : ''}
                            <p>${review.comment}</p>
                            <small class="text-muted">Reviewed on ${new Date(review.created_at).toLocaleDateString()}</small>
                            <div class="mt-2">
                                <button class="btn btn-sm btn-outline-primary" onclick="reviewManager.editReview(${review.id})">
                                    Edit Review
                                </button>
                                <button class="btn btn-sm btn-outline-danger ms-2" onclick="reviewManager.deleteReview(${review.id})">
                                    Delete Review
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }

        if (!this.userEligibility.hasPurchased) {
            return `
                <div class="review-form-placeholder">
                    <div class="alert alert-warning">
                        <i class="fas fa-shopping-cart me-2"></i>
                        You must purchase this product before you can write a review.
                    </div>
                </div>
            `;
        }

        if (!this.userEligibility.canReview) {
            return `
                <div class="review-form-placeholder">
                    <p class="text-muted">You have already reviewed this product.</p>
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
                                <label class="form-label">Rating *</label>
                                <div class="rating-input">
                                    ${this.renderStars(0, true, 'lg')}
                                </div>
                                <input type="hidden" id="reviewRating" name="rating" required>
                            </div>
                            
                            <div class="mb-3">
                                <label for="reviewTitle" class="form-label">Title (Optional)</label>
                                <input type="text" class="form-control" id="reviewTitle" name="title" maxlength="191" placeholder="Summarize your review">
                            </div>
                            
                            <div class="mb-3">
                                <label for="reviewComment" class="form-label">Review *</label>
                                <textarea class="form-control" id="reviewComment" name="comment" rows="4" required minlength="10" placeholder="Share your thoughts about this product..."></textarea>
                                <div class="form-text">Minimum 10 characters required</div>
                            </div>
                            
                            <div class="d-flex gap-2">
                                <button type="submit" class="btn btn-primary">
                                    <i class="fas fa-paper-plane me-1"></i>
                                    Submit Review
                                </button>
                                <button type="button" class="btn btn-secondary" onclick="reviewManager.cancelReviewForm()">
                                    Cancel
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Render reviews list
     */
    renderReviewsList() {
        if (!this.reviews || this.reviews.length === 0) {
            return '<div class="no-reviews"><p class="text-muted">No reviews yet.</p></div>';
        }

        return `
            <div class="reviews-container">
                <h4>Reviews (${this.reviews.length})</h4>
                ${this.reviews.map(review => this.renderSingleReview(review)).join('')}
            </div>
        `;
    }

    /**
     * Render a single review
     */
    renderSingleReview(review) {
        const reviewDate = new Date(review.created_at).toLocaleDateString();
        const isVerified = review.is_verified_purchase;

        return `
            <div class="review-item" data-review-id="${review.id}">
                <div class="review-header">
                    <div class="reviewer-info">
                        <strong>${review.user_name || 'Anonymous'}</strong>
                        ${isVerified ? '<span class="verified-badge"><i class="fas fa-check-circle"></i> Verified Purchase</span>' : ''}
                    </div>
                    <div class="review-date">
                        <small class="text-muted">${reviewDate}</small>
                    </div>
                </div>
                
                <div class="review-rating">
                    <div class="stars">
                        ${this.renderStars(review.rating)}
                    </div>
                </div>
                
                ${review.title ? `<h6 class="review-title">${review.title}</h6>` : ''}
                
                <div class="review-content">
                    <p>${review.comment}</p>
                </div>
                
                <div class="review-actions">
                    <button class="btn btn-sm btn-outline-secondary helpful-btn" data-review-id="${review.id}">
                        <i class="fas fa-thumbs-up"></i>
                        Helpful (${review.helpful_count || 0})
                    </button>
                </div>
            </div>
        `;
    }

    /**
     * Render pagination
     */
    renderPagination() {
        if (!this.pagination || this.pagination.totalPages <= 1) {
            return '';
        }

        let paginationHtml = '<nav><ul class="pagination justify-content-center">';
        
        // Previous button
        if (this.pagination.hasPrev) {
            paginationHtml += `<li class="page-item"><a class="page-link" href="#" data-page="${this.pagination.currentPage - 1}">Previous</a></li>`;
        }
        
        // Page numbers
        for (let i = 1; i <= this.pagination.totalPages; i++) {
            const isActive = i === this.pagination.currentPage;
            paginationHtml += `<li class="page-item ${isActive ? 'active' : ''}"><a class="page-link" href="#" data-page="${i}">${i}</a></li>`;
        }
        
        // Next button
        if (this.pagination.hasNext) {
            paginationHtml += `<li class="page-item"><a class="page-link" href="#" data-page="${this.pagination.currentPage + 1}">Next</a></li>`;
        }
        
        paginationHtml += '</ul></nav>';
        
        return paginationHtml;
    }

    /**
     * Attach event listeners
     */
    attachEventListeners() {
        // Rating input
        document.removeEventListener('click', this.ratingClickHandler);
        this.ratingClickHandler = (e) => {
            if (e.target.classList.contains('interactive')) {
                const rating = parseInt(e.target.dataset.rating);
                const reviewRatingInput = document.getElementById('reviewRating');
                if (reviewRatingInput) {
                    reviewRatingInput.value = rating;
                }
                this.updateRatingDisplay(rating);
            }
        };
        document.addEventListener('click', this.ratingClickHandler);

        // Review form submission
        const reviewForm = document.getElementById('reviewForm');
        if (reviewForm) {
            reviewForm.removeEventListener('submit', this.reviewSubmitHandler);
            this.reviewSubmitHandler = (e) => {
                e.preventDefault();
                this.submitReview();
            };
            reviewForm.addEventListener('submit', this.reviewSubmitHandler);
        }

        // Helpful button
        document.removeEventListener('click', this.helpfulClickHandler);
        this.helpfulClickHandler = (e) => {
            if (e.target.closest('.helpful-btn')) {
                e.preventDefault();
                const helpfulBtn = e.target.closest('.helpful-btn');
                const reviewId = helpfulBtn.dataset.reviewId;
                this.markHelpful(reviewId);
            }
        };
        document.addEventListener('click', this.helpfulClickHandler);

        // Pagination
        document.removeEventListener('click', this.paginationClickHandler);
        this.paginationClickHandler = (e) => {
            if (e.target.closest('.pagination a')) {
                e.preventDefault();
                const page = parseInt(e.target.dataset.page);
                if (page) {
                    this.loadReviews(page).then(() => this.renderReviewSection());
                }
            }
        };
        document.addEventListener('click', this.paginationClickHandler);
    }

    /**
     * Update rating display when user selects stars
     */
    updateRatingDisplay(rating) {
        const container = document.querySelector('.rating-input');
        if (container) {
            const stars = container.querySelectorAll('.interactive');
            stars.forEach((star, index) => {
                if (index < rating) {
                    star.classList.remove('far');
                    star.classList.add('fas');
                } else {
                    star.classList.remove('fas');
                    star.classList.add('far');
                }
            });
        }
    }

    /**
     * Submit review
     */
    async submitReview() {
        const formData = {
            rating: parseInt($('#reviewRating').val()),
            title: $('#reviewTitle').val().trim(),
            comment: $('#reviewComment').val().trim()
        };

        if (!formData.rating || formData.rating < 1 || formData.rating > 5) {
            Swal.fire('Error', 'Please select a rating', 'error');
            return;
        }

        if (!formData.comment || formData.comment.length < 10) {
            Swal.fire('Error', 'Review comment must be at least 10 characters long', 'error');
            return;
        }

        try {
            const response = await $.ajax({
                url: `${API_BASE_URL}/reviews/products/${this.currentProductId}`,
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.userToken}`,
                    'Content-Type': 'application/json'
                },
                data: JSON.stringify(formData)
            });

            if (response.success) {
                Swal.fire('Success', 'Your review has been submitted!', 'success');
                // Refresh the reviews
                await this.checkReviewEligibility();
                await this.loadReviews();
                this.renderReviewSection();
            } else {
                Swal.fire('Error', response.message || 'Failed to submit review', 'error');
            }
        } catch (error) {
            console.error('Error submitting review:', error);
            Swal.fire('Error', 'Failed to submit review. Please try again.', 'error');
        }
    }

    /**
     * Mark review as helpful
     */
    async markHelpful(reviewId) {
        try {
            const response = await $.ajax({
                url: `${API_BASE_URL}/reviews/${reviewId}/helpful`,
                method: 'POST'
            });

            if (response.success) {
                // Update the helpful count in the UI
                const button = $(`.helpful-btn[data-review-id="${reviewId}"]`);
                button.html(`<i class="fas fa-thumbs-up"></i> Helpful (${response.data.helpful_count})`);
                
                // Show success message
                Swal.fire({
                    title: 'Thank you!',
                    text: 'Your feedback has been recorded.',
                    icon: 'success',
                    timer: 2000,
                    showConfirmButton: false
                });
            }
        } catch (error) {
            console.error('Error marking review as helpful:', error);
            Swal.fire('Error', 'Failed to record your feedback', 'error');
        }
    }

    /**
     * Cancel review form
     */
    cancelReviewForm() {
        $('.review-form-container').hide();
    }

    /**
     * Edit existing review (placeholder for future implementation)
     */
    editReview(reviewId) {
        Swal.fire('Info', 'Edit review functionality coming soon!', 'info');
    }

    /**
     * Delete existing review
     */
    async deleteReview(reviewId) {
        const result = await Swal.fire({
            title: 'Delete Review?',
            text: 'Are you sure you want to delete your review? This action cannot be undone.',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Yes, delete it!'
        });

        if (!result.isConfirmed) return;

        try {
            const response = await $.ajax({
                url: `${API_BASE_URL}/reviews/${reviewId}`,
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${this.userToken}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.success) {
                Swal.fire('Deleted!', 'Your review has been deleted.', 'success');
                // Refresh the reviews
                await this.checkReviewEligibility();
                await this.loadReviews();
                this.renderReviewSection();
            } else {
                Swal.fire('Error', response.message || 'Failed to delete review', 'error');
            }
        } catch (error) {
            console.error('Error deleting review:', error);
            Swal.fire('Error', 'Failed to delete review. Please try again.', 'error');
        }
    }
}

// Global instance
let reviewManager;
window.ReviewManager = ReviewManager;
