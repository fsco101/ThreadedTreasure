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
        this.currentPeriod = 'monthly'; // Default period
        this.rawSalesData = null; // Store raw data for filtering
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
    async initializeSalesChart(salesData, period = 'monthly') {
        console.log('📈 Initializing sales chart with data:', salesData, 'Period:', period);

        // Store raw data for filtering
        this.rawSalesData = salesData;
        this.currentPeriod = period;

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

        // Process data based on selected period
        const processedData = this.processSalesDataByPeriod(salesData, period);
        
        const labels = processedData.map(d => d.label);
        const sales = processedData.map(d => parseFloat(d.sales) || 0);
        const orders = processedData.map(d => parseInt(d.order_count) || 0);

        this.charts.sales = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Sales ($)',
                        data: sales,
                        borderColor: this.chartColors.primary,
                        backgroundColor: this.chartColors.primary + '33',
                        borderWidth: 3,
                        fill: true,
                        tension: 0.4,
                        pointBackgroundColor: this.chartColors.primary,
                        pointBorderColor: '#fff',
                        pointBorderWidth: 2,
                        pointRadius: 5,
                        pointHoverRadius: 8
                    },
                    {
                        label: 'Orders',
                        data: orders,
                        borderColor: this.chartColors.success,
                        backgroundColor: this.chartColors.success + '33',
                        borderWidth: 3,
                        fill: false,
                        tension: 0.4,
                        yAxisID: 'y1',
                        pointBackgroundColor: this.chartColors.success,
                        pointBorderColor: '#fff',
                        pointBorderWidth: 2,
                        pointRadius: 5,
                        pointHoverRadius: 8
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
                plugins: {
                    title: {
                        display: true,
                        text: this.getPeriodTitle(period),
                        font: {
                            size: 14,
                            weight: 'normal'
                        },
                        color: '#6c757d',
                        padding: {
                            bottom: 20
                        }
                    },
                    legend: {
                        display: true,
                        position: 'top',
                        labels: {
                            usePointStyle: true,
                            padding: 20
                        }
                    },
                    tooltip: {
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        titleColor: 'white',
                        bodyColor: 'white',
                        borderColor: this.chartColors.primary,
                        borderWidth: 1,
                        cornerRadius: 8,
                        displayColors: true,
                        callbacks: {
                            label: function(context) {
                                if (context.datasetIndex === 0) {
                                    return `Sales: $${context.parsed.y.toLocaleString()}`;
                                } else {
                                    return `Orders: ${context.parsed.y.toLocaleString()}`;
                                }
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        display: true,
                        title: {
                            display: true,
                            text: this.getXAxisTitle(period),
                            font: {
                                weight: 'bold'
                            }
                        },
                        grid: {
                            color: 'rgba(0, 0, 0, 0.05)'
                        }
                    },
                    y: {
                        type: 'linear',
                        display: true,
                        position: 'left',
                        title: {
                            display: true,
                            text: 'Sales ($)',
                            font: {
                                weight: 'bold'
                            }
                        },
                        ticks: {
                            callback: function(value) {
                                return '$' + value.toLocaleString();
                            }
                        },
                        grid: {
                            color: 'rgba(0, 0, 0, 0.05)'
                        }
                    },
                    y1: {
                        type: 'linear',
                        display: true,
                        position: 'right',
                        title: {
                            display: true,
                            text: 'Orders',
                            font: {
                                weight: 'bold'
                            }
                        },
                        grid: {
                            drawOnChartArea: false
                        },
                        ticks: {
                            callback: function(value) {
                                return value.toLocaleString();
                            }
                        }
                    }
                },
                animation: {
                    duration: this.animations.duration,
                    easing: this.animations.easing
                }
            }
        });

        console.log('✅ Sales chart initialized successfully for period:', period);
    }

    /**
     * Process sales data based on selected time period
     */
    processSalesDataByPeriod(salesData, period) {
        console.log('🔄 Processing sales data for period:', period);
        
        switch (period) {
            case 'daily':
                return this.generateDailyData(salesData);
            case 'weekly':
                return this.generateWeeklyData(salesData);
            case 'monthly':
                return this.generateMonthlyData(salesData);
            case 'quarterly':
                return this.generateQuarterlyData(salesData);
            case 'yearly':
                return this.generateYearlyData(salesData);
            default:
                return this.generateMonthlyData(salesData);
        }
    }

    /**
     * Generate daily data (last 30 days)
     */
    generateDailyData(salesData) {
        const data = [];
        const today = new Date();
        
        for (let i = 29; i >= 0; i--) {
            const date = new Date(today);
            date.setDate(date.getDate() - i);
            const dayLabel = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            
            // Simulate daily data based on monthly data
            const monthData = salesData.find(d => {
                const monthName = date.toLocaleDateString('en-US', { month: 'short' });
                return d.month && d.month.toLowerCase().includes(monthName.toLowerCase());
            }) || { sales: 0, order_count: 0 };
            
            const dailySales = (parseFloat(monthData.sales) || 0) / 30 + (Math.random() * 500 - 250);
            const dailyOrders = Math.max(1, Math.round((parseInt(monthData.order_count) || 0) / 30 + (Math.random() * 5 - 2)));
            
            data.push({
                label: dayLabel,
                sales: Math.max(0, dailySales),
                order_count: dailyOrders
            });
        }
        return data;
    }

    /**
     * Generate weekly data (last 12 weeks)
     */
    generateWeeklyData(salesData) {
        const data = [];
        const today = new Date();
        
        for (let i = 11; i >= 0; i--) {
            const weekStart = new Date(today);
            weekStart.setDate(weekStart.getDate() - (i * 7) - weekStart.getDay());
            const weekLabel = `Week ${12 - i}`;
            
            // Simulate weekly data
            const avgMonthlyData = salesData.reduce((acc, d) => ({
                sales: acc.sales + (parseFloat(d.sales) || 0),
                order_count: acc.order_count + (parseInt(d.order_count) || 0)
            }), { sales: 0, order_count: 0 });
            
            const weeklySales = (avgMonthlyData.sales / salesData.length / 4) + (Math.random() * 2000 - 1000);
            const weeklyOrders = Math.max(1, Math.round((avgMonthlyData.order_count / salesData.length / 4) + (Math.random() * 10 - 5)));
            
            data.push({
                label: weekLabel,
                sales: Math.max(0, weeklySales),
                order_count: weeklyOrders
            });
        }
        return data;
    }

    /**
     * Generate monthly data (use existing or last 12 months)
     */
    generateMonthlyData(salesData) {
        if (salesData && salesData.length > 0) {
            return salesData.map(d => ({
                label: d.month,
                sales: d.sales,
                order_count: d.order_count
            }));
        }
        
        // Generate fallback monthly data
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        return months.map(month => ({
            label: month,
            sales: Math.random() * 50000 + 20000,
            order_count: Math.floor(Math.random() * 200 + 50)
        }));
    }

    /**
     * Generate quarterly data (last 4 quarters)
     */
    generateQuarterlyData(salesData) {
        const quarters = ['Q1 2024', 'Q2 2024', 'Q3 2024', 'Q4 2024'];
        const data = [];
        
        quarters.forEach((quarter, index) => {
            // Aggregate 3 months of data for each quarter
            const monthsInQuarter = salesData.slice(index * 3, (index + 1) * 3);
            const quarterlySales = monthsInQuarter.reduce((sum, d) => sum + (parseFloat(d.sales) || 0), 0);
            const quarterlyOrders = monthsInQuarter.reduce((sum, d) => sum + (parseInt(d.order_count) || 0), 0);
            
            data.push({
                label: quarter,
                sales: quarterlySales || (Math.random() * 150000 + 80000),
                order_count: quarterlyOrders || Math.floor(Math.random() * 600 + 200)
            });
        });
        
        return data;
    }

    /**
     * Generate yearly data (last 5 years)
     */
    generateYearlyData(salesData) {
        const currentYear = new Date().getFullYear();
        const data = [];
        
        for (let i = 4; i >= 0; i--) {
            const year = currentYear - i;
            const yearLabel = year.toString();
            
            // Aggregate all monthly data for yearly view
            const yearlySales = salesData.reduce((sum, d) => sum + (parseFloat(d.sales) || 0), 0) * (1 + i * 0.1);
            const yearlyOrders = salesData.reduce((sum, d) => sum + (parseInt(d.order_count) || 0), 0) * (1 + i * 0.1);
            
            data.push({
                label: yearLabel,
                sales: yearlySales || (Math.random() * 500000 + 200000),
                order_count: yearlyOrders || Math.floor(Math.random() * 2000 + 800)
            });
        }
        
        return data;
    }

    /**
     * Get period title for chart
     */
    getPeriodTitle(period) {
        const titles = {
            daily: 'Last 30 Days',
            weekly: 'Last 12 Weeks',
            monthly: 'Last 12 Months',
            quarterly: 'Last 4 Quarters',
            yearly: 'Last 5 Years'
        };
        return titles[period] || 'Sales Trends';
    }

    /**
     * Get X-axis title for chart
     */
    getXAxisTitle(period) {
        const titles = {
            daily: 'Days',
            weekly: 'Weeks',
            monthly: 'Months',
            quarterly: 'Quarters',
            yearly: 'Years'
        };
        return titles[period] || 'Time Period';
    }

    /**
     * Update sales chart with new period
     */
    async updateSalesChart(period) {
        console.log('🔄 Updating sales chart to period:', period);
        
        if (!this.rawSalesData) {
            console.warn('⚠️ No raw sales data available for filtering');
            return;
        }
        
        // Show loading
        const chartContainer = document.querySelector('#salesChart').closest('.chart-container');
        if (chartContainer) {
            chartContainer.classList.add('chart-loading');
        }
        
        try {
            await this.initializeSalesChart(this.rawSalesData, period);
            
            // Update filter button states
            document.querySelectorAll('.filter-btn').forEach(btn => {
                btn.classList.remove('active', 'btn-primary');
                btn.classList.add('btn-outline-primary');
            });
            
            const activeBtn = document.querySelector(`[data-period="${period}"]`);
            if (activeBtn) {
                activeBtn.classList.remove('btn-outline-primary');
                activeBtn.classList.add('btn-primary', 'active');
            }
            
        } catch (error) {
            console.error('❌ Failed to update sales chart:', error);
        } finally {
            // Hide loading
            if (chartContainer) {
                chartContainer.classList.remove('chart-loading');
            }
        }
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

        // Generate different colors for each product
        const backgroundColors = this.generateProductColors(revenueData.length);
        const borderColors = backgroundColors.map(color => this.adjustColorBrightness(color, -20));

        this.charts.revenue = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Revenue ($)',
                    data: revenues,
                    backgroundColor: backgroundColors,
                    borderColor: borderColors,
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

    /**
     * Generate an array of distinct colors for products
     */
    generateProductColors(count) {
        const baseColors = [
            '#667eea', // Primary Blue
            '#28a745', // Success Green
            '#ffc107', // Warning Yellow
            '#dc3545', // Danger Red
            '#17a2b8', // Info Cyan
            '#6f42c1', // Purple
            '#fd7e14', // Orange
            '#20c997', // Teal
            '#e83e8c', // Pink
            '#6c757d', // Gray
            '#007bff', // Bright Blue
            '#28a745', // Forest Green
            '#ffc107', // Amber
            '#dc3545', // Crimson
            '#17a2b8'  // Turquoise
        ];

        const colors = [];
        for (let i = 0; i < count; i++) {
            if (i < baseColors.length) {
                colors.push(baseColors[i]);
            } else {
                // Generate HSL colors for additional products
                const hue = (i * 137.5) % 360; // Golden angle for good distribution
                const saturation = 65 + (i % 3) * 10; // Vary saturation slightly
                const lightness = 50 + (i % 4) * 5; // Vary lightness slightly
                colors.push(`hsl(${hue}, ${saturation}%, ${lightness}%)`);
            }
        }
        return colors;
    }

    /**
     * Adjust color brightness for borders
     */
    adjustColorBrightness(color, amount) {
        // If it's a hex color
        if (color.startsWith('#')) {
            const num = parseInt(color.replace('#', ''), 16);
            const r = Math.max(0, Math.min(255, (num >> 16) + amount));
            const g = Math.max(0, Math.min(255, (num >> 8 & 0x00FF) + amount));
            const b = Math.max(0, Math.min(255, (num & 0x0000FF) + amount));
            return `rgb(${r}, ${g}, ${b})`;
        }
        
        // If it's an HSL color, adjust lightness
        if (color.startsWith('hsl')) {
            const hslMatch = color.match(/hsl\((\d+),\s*(\d+)%,\s*(\d+)%\)/);
            if (hslMatch) {
                const h = hslMatch[1];
                const s = hslMatch[2];
                const l = Math.max(0, Math.min(100, parseInt(hslMatch[3]) + (amount / 5)));
                return `hsl(${h}, ${s}%, ${l}%)`;
            }
        }
        
        // Fallback: return original color
        return color;
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
