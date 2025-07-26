/**
 * Admin Dashboard Charts Manager
 * ThreadedTreasure - Advanced Analytics Dashboard
 */

class DashboardCharts {
    constructor() {
        // Check if Chart.js is available
        if (typeof Chart === 'undefined') {
            console.error('❌ Chart.js is not loaded. Please include Chart.js before dashboard-charts.js');
            return;
        }
        
        this.charts = {};
        this.chartColors = {
            primary: '#667eea',
            secondary: '#764ba2',
            success: '#28a745',
            warning: '#ffc107',
            danger: '#dc3545',
            info: '#17a2b8'
        };
        this.animations = {
            duration: 2000,
            easing: 'easeInOutQuart'
        };
        
        console.log('✅ DashboardCharts initialized');
    }

    /**
     * Initialize all dashboard charts
     */
    async initializeAll(data) {
        console.log('🚀 Initializing all charts with data:', data);
        
        // Check if Chart.js is available
        if (typeof Chart === 'undefined') {
            console.error('❌ Chart.js is not available');
            return;
        }
        
        try {
            // Initialize each chart with error handling
            if (data.salesData && data.salesData.length > 0) {
                await this.initializeSalesChart(data.salesData);
            }
            if (data.categoryData && data.categoryData.length > 0) {
                await this.initializeCategoryChart(data.categoryData);
            }
            if (data.productRevenueData && data.productRevenueData.length > 0) {
                await this.initializeRevenueChart(data.productRevenueData);
            }
            
            console.log('✅ All charts initialized successfully');
        } catch (error) {
            console.error('❌ Chart initialization error:', error);
        }
    }

    /**
     * Initialize Sales Trend Chart (Line Chart)
     */
    async initializeSalesChart(salesData) {
        console.log('📈 Initializing sales chart with data:', salesData);

        const canvas = document.getElementById('salesChart');
        if (!canvas) {
            console.error('❌ Sales chart canvas not found');
            return;
        }

        const ctx = canvas.getContext('2d');
        if (!ctx) {
            console.error('❌ Could not get 2D context for sales chart');
            return;
        }

        // Destroy existing chart if it exists
        if (this.charts.sales) {
            this.charts.sales.destroy();
        }

        const months = salesData.map(d => d.month);
        const sales = salesData.map(d => parseFloat(d.sales) || 0);
        const orders = salesData.map(d => parseInt(d.order_count) || 0);

        this.charts.sales = new Chart(ctx, {
            type: 'line',
            data: {
                labels: months,
                datasets: [
                    {
                        label: 'Sales ($)',
                        data: sales,
                        borderColor: this.chartColors.primary,
                        backgroundColor: this.chartColors.primary + '33',
                        borderWidth: 3,
                        fill: true,
                        tension: 0.4
                    },
                    {
                        label: 'Orders',
                        data: orders,
                        borderColor: this.chartColors.success,
                        backgroundColor: this.chartColors.success + '33',
                        borderWidth: 3,
                        fill: false,
                        tension: 0.4,
                        yAxisID: 'y1'
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    intersect: false,
                    mode: 'index'
                },
                scales: {
                    y: {
                        type: 'linear',
                        display: true,
                        position: 'left',
                        title: {
                            display: true,
                            text: 'Sales ($)'
                        },
                        ticks: {
                            callback: function(value) {
                                return '$' + value.toLocaleString();
                            }
                        }
                    },
                    y1: {
                        type: 'linear',
                        display: true,
                        position: 'right',
                        title: {
                            display: true,
                            text: 'Orders'
                        },
                        grid: {
                            drawOnChartArea: false,
                        },
                    }
                },
                plugins: {
                    legend: {
                        display: true,
                        position: 'top'
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                if (context.datasetIndex === 0) {
                                    return 'Sales: $' + context.parsed.y.toLocaleString();
                                } else {
                                    return 'Orders: ' + context.parsed.y;
                                }
                            }
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
        console.log('📊 Initializing category chart with data:', categoryData);

        const canvas = document.getElementById('categoryChart');
        if (!canvas) {
            console.error('❌ Category chart canvas not found');
            return;
        }

        const ctx = canvas.getContext('2d');
        if (!ctx) {
            console.error('❌ Could not get 2D context for category chart');
            return;
        }

        // Destroy existing chart if it exists
        if (this.charts.category) {
            this.charts.category.destroy();
        }

        const labels = categoryData.map(d => d.name);
        const data = categoryData.map(d => parseInt(d.value) || 0);
        const colors = [
            this.chartColors.primary,
            this.chartColors.success,
            this.chartColors.warning,
            this.chartColors.danger,
            this.chartColors.info,
            this.chartColors.secondary
        ];

        this.charts.category = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [{
                    data: data,
                    backgroundColor: colors.slice(0, data.length),
                    borderWidth: 4,
                    borderColor: '#fff',
                    hoverBorderWidth: 6,
                    hoverOffset: 15
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '60%',
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            usePointStyle: true,
                            padding: 20
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return context.label + ': ' + context.parsed + ' products';
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
        console.log('💰 Initializing revenue chart with data:', revenueData);

        const canvas = document.getElementById('revenueChart');
        if (!canvas) {
            console.error('❌ Revenue chart canvas not found');
            return;
        }

        const ctx = canvas.getContext('2d');
        if (!ctx) {
            console.error('❌ Could not get 2D context for revenue chart');
            return;
        }

        // Destroy existing chart if it exists
        if (this.charts.revenue) {
            this.charts.revenue.destroy();
        }

        const labels = revenueData.map(d => d.name.length > 15 ? d.name.substring(0, 15) + '...' : d.name);
        const revenues = revenueData.map(d => parseFloat(d.revenue) || 0);

        this.charts.revenue = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Revenue ($)',
                    data: revenues,
                    backgroundColor: this.chartColors.warning,
                    borderColor: this.chartColors.warning,
                    borderWidth: 2,
                    borderRadius: 8,
                    borderSkipped: false,
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Revenue ($)'
                        },
                        ticks: {
                            callback: function(value) {
                                return '$' + value.toLocaleString();
                            }
                        }
                    },
                    x: {
                        title: {
                            display: true,
                            text: 'Products'
                        },
                        ticks: {
                            maxRotation: 45,
                            minRotation: 45
                        }
                    }
                },
                plugins: {
                    legend: {
                        display: true,
                        position: 'top'
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return 'Revenue: $' + context.parsed.y.toLocaleString();
                            }
                        }
                    }
                }
            }
        });

