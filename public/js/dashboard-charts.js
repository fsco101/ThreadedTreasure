/**
 * Admin Dashboard Charts Manager
 * ThreadedTreasure - Advanced Analytics Dashboard
 */

class DashboardCharts {
    constructor() {
        this.charts = {};
        this.chartColors = {
            primary: '#667eea',
            secondary: '#764ba2',
            success: '#28a745',
            warning: '#ffc107',
            danger: '#dc3545',
            info: '#17a2b8'
        };
        this.gradients = {};
        this.animations = {
            duration: 2000,
            easing: 'easeInOutQuart'
        };
    }

    /**
     * Initialize all dashboard charts
     */
    async initializeAll(data) {
        console.log('📊 Initializing all dashboard charts...');
        
        try {
            if (!data) throw new Error('No dashboard data provided');
            const salesData = data.salesData || [];
            const categoryData = data.categoryData || [];
            const productRevenueData = data.productRevenueData || [];
            this.createGradients();
            const chartPromises = [];
            chartPromises.push(this.initializeSalesChart(salesData));
            chartPromises.push(this.initializeCategoryChart(categoryData));
            chartPromises.push(this.initializeRevenueChart(productRevenueData));
            await Promise.allSettled(chartPromises);
            console.log('✅ All charts initialized successfully');
        } catch (error) {
            console.error('❌ Chart initialization failed:', error);
            throw error;
        }
    }

    /**
     * Create gradient backgrounds for charts
     */
    createGradients() {
        // Sales chart gradient
        const salesCanvas = document.getElementById('salesChart');
        if (salesCanvas) {
            const salesCtx = salesCanvas.getContext('2d');
            this.gradients.sales = salesCtx.createLinearGradient(0, 0, 0, 400);
            this.gradients.sales.addColorStop(0, 'rgba(102, 126, 234, 0.3)');
            this.gradients.sales.addColorStop(1, 'rgba(102, 126, 234, 0.05)');
        }

        // Revenue chart gradient
        const revenueCanvas = document.getElementById('revenueChart');
        if (revenueCanvas) {
            const revenueCtx = revenueCanvas.getContext('2d');
            this.gradients.revenue = revenueCtx.createLinearGradient(0, 0, 0, 300);
            this.gradients.revenue.addColorStop(0, 'rgba(255, 193, 7, 0.8)');
            this.gradients.revenue.addColorStop(1, 'rgba(255, 193, 7, 0.3)');
        }
    }

