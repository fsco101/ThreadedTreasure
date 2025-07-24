const nodemailer = require('nodemailer');

class EmailService {
    constructor() {
        this.transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.EMAIL_USER || 'your-gmail@gmail.com',
                pass: process.env.EMAIL_PASSWORD || 'your-app-password'
            }
        });
    }

    async sendOrderConfirmation(orderData) {
        try {
            const receiptHTML = this.generateReceiptHTML(orderData);
            
            const mailOptions = {
                from: `"ThreadedTreasure" <${process.env.EMAIL_USER || 'noreply@threadedtreasure.com'}>`,
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
                from: `"ThreadedTreasure" <${process.env.EMAIL_USER || 'noreply@threadedtreasure.com'}>`,
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

        const formatPrice = (price) => `$${parseFloat(price).toFixed(2)}`;
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
                .support-info {
                    margin-top: 15px;
                    color: #bbb;
                }
                @media (max-width: 600px) {
                    body { padding: 10px; }
                    .header, .content { padding: 20px; }
                    .order-details { flex-direction: column; }
                }
            </style>
        </head>
        <body>
            <div class="receipt-container">
                <!-- Header -->
                <div class="header">
                    <h1>ThreadedTreasure</h1>
                    <p>Thank you for your order!</p>
                </div>

                <!-- Order Info -->
                <div class="order-info">
                    <h2>Order Confirmation</h2>
                    <div class="order-details">
                        <div class="detail-item">
                            <strong>Order Number:</strong> ${orderNumber}
                        </div>
                        <div class="detail-item">
                            <strong>Order Date:</strong> ${formatDate(createdAt)}
                        </div>
                        <div class="detail-item">
                            <strong>Customer:</strong> ${customer.name || customer.email}
                        </div>
                        <div class="detail-item">
                            <strong>Status:</strong> Processing
                        </div>
                    </div>
                </div>

                <!-- Content -->
                <div class="content">
                    <!-- Items -->
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
                                ${items.map(item => `
                                    <tr>
                                        <td>
                                            <div class="item-name">${item.name}</div>
                                            ${item.size || item.color ? `<div class="item-details">
                                                ${item.size ? `Size: ${item.size}` : ''}
                                                ${item.size && item.color ? ', ' : ''}
                                                ${item.color ? `Color: ${item.color}` : ''}
                                            </div>` : ''}
                                        </td>
                                        <td>${item.quantity}</td>
                                        <td>${formatPrice(item.price)}</td>
                                        <td>${formatPrice(item.price * item.quantity)}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>

                    <!-- Shipping Address -->
                    <div class="section">
                        <h3>Shipping Address</h3>
                        <div class="address-section">
                            <strong>${shippingAddress.name}</strong><br>
                            ${shippingAddress.address_line_1}<br>
                            ${shippingAddress.address_line_2 ? `${shippingAddress.address_line_2}<br>` : ''}
                            ${shippingAddress.city}, ${shippingAddress.state} ${shippingAddress.postal_code}<br>
                            ${shippingAddress.country || 'United States'}
                            ${shippingAddress.phone ? `<br>Phone: ${shippingAddress.phone}` : ''}
                        </div>
                    </div>

                    <!-- Payment Method -->
                    <div class="section">
                        <h3>Payment Method</h3>
                        <div class="address-section">
                            <strong>${paymentMethod.method || paymentMethod}</strong>
                            ${paymentMethod.last4 ? `<br>**** **** **** ${paymentMethod.last4}` : ''}
                        </div>
                    </div>

                    <!-- Order Totals -->
                    <div class="totals-section">
                        <div class="total-row">
                            <span>Subtotal:</span>
                            <span>${formatPrice(subtotal)}</span>
                        </div>
                        <div class="total-row">
                            <span>Shipping:</span>
                            <span>${formatPrice(shipping)}</span>
                        </div>
                        ${tax > 0 ? `
                            <div class="total-row">
                                <span>Tax:</span>
                                <span>${formatPrice(tax)}</span>
                            </div>
                        ` : ''}
                        ${discount > 0 ? `
                            <div class="total-row">
                                <span>Discount:</span>
                                <span>-${formatPrice(discount)}</span>
                            </div>
                        ` : ''}
                        <div class="total-row final">
                            <span>Total:</span>
                            <span>${formatPrice(total)}</span>
                        </div>
                    </div>

                    <!-- Delivery Info -->
                    <div class="section">
                        <h3>Delivery Information</h3>
                        <p><strong>Estimated Delivery:</strong> 3-5 business days</p>
                        <p>We'll send you tracking information once your order ships.</p>
                    </div>
                </div>

                <!-- Footer -->
                <div class="footer">
                    <p><strong>Thank you for shopping with ThreadedTreasure!</strong></p>
                    <div class="support-info">
                        <p>Questions about your order? Contact us at support@threadedtreasure.com</p>
                        <p>Order tracking and returns: www.threadedtreasure.com/account</p>
                    </div>
                </div>
            </div>
        </body>
        </html>
        `;
    }

    generateStatusUpdateHTML(orderData) {
        const {
            orderNumber, customer, items, shippingAddress, paymentMethod,
            subtotal, shipping, tax, discount, total, createdAt, status, notes
        } = orderData;
        const formatPrice = (price) => `$${parseFloat(price).toFixed(2)}`;
        const formatDate = (date) => new Date(date).toLocaleDateString('en-US', {
            year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
        });
        return `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
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
                .support-info {
                    margin-top: 15px;
                    color: #bbb;
                }
                @media (max-width: 600px) {
                    body { padding: 10px; }
                    .header, .content { padding: 20px; }
                    .order-details { flex-direction: column; }
                }
            </style>
        </head>
        <body>
            <div class="receipt-container">
                <!-- Header -->
                <div class="header">
                    <h1>ThreadedTreasure</h1>
                    <p>Your order status has been updated!</p>
                </div>

                <!-- Order Info -->
                <div class="order-info">
                    <h2>Order Status Update</h2>
                    <div class="order-details">
                        <div class="detail-item">
                            <strong>Order Number:</strong> ${orderNumber}
                        </div>
                        <div class="detail-item">
                            <strong>Order Date:</strong> ${formatDate(createdAt)}
                        </div>
                        <div class="detail-item">
                            <strong>Customer:</strong> ${customer.name || customer.email}
                        </div>
                        <div class="detail-item">
                            <strong>Status:</strong> ${status}
                        </div>
                    </div>
                    ${notes ? `<div style="margin-top:10px;"><strong>Admin Notes:</strong> ${notes}</div>` : ''}
                </div>

                <!-- Content -->
                <div class="content">
                    <!-- Items -->
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
                                ${items.map(item => `
                                    <tr>
                                        <td>
                                            <div class="item-name">${item.name}</div>
                                            ${item.size || item.color ? `<div class="item-details">
                                                ${item.size ? `Size: ${item.size}` : ''}
                                                ${item.size && item.color ? ', ' : ''}
                                                ${item.color ? `Color: ${item.color}` : ''}
                                            </div>` : ''}
                                        </td>
                                        <td>${item.quantity}</td>
                                        <td>${formatPrice(item.price)}</td>
                                        <td>${formatPrice(item.price * item.quantity)}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>

                    <!-- Shipping Address -->
                    <div class="section">
                        <h3>Shipping Address</h3>
                        <div class="address-section">
                            <strong>${shippingAddress.name}</strong><br>
                            ${shippingAddress.address_line_1}<br>
                            ${shippingAddress.address_line_2 ? `${shippingAddress.address_line_2}<br>` : ''}
                            ${shippingAddress.city}, ${shippingAddress.state} ${shippingAddress.postal_code}<br>
                            ${shippingAddress.country || 'United States'}
                            ${shippingAddress.phone ? `<br>Phone: ${shippingAddress.phone}` : ''}
                        </div>
                    </div>

                    <!-- Payment Method -->
                    <div class="section">
                        <h3>Payment Method</h3>
                        <div class="address-section">
                            <strong>${paymentMethod.method || paymentMethod}</strong>
                            ${paymentMethod.last4 ? `<br>**** **** **** ${paymentMethod.last4}` : ''}
                        </div>
                    </div>

                    <!-- Order Totals -->
                    <div class="totals-section">
                        <div class="total-row">
                            <span>Subtotal:</span>
                            <span>${formatPrice(subtotal)}</span>
                        </div>
                        <div class="total-row">
                            <span>Shipping:</span>
                            <span>${formatPrice(shipping)}</span>
                        </div>
                        ${tax > 0 ? `
                            <div class="total-row">
                                <span>Tax:</span>
                                <span>${formatPrice(tax)}</span>
                            </div>
                        ` : ''}
                        ${discount > 0 ? `
                            <div class="total-row">
                                <span>Discount:</span>
                                <span>-${formatPrice(discount)}</span>
                            </div>
                        ` : ''}
                        <div class="total-row final">
                            <span>Total:</span>
                            <span>${formatPrice(total)}</span>
                        </div>
                    </div>

                    <!-- Delivery Info -->
                    <div class="section">
                        <h3>Delivery Information</h3>
                        <p><strong>Estimated Delivery:</strong> 3-5 business days</p>
                        <p>We'll send you tracking information once your order ships.</p>
                    </div>
                </div>

                <!-- Footer -->
                <div class="footer">
                    <p><strong>Thank you for shopping with ThreadedTreasure!</strong></p>
                    <div class="support-info">
                        <p>Questions about your order? Contact us at support@threadedtreasure.com</p>
                        <p>Order tracking and returns: www.threadedtreasure.com/account</p>
                    </div>
                </div>
            </div>
        </body>
        </html>
        `;
    }

    async testConnection() {
        try {
            await this.transporter.verify();
            console.log('Email service is ready');
            return true;
        } catch (error) {
            console.error('Email service error:', error);
            return false;
        }
    }
}

module.exports = EmailService;