        console.log('✅ Revenue chart initialized');
    }

    // Remove the resizeAllCharts method or add it properly
    resizeAllCharts() {
        if (this.charts && typeof this.charts === 'object') {
            Object.values(this.charts).forEach(chart => {
                if (chart && typeof chart.resize === 'function') {
                    chart.resize();
                }
            });
        }
    }

    destroyAllCharts() {
        if (this.charts && typeof this.charts === 'object') {
            Object.values(this.charts).forEach(chart => {
                if (chart && typeof chart.destroy === 'function') {
                    chart.destroy();
                }
            });
            this.charts = {};
        }
    }
}

// Only create instance when Chart.js is available
if (typeof Chart !== 'undefined') {
    window.dashboardCharts = new DashboardCharts();
    console.log('✅ Dashboard charts instance created');
} else {
    console.log('⏳ Waiting for Chart.js to load...');
}

/**
 * Fetch dashboard data and initialize charts
 */
async function fetchAndInitDashboardCharts() {
    try {
        console.log('🔄 Fetching dashboard chart data...');
        const response = await fetch('/api/dashboard-charts');
        const result = await response.json();
        
        console.log('📊 Dashboard data received:', result);
        
        if (result.success && result.data) {
            await window.dashboardCharts.initializeAll(result.data);
        } else {
            console.error('Failed to load dashboard chart data:', result.message);
        }
    } catch (err) {
        console.error('Error fetching dashboard chart data:', err);
    }
}

// Manual bootstrap function
function bootstrapDashboardCharts() {
    fetchAndInitDashboardCharts();
}
window.bootstrapDashboardCharts = bootstrapDashboardCharts;

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