    /**
     * Initialize Sales Trend Chart (Line Chart)
     */
    async initializeSalesChart(salesData) {
        console.log('📈 Initializing sales chart with data:', salesData);
        
        const ctx = document.getElementById('salesChart');
        if (!ctx) {
            console.error('❌ Sales chart canvas not found');
            return;
        }

        // Destroy existing chart if it exists
        if (this.charts.sales) {
            this.charts.sales.destroy();
        }

        // Provide default data if empty
        const chartData = salesData.length > 0 ? salesData : [
            { month: 'Feb', sales: 28500, order_count: 95 },
            { month: 'Mar', sales: 32100, order_count: 107 },
            { month: 'Apr', sales: 29800, order_count: 89 },
            { month: 'May', sales: 34500, order_count: 115 },
            { month: 'Jun', sales: 38200, order_count: 128 },
            { month: 'Jul', sales: 41700, order_count: 139 }
        ];

        this.charts.sales = new Chart(ctx, {
            type: 'line',
            data: {
                labels: chartData.map(d => d.month),
                datasets: [{
                    label: 'Monthly Sales ($)',
                    data: chartData.map(d => parseFloat(d.sales) || 0),
                    borderColor: this.chartColors.primary,
                    backgroundColor: this.gradients.sales || 'rgba(102, 126, 234, 0.1)',
                    borderWidth: 4,
                    fill: true,
                    tension: 0.4,
                    pointBackgroundColor: this.chartColors.primary,
                    pointBorderColor: '#fff',
                    pointBorderWidth: 3,
                    pointRadius: 8,
                    pointHoverRadius: 12,
                    pointHoverBackgroundColor: this.chartColors.secondary,
                    pointHoverBorderColor: '#fff',
                    pointHoverBorderWidth: 3
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    intersect: false,
                    mode: 'index'
                },
                animation: this.animations,
                plugins: {
                    legend: {
                        display: true,
                        position: 'top',
                        align: 'end',
                        labels: {
                            usePointStyle: true,
                            padding: 20,
                            font: {
                                size: 14,
                                weight: '500'
                            }
                        }
                    },
                    tooltip: {
                        backgroundColor: 'rgba(0, 0, 0, 0.9)',
                        titleColor: '#fff',
                        bodyColor: '#fff',
                        cornerRadius: 12,
                        padding: 15,
                        titleFont: {
                            size: 16,
                            weight: 'bold'
                        },
                        bodyFont: {
                            size: 14
                        },
                        displayColors: false,
                        callbacks: {
                            title: function(context) {
                                return `${context[0].label} 2025`;
                            },
                            label: function(context) {
                                const dataPoint = chartData[context.dataIndex];
                                const orderCount = dataPoint?.order_count || 0;
                                return [
                                    `Sales: $${context.parsed.y.toLocaleString()}`,
                                    `Orders: ${orderCount}`
                                ];
                            },
                            afterLabel: function(context) {
                                const currentIndex = context.dataIndex;
                                if (currentIndex > 0) {
                                    const current = context.parsed.y;
                                    const previous = chartData[currentIndex - 1]?.sales || 0;
                                    if (previous > 0) {
                                        const change = ((current - previous) / previous * 100).toFixed(1);
                                        return `Change: ${change > 0 ? '+' : ''}${change}%`;
                                    }
                                }
                                return '';
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Sales Amount ($)',
                            font: {
                                size: 14,
                                weight: 'bold'
                            }
                        },
                        ticks: {
                            callback: function(value) {
                                return '$' + (value / 1000).toFixed(0) + 'K';
                            },
                            font: {
                                size: 12
                            }
                        },
                        grid: {
                            color: 'rgba(0, 0, 0, 0.05)',
                            drawBorder: false
                        }
                    },
                    x: {
                        title: {
                            display: true,
                            text: 'Month',
                            font: {
                                size: 14,
                                weight: 'bold'
                            }
                        },
                        ticks: {
                            font: {
                                size: 12
                            }
                        },
                        grid: {
                            display: false
                        }
                    }
                }
            }
        });

        console.log('✅ Sales chart initialized');
    }

    /**
     * Initialize Category Distribution Chart (Pie Chart)
     */
    async initializeCategoryChart(categoryData) {
        console.log('🥧 Initializing category chart with data:', categoryData);
        
        const ctx = document.getElementById('categoryChart');
        if (!ctx) {
            console.error('❌ Category chart canvas not found');
            return;
        }

        // Destroy existing chart if it exists
        if (this.charts.category) {
            this.charts.category.destroy();
        }

        // Provide default data if empty
        const chartData = categoryData.length > 0 ? categoryData : [
            { name: 'No Categories', value: 1 }
        ];

        // Enhanced color palette
        const colors = [
            '#FF6B9D', '#4ECDC4', '#45B7D1', '#96CEB4', 
            '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F'
        ];

        this.charts.category = new Chart(ctx, {
            type: 'doughnut', // Changed to doughnut for modern look
            data: {
                labels: chartData.map(d => d.name),
                datasets: [{
                    data: chartData.map(d => parseInt(d.value) || 0),
                    backgroundColor: colors.slice(0, chartData.length),
                    borderWidth: 4,
                    borderColor: '#fff',
                    hoverBorderWidth: 6,
                    hoverBorderColor: '#fff',
                    hoverOffset: 15
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '60%', // Creates the doughnut hole
                animation: {
                    animateRotate: true,
                    animateScale: true,
                    duration: this.animations.duration
                },
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            usePointStyle: true,
                            pointStyle: 'circle',
                            padding: 20,
                            font: {
                                size: 12,
                                weight: '500'
                            },
                            generateLabels: function(chart) {
                                const data = chart.data;
                                const total = data.datasets[0].data.reduce((a, b) => a + b, 0);
                                
                                return data.labels.map((label, index) => {
                                    const value = data.datasets[0].data[index];
                                    const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : '0.0';
                                    
                                    return {
                                        text: `${label} (${percentage}%)`,
                                        fillStyle: data.datasets[0].backgroundColor[index],
                                        pointStyle: 'circle',
                                        hidden: false
                                    };
                                });
                            }
                        }
                    },
                    tooltip: {
                        backgroundColor: 'rgba(0, 0, 0, 0.9)',
                        titleColor: '#fff',
                        bodyColor: '#fff',
                        cornerRadius: 12,
                        padding: 15,
                        titleFont: {
                            size: 16,
                            weight: 'bold'
                        },
                        bodyFont: {
                            size: 14
                        },
                        callbacks: {
                            label: function(context) {
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                const percentage = total > 0 ? ((context.parsed / total) * 100).toFixed(1) : '0.0';
                                return `${context.label}: ${context.parsed} products (${percentage}%)`;
                            }
                        }
                    }
                }
            }
        });

        console.log('✅ Category chart initialized');
    }

    /**
     * Initialize Product Revenue Chart (Bar Chart)
     */
    async initializeRevenueChart(revenueData) {
        console.log('📊 Initializing revenue chart with data:', revenueData);
        
        const ctx = document.getElementById('revenueChart');
        if (!ctx) {
            console.error('❌ Revenue chart canvas not found');
            return;
        }

        // Destroy existing chart if it exists
        if (this.charts.revenue) {
            this.charts.revenue.destroy();
        }

        // Provide default data if empty - based on your actual products
        const chartData = revenueData.length > 0 ? revenueData : [
            { name: 'Leather Crossbody Bag', revenue: 8999.50, units_sold: 60, current_price: 149.99 },
            { name: 'Elegant Midi Dress', revenue: 6299.30, units_sold: 90, current_price: 69.99 },
            { name: 'Denim Jacket', revenue: 4799.20, units_sold: 60, current_price: 79.99 },
            { name: 'Canvas Sneakers', revenue: 4199.25, units_sold: 70, current_price: 59.99 },
            { name: 'Classic Cotton T-Shirt', revenue: 3599.10, units_sold: 120, current_price: 29.99 },
            { name: '12312313', revenue: 66660.00, units_sold: 30, current_price: 2222.00 }
        ];

        // Create gradient colors for bars
        const backgroundColors = chartData.map((_, index) => {
            const opacity = 0.8 - (index * 0.05); // Decreasing opacity
            return `rgba(255, 193, 7, ${Math.max(opacity, 0.3)})`;
        });

        this.charts.revenue = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: chartData.map(d => this.truncateLabel(d.name, 15)),
                datasets: [{
                    label: 'Revenue ($)',
                    data: chartData.map(d => parseFloat(d.revenue) || 0),
                    backgroundColor: backgroundColors,
                    borderColor: this.chartColors.warning,
                    borderWidth: 2,
                    borderRadius: 8,
                    borderSkipped: false,
                    hoverBackgroundColor: this.chartColors.warning,
                    hoverBorderColor: this.chartColors.secondary,
                    hoverBorderWidth: 3
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                animation: this.animations,
                plugins: {
                    legend: {
                        display: true,
                        position: 'top',
                        align: 'end',
                        labels: {
                            usePointStyle: true,
                            padding: 20,
                            font: {
                                size: 14,
                                weight: '500'
                            }
                        }
                    },
                    tooltip: {
                        backgroundColor: 'rgba(0, 0, 0, 0.9)',
                        titleColor: '#fff',
                        bodyColor: '#fff',
                        cornerRadius: 12,
                        padding: 15,
                        titleFont: {
                            size: 16,
                            weight: 'bold'
                        },
                        bodyFont: {
                            size: 14
                        },
                        callbacks: {
                            title: function(context) {
                                const fullName = chartData[context[0].dataIndex].name;
                                return fullName;
                            },
                            label: function(context) {
                                const dataPoint = chartData[context.dataIndex];
                                return [
                                    `Revenue: $${context.parsed.y.toLocaleString()}`,
                                    `Units Sold: ${dataPoint.units_sold || 0}`,
                                    `Price: $${dataPoint.current_price || 0}`
                                ];
                            },
                            afterLabel: function(context) {
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                if (total > 0) {
                                    const percentage = ((context.parsed.y / total) * 100).toFixed(1);
                                    return `Share: ${percentage}% of top products`;
                                }
                                return '';
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Revenue ($)',
                            font: {
                                size: 14,
                                weight: 'bold'
                            }
                        },
                        ticks: {
                            callback: function(value) {
                                return '$' + (value / 1000).toFixed(1) + 'K';
                            },
                            font: {
                                size: 12
                            }
                        },
                        grid: {
                            color: 'rgba(0, 0, 0, 0.05)',
                            drawBorder: false
                        }
                    },
                    x: {
                        title: {
                            display: true,
                            text: 'Products',
                            font: {
                                size: 14,
                                weight: 'bold'
                            }
                        },
                        ticks: {
                            maxRotation: 45,
                            minRotation: 45,
                            font: {
                                size: 11
                            }
                        },
                        grid: {
                            display: false
                        }
                    }
                }
            }
        });

        console.log('✅ Revenue chart initialized');
    }

    /**
     * Update all charts with new data
     */
    async updateAllCharts(newData) {
        console.log('🔄 Updating all charts with new data...');
        
        try {
            if (this.charts.sales && newData.salesData) {
                this.updateSalesChart(newData.salesData);
            }
            
            if (this.charts.category && newData.categoryData) {
                this.updateCategoryChart(newData.categoryData);
            }
            
            if (this.charts.revenue && newData.productRevenueData) {
                this.updateRevenueChart(newData.productRevenueData);
            }
            
            console.log('✅ All charts updated successfully');
        } catch (error) {
            console.error('❌ Chart update failed:', error);
            throw error;
        }
    }

    /**
     * Update sales chart data
     */
    updateSalesChart(newSalesData) {
        if (!this.charts.sales) return;
        
        const chart = this.charts.sales;
        const chartData = newSalesData.length > 0 ? newSalesData : [
            { month: 'Jan', sales: 0 },
            { month: 'Feb', sales: 0 },
            { month: 'Mar', sales: 0 }
        ];
        
        chart.data.labels = chartData.map(d => d.month);
        chart.data.datasets[0].data = chartData.map(d => parseFloat(d.sales) || 0);
        chart.update('none'); // No animation for updates
    }

    /**
     * Update category chart data
     */
    updateCategoryChart(newCategoryData) {
        if (!this.charts.category) return;
        
        const chart = this.charts.category;
        const chartData = newCategoryData.length > 0 ? newCategoryData : [
            { name: 'No Categories', value: 1 }
        ];
        
        chart.data.labels = chartData.map(d => d.name);
        chart.data.datasets[0].data = chartData.map(d => parseInt(d.value) || 0);
        chart.update('none');
    }

    /**
     * Update revenue chart data
     */
    updateRevenueChart(newRevenueData) {
        if (!this.charts.revenue) return;
        
        const chart = this.charts.revenue;
        const chartData = newRevenueData.length > 0 ? newRevenueData : [
            { name: 'No Products', revenue: 0 }
        ];
        
        chart.data.labels = chartData.map(d => this.truncateLabel(d.name, 15));
        chart.data.datasets[0].data = chartData.map(d => parseFloat(d.revenue) || 0);
        chart.update('none');
    }

    /**
     * Resize all charts
     */
    resizeAllCharts() {
        Object.values(this.charts).forEach(chart => {
            if (chart && typeof chart.resize === 'function') {
                chart.resize();
            }
        });
    }

    /**
     * Destroy all charts
     */
    destroyAllCharts() {
        console.log('🗑️ Destroying all charts...');
        
        Object.values(this.charts).forEach(chart => {
            if (chart && typeof chart.destroy === 'function') {
                chart.destroy();
            }
        });
        
        this.charts = {};
        console.log('✅ All charts destroyed');
    }

    /**
     * Export charts as images
     */
    exportChartsAsImages() {
        const exports = {};
        
        Object.entries(this.charts).forEach(([name, chart]) => {
            if (chart && typeof chart.toBase64Image === 'function') {
                exports[name] = chart.toBase64Image();
            }
        });
        
        return exports;
    }

    /**
     * Utility function to truncate long labels
     */
    truncateLabel(label, maxLength) {
        if (!label) return '';
        return label.length > maxLength ? label.substring(0, maxLength) + '...' : label;
    }

    /**
     * Get chart statistics
     */
    getChartStats() {
        const stats = {};
        Object.entries(this.charts).forEach(([name, chart]) => {
            if (chart && chart.data) {
                // Chart.js v4+ labels/datasets can be functions or arrays
                let labels = chart.data.labels;
                if (typeof labels === 'function') labels = labels();
                if (!Array.isArray(labels)) labels = [];
                let datasets = chart.data.datasets;
                if (typeof datasets === 'function') datasets = datasets();
                if (!Array.isArray(datasets)) datasets = [];
                let totalDataPoints = 0;
                datasets.forEach(ds => {
                    let data = ds.data;
                    if (typeof data === 'function') data = data();
                    if (!Array.isArray(data)) data = [];
                    totalDataPoints += data.length;
                });
                stats[name] = {
                    labels: labels.length,
                    datasets: datasets.length,
                    totalDataPoints
                };
            }
        });
        return stats;
    }
}

// Create global instance
window.dashboardCharts = new DashboardCharts();

// Fetch dashboard data and initialize charts
async function fetchAndInitDashboardCharts() {
    try {
        const response = await fetch('/api/dashboard-charts');
        const result = await response.json();
        if (result.success && result.data) {
            await window.dashboardCharts.initializeAll(result.data);
        } else {
            console.error('Failed to load dashboard chart data:', result.message);
        }
    } catch (err) {
        console.error('Error fetching dashboard chart data:', err);
    }
}

// On DOM ready, fetch and initialize charts
document.addEventListener('DOMContentLoaded', fetchAndInitDashboardCharts);

// Handle window resize
window.addEventListener('resize', () => {
    if (window.dashboardCharts) {
        window.dashboardCharts.resizeAllCharts();
    }
});

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DashboardCharts;
}
