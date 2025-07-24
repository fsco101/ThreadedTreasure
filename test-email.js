require('dotenv').config();
const EmailService = require('./services/emailService');

async function testEmailService() {
    console.log('Testing Email Service...');
    
    const emailService = new EmailService();
    
    // Test connection
    console.log('Testing email connection...');
    const connectionTest = await emailService.testConnection();
    console.log('Connection test result:', connectionTest);
    
    // Test email sending with sample data
    const sampleOrderData = {
        orderNumber: 'TT' + Date.now(),
        customer: {
            email: process.env.EMAIL_USER, // Send to yourself for testing
            name: 'Test Customer'
        },
        items: [
            {
                name: 'Sample Product',
                quantity: 2,
                price: 29.99,
                size: 'M',
                color: 'Blue'
            }
        ],
        shippingAddress: {
            name: 'Test Customer',
            address_line_1: '123 Test Street',
            city: 'Test City',
            state: 'CA',
            postal_code: '12345',
            country: 'United States',
            phone: '(555) 123-4567'
        },
        paymentMethod: {
            method: 'Credit Card',
            last4: '1234'
        },
        subtotal: 59.98,
        shipping: 9.99,
        tax: 5.40,
        discount: 0,
        total: 75.37,
        createdAt: new Date()
    };
    
    console.log('Testing email sending...');
    const emailResult = await emailService.sendOrderConfirmation(sampleOrderData);
    console.log('Email result:', emailResult);
    
    console.log('Email service test completed!');
}

testEmailService().catch(console.error);
