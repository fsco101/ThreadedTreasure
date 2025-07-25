// Test Email Functionality
// Run this with: node test-email-notification.js

const EmailService = require('./services/emailService');

async function testEmailNotification() {
    console.log('🧪 Testing email notification system...');
    
    const emailService = new EmailService();
    
    // Test connection first
    console.log('📡 Testing email connection...');
    const connectionTest = await emailService.verifyConnection();
    
    if (!connectionTest) {
        console.log('❌ Email connection failed. Please check your Mailtrap/Gmail configuration.');
        return;
    }
    
    console.log('✅ Email connection successful!');
    
    // Sample order data for testing
    const testOrderData = {
        orderNumber: 'TT123456',
        customer: {
            name: 'John Doe',
            email: 'test@example.com', // Change this to your test email
            phone: '+1234567890'
        },
        items: [
            {
                name: 'Classic Cotton T-Shirt',
                quantity: 2,
                price: 29.99,
                total: 59.98,
                size: 'M',
                color: 'Blue'
            },
            {
                name: 'Denim Jacket',
                quantity: 1,
                price: 79.99,
                total: 79.99,
                color: 'Dark Blue'
            }
        ],
        subtotal: 139.97,
        shipping: 9.99,
        tax: 11.20,
        total: 161.16,
        status: 'shipped',
        payment_status: 'completed',
        createdAt: new Date('2025-07-25'),
        updatedAt: new Date()
    };
    
    console.log('📧 Sending test order status update email with PDF...');
    
    try {
        const result = await emailService.sendOrderStatusUpdateWithPDF(testOrderData);
        
        if (result.success) {
            console.log('✅ Test email sent successfully!');
            console.log(`📬 Message ID: ${result.messageId}`);
            console.log('📨 Check your Mailtrap inbox or email for the notification.');
            console.log('🔗 If using Mailtrap, login to https://mailtrap.io to see the email');
        } else {
            console.log('❌ Failed to send test email:', result.error);
        }
    } catch (error) {
        console.log('❌ Error during email test:', error.message);
    }
}

// Run the test
testEmailNotification();
