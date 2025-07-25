const nodemailer = require('nodemailer');
const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs').promises;

class EmailService {
    constructor() {
        // Gmail configuration - simplified to always use Gmail
        this.transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASSWORD
            }
        });
        
        console.log('📧 Email service configured for Gmail:', process.env.EMAIL_USER);
    }

    async sendOrderConfirmation(orderData) {
        try {
            const receiptHTML = this.generateReceiptHTML(orderData);
            
            const mailOptions = {
                from: `"ThreadedTreasure" <${process.env.EMAIL_USER}>`,
                to: orderData.customer.email,
                subject: `Order Confirmation #${orderData.orderNumber}`,
                html: receiptHTML
            };

            const result = await this.transporter.sendMail(mailOptions);
            console.log('Order confirmation email sent:', result.messageId);
            return { success: true, messageId: result.messageId };
        } catch (error) {
            console.error('Failed to send order confirmation email:', error);
            return { success: false, error: error.message };
        }
    }

    async sendOrderStatusUpdate(orderData) {
        try {
            const receiptHTML = this.generateStatusUpdateHTML(orderData);
            const mailOptions = {
                from: `"ThreadedTreasure" <${process.env.EMAIL_USER}>`,
                to: orderData.customer.email,
                subject: `Order Status Update #${orderData.orderNumber} - ${orderData.status}`,
                html: receiptHTML
            };
            const result = await this.transporter.sendMail(mailOptions);
            console.log('Order status update email sent:', result.messageId);
            return { success: true, messageId: result.messageId };
        } catch (error) {
            console.error('Failed to send order status update email:', error);
            return { success: false, error: error.message };
        }
    }

    async sendOrderStatusUpdateWithPDF(orderData) {
        try {
            // Generate PDF receipt
            const pdfBuffer = await this.generateOrderReceiptPDF(orderData);
            
            // Generate status update HTML
            const statusHTML = this.generateStatusUpdateHTML(orderData);
            
            const mailOptions = {
                from: `"ThreadedTreasure" <${process.env.EMAIL_USER}>`,
                to: orderData.customer.email,
                subject: `Order Status Update #${orderData.orderNumber} - ${this.getStatusDisplayName(orderData.status)}`,
                html: statusHTML,
                attachments: [
                    {
                        filename: `Order-${orderData.orderNumber}-Receipt.pdf`,
                        content: pdfBuffer,
                        contentType: 'application/pdf'
                    }
                ]
            };

            const result = await this.transporter.sendMail(mailOptions);
            console.log('✅ Order status update email with PDF sent:', result.messageId);
            return { success: true, messageId: result.messageId };
        } catch (error) {
            console.error('❌ Failed to send order status update email with PDF:', error);
            return { success: false, error: error.message };
        }
    }

    async generateOrderReceiptPDF(orderData) {
        let browser;
        try {
            browser = await puppeteer.launch({ 
                headless: 'new',
                args: ['--no-sandbox', '--disable-setuid-sandbox']
            });
            const page = await browser.newPage();
            
            const receiptHTML = this.generateReceiptHTML(orderData);
            await page.setContent(receiptHTML);
            
            const pdfBuffer = await page.pdf({
                format: 'A4',
                printBackground: true,
                margin: {
                    top: '1cm',
                    right: '1cm',
                    bottom: '1cm',
                    left: '1cm'
                }
            });

            return pdfBuffer;
        } catch (error) {
            console.error('❌ Failed to generate PDF:', error);
            throw error;
        } finally {
            if (browser) {
                await browser.close();
            }
        }
    }

    getStatusDisplayName(status) {
        const statusMap = {
            'pending': 'Pending',
            'processing': 'Processing',
            'shipped': 'Shipped',
            'delivered': 'Delivered',
            'cancelled': 'Cancelled',
            'refunded': 'Refunded'
        };
        return statusMap[status] || status.charAt(0).toUpperCase() + status.slice(1);
    }

    generateReceiptHTML(orderData) {
        const {
            orderNumber,
            customer,
            items,
            shippingAddress,
            paymentMethod,
            subtotal,
            shipping,
            tax,
            discount,
            total,
            createdAt
        } = orderData;

        const formatPrice = (price) => `$${parseFloat(price || 0).toFixed(2)}`;
        const formatDate = (date) => new Date(date).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });

        return `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Order Receipt</title>
            <style>
                body {
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
                    line-height: 1.6;
                    color: #333;
                    margin: 0;
                    padding: 20px;
                    background-color: #f5f5f5;
                }
                .receipt-container {
                    max-width: 600px;
                    margin: 0 auto;
                    background: white;
                    border-radius: 8px;
                    box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                    overflow: hidden;
                }
                .header {
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: white;
                    padding: 30px;
                    text-align: center;
                }
                .header h1 {
                    margin: 0;
                    font-size: 28px;
                    font-weight: 300;
                }
                .order-info {
                    background: #f8f9fa;
                    padding: 20px 30px;
                    border-bottom: 1px solid #eee;
                }
                .order-info h2 {
                    margin: 0 0 10px 0;
                    color: #2c3e50;
                    font-size: 20px;
                }
                .order-details {
                    display: flex;
                    justify-content: space-between;
                    flex-wrap: wrap;
                    gap: 20px;
                }
                .detail-item {
                    color: #666;
                }
                .detail-item strong {
                    color: #333;
                }
                .content {
                    padding: 30px;
                }
                .section {
                    margin-bottom: 30px;
                }
                .section h3 {
                    color: #2c3e50;
                    margin-bottom: 15px;
                    font-size: 18px;
                    border-bottom: 2px solid #eee;
                    padding-bottom: 5px;
                }
                .items-table {
                    width: 100%;
                    border-collapse: collapse;
                    margin-bottom: 20px;
                }
                .items-table th,
                .items-table td {
                    padding: 12px;
                    text-align: left;
                    border-bottom: 1px solid #eee;
                }
                .items-table th {
                    background-color: #f8f9fa;
                    font-weight: 600;
                    color: #555;
                }
                .items-table .item-name {
                    font-weight: 500;
                }
                .items-table .item-details {
                    color: #666;
                    font-size: 14px;
                }
                .address-section {
                    background: #f8f9fa;
                    padding: 15px;
                    border-radius: 6px;
                    border-left: 4px solid #667eea;
                }
                .totals-section {
                    background: #f8f9fa;
                    padding: 20px;
                    border-radius: 6px;
                    margin-top: 20px;
                }
                .total-row {
                    display: flex;
                    justify-content: space-between;
                    margin-bottom: 8px;
                }
                .total-row.final {
                    border-top: 2px solid #ddd;
                    padding-top: 10px;
                    margin-top: 10px;
                    font-weight: bold;
                    font-size: 18px;
                    color: #2c3e50;
                }
                .footer {
                    background: #2c3e50;
                    color: white;
                    padding: 20px 30px;
                    text-align: center;
                    font-size: 14px;
                }
            </style>
        </head>
        <body>
            <div class="receipt-container">
                <div class="header">
                    <h1>ThreadedTreasure</h1>
                    <p>Order Receipt</p>
                </div>

                <div class="order-info">
                    <h2>Order #${orderNumber}</h2>
                    <div class="order-details">
                        <div class="detail-item">
                            <strong>Date:</strong> ${formatDate(createdAt)}
                        </div>
                        <div class="detail-item">
                            <strong>Customer:</strong> ${customer.name}
                        </div>
                        <div class="detail-item">
                            <strong>Email:</strong> ${customer.email}
                        </div>
                    </div>
                </div>

                <div class="content">
                    <div class="section">
                        <h3>Order Items</h3>
                        <table class="items-table">
                            <thead>
                                <tr>
                                    <th>Item</th>
                                    <th>Qty</th>
                                    <th>Price</th>
                                    <th>Total</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${(items || []).map(item => `
                                    <tr>
                                        <td>
                                            <div class="item-name">${item.name}</div>
                                            <div class="item-details">
                                                ${item.size ? `Size: ${item.size}` : ''}
                                                ${item.color ? ` • Color: ${item.color}` : ''}
                                            </div>
                                        </td>
                                        <td>${item.quantity}</td>
                                        <td>${formatPrice(item.price)}</td>
                                        <td>${formatPrice(item.total || (item.price * item.quantity))}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>

                    <div class="totals-section">
                        <div class="total-row">
                            <span>Subtotal:</span>
                            <span>${formatPrice(subtotal)}</span>
                        </div>
                        <div class="total-row">
                            <span>Shipping:</span>
                            <span>${formatPrice(shipping)}</span>
                        </div>
                        <div class="total-row">
                            <span>Tax:</span>
                            <span>${formatPrice(tax)}</span>
                        </div>
                        <div class="total-row final">
                            <span>Total:</span>
                            <span>${formatPrice(total)}</span>
                        </div>
                    </div>
                </div>

                <div class="footer">
                    <p><strong>ThreadedTreasure</strong></p>
                    <p>Thank you for your business!</p>
                    <p>Contact: support@threadedtreasure.com</p>
                </div>
            </div>
        </body>
        </html>
        `;
    }

    generateStatusUpdateHTML(orderData) {
        const {
            orderNumber, customer, items, status, payment_status,
            subtotal, shipping, tax, total, createdAt, updatedAt
        } = orderData;
        
        const formatPrice = (price) => `$${parseFloat(price || 0).toFixed(2)}`;
        const formatDate = (date) => new Date(date).toLocaleDateString('en-US', {
            year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
        });

        const getStatusColor = (status) => {
            const colors = {
                'pending': '#f39c12',
                'processing': '#3498db',
                'shipped': '#9b59b6',
                'delivered': '#27ae60',
                'cancelled': '#e74c3c',
                'refunded': '#95a5a6'
            };
            return colors[status] || '#34495e';
        };

        const getStatusMessage = (status) => {
            const messages = {
                'pending': 'Your order has been received and is being processed.',
                'processing': 'Your order is currently being prepared for shipment.',
                'shipped': 'Your order has been shipped and is on its way to you!',
                'delivered': 'Your order has been successfully delivered. Thank you for shopping with us!',
                'cancelled': 'Your order has been cancelled. If you have any questions, please contact us.',
                'refunded': 'Your order has been refunded. The refund will appear in your account within 3-5 business days.'
            };
            return messages[status] || 'Your order status has been updated.';
        };

        return `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Order Status Update</title>
            <style>
                body {
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
                    line-height: 1.6;
                    color: #333;
                    margin: 0;
                    padding: 20px;
                    background-color: #f5f5f5;
                }
                .email-container {
                    max-width: 600px;
                    margin: 0 auto;
                    background: white;
                    border-radius: 8px;
                    box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                    overflow: hidden;
                }
                .header {
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: white;
                    padding: 30px;
                    text-align: center;
                }
                .header h1 {
                    margin: 0 0 10px 0;
                    font-size: 28px;
                    font-weight: 300;
                }
                .status-banner {
                    background: ${getStatusColor(status)};
                    color: white;
                    padding: 20px 30px;
                    text-align: center;
                    font-size: 18px;
                    font-weight: bold;
                }
                .content {
                    padding: 30px;
                }
                .order-info {
                    background: #f8f9fa;
                    padding: 20px;
                    border-radius: 6px;
                    margin-bottom: 20px;
                }
                .order-details {
                    display: flex;
                    justify-content: space-between;
                    flex-wrap: wrap;
                    gap: 20px;
                    margin-bottom: 20px;
                }
                .detail-item {
                    flex: 1;
                    min-width: 200px;
                }
                .detail-item strong {
                    display: block;
                    color: #2c3e50;
                    margin-bottom: 5px;
                }
                .items-section h3 {
                    color: #2c3e50;
                    margin-bottom: 15px;
                    border-bottom: 2px solid #eee;
                    padding-bottom: 10px;
                }
                .item {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 10px 0;
                    border-bottom: 1px solid #eee;
                }
                .item:last-child {
                    border-bottom: none;
                }
                .item-details {
                    flex: 1;
                }
                .item-name {
                    font-weight: 500;
                    margin-bottom: 5px;
                }
                .item-specs {
                    color: #666;
                    font-size: 14px;
                }
                .item-price {
                    font-weight: bold;
                    color: #2c3e50;
                }
                .totals {
                    background: #f8f9fa;
                    padding: 20px;
                    border-radius: 6px;
                    margin-top: 20px;
                }
                .total-row {
                    display: flex;
                    justify-content: space-between;
                    margin-bottom: 8px;
                }
                .total-row.final {
                    border-top: 2px solid #ddd;
                    padding-top: 10px;
                    margin-top: 10px;
                    font-weight: bold;
                    font-size: 18px;
                    color: #2c3e50;
                }
                .footer {
                    background: #2c3e50;
                    color: white;
                    padding: 20px 30px;
                    text-align: center;
                    font-size: 14px;
                }
                .footer a {
                    color: #3498db;
                    text-decoration: none;
                }
                .status-timeline {
                    margin: 20px 0;
                    padding: 15px;
                    background: #f8f9fa;
                    border-radius: 6px;
                    border-left: 4px solid ${getStatusColor(status)};
                }
            </style>
        </head>
        <body>
            <div class="email-container">
                <div class="header">
                    <h1>ThreadedTreasure</h1>
                    <p>Order Status Update</p>
                </div>

                <div class="status-banner">
                    Order #${orderNumber} is now ${this.getStatusDisplayName(status).toUpperCase()}
                </div>

                <div class="content">
                    <div class="status-timeline">
                        <strong>📦 ${getStatusMessage(status)}</strong>
                        <p style="margin: 10px 0 0 0; color: #666;">
                            Updated on ${formatDate(updatedAt || new Date())}
                        </p>
                    </div>

                    <div class="order-info">
                        <div class="order-details">
                            <div class="detail-item">
                                <strong>Order Number</strong>
                                #${orderNumber}
                            </div>
                            <div class="detail-item">
                                <strong>Order Date</strong>
                                ${formatDate(createdAt)}
                            </div>
                            <div class="detail-item">
                                <strong>Payment Status</strong>
                                ${this.getStatusDisplayName(payment_status)}
                            </div>
                        </div>
                    </div>

                    <div class="items-section">
                        <h3>Order Items</h3>
                        ${(items || []).map(item => `
                            <div class="item">
                                <div class="item-details">
                                    <div class="item-name">${item.name}</div>
                                    <div class="item-specs">
                                        Quantity: ${item.quantity}
                                        ${item.size ? ` • Size: ${item.size}` : ''}
                                        ${item.color ? ` • Color: ${item.color}` : ''}
                                    </div>
                                </div>
                                <div class="item-price">${formatPrice(item.total || (item.price * item.quantity))}</div>
                            </div>
                        `).join('')}
                    </div>

                    <div class="totals">
                        <div class="total-row">
                            <span>Subtotal:</span>
                            <span>${formatPrice(subtotal)}</span>
                        </div>
                        <div class="total-row">
                            <span>Shipping:</span>
                            <span>${formatPrice(shipping)}</span>
                        </div>
                        <div class="total-row">
                            <span>Tax:</span>
                            <span>${formatPrice(tax)}</span>
                        </div>
                        <div class="total-row final">
                            <span>Total:</span>
                            <span>${formatPrice(total)}</span>
                        </div>
                    </div>

                    <div style="margin-top: 30px; padding: 20px; background: #e8f4f8; border-radius: 6px; text-align: center;">
                        <p style="margin: 0 0 10px 0; font-weight: bold;">Need Help?</p>
                        <p style="margin: 0; color: #666;">
                            Contact our customer service team at 
                            <a href="mailto:support@threadedtreasure.com">support@threadedtreasure.com</a>
                        </p>
                    </div>
                </div>

                <div class="footer">
                    <p style="margin: 0 0 10px 0;">
                        <strong>ThreadedTreasure</strong><br>
                        Your Fashion Destination
                    </p>
                    <p style="margin: 0; opacity: 0.8;">
                        Track your order • Manage account • Customer support
                    </p>
                </div>
            </div>
        </body>
        </html>
        `;
    }

    async verifyConnection() {
        try {
            await this.transporter.verify();
            console.log('✅ Email service connection verified');
            return true;
        } catch (error) {
            console.error('❌ Email service connection failed:', error);
            return false;
        }
    }
}

module.exports = EmailService;
