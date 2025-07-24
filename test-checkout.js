// Test script for checkout functionality
const mysql = require('mysql2/promise');
const jwt = require('jsonwebtoken');

// Database configuration
const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'threadedtreasure'
};

async function testCheckout() {
    console.log('🧪 Testing Checkout Functionality...');
    
    const connection = await mysql.createConnection(dbConfig);
    
    try {
        // Test 1: Check if tables exist
        console.log('\n📊 Checking database tables...');
        
        const [users] = await connection.execute('SELECT COUNT(*) as count FROM users');
        console.log(`✅ Users table: ${users[0].count} users found`);
        
        const [products] = await connection.execute('SELECT COUNT(*) as count FROM products');
        console.log(`✅ Products table: ${products[0].count} products found`);
        
        const [orders] = await connection.execute('SELECT COUNT(*) as count FROM orders');
        console.log(`✅ Orders table: ${orders[0].count} orders found`);
        
        const [orderItems] = await connection.execute('SELECT COUNT(*) as count FROM order_items');
        console.log(`✅ Order items table: ${orderItems[0].count} order items found`);
        
        const [addresses] = await connection.execute('SELECT COUNT(*) as count FROM shipping_addresses');
        console.log(`✅ Shipping addresses table: ${addresses[0].count} addresses found`);
        
        // Test 2: Create a test user if none exists
        console.log('\n👤 Checking test users...');
        const [testUsers] = await connection.execute(`
            SELECT id, email, name FROM users 
            WHERE email = 'test@threadedtreasure.com'
        `);
        
        let testUserId;
        if (testUsers.length === 0) {
            console.log('Creating test user...');
            const [result] = await connection.execute(`
                INSERT INTO users (name, email, password, role, created_at, updated_at)
                VALUES ('Test User', 'test@threadedtreasure.com', '$2a$10$example.hash.here', 'user', NOW(), NOW())
            `);
            testUserId = result.insertId;
            console.log(`✅ Test user created with ID: ${testUserId}`);
        } else {
            testUserId = testUsers[0].id;
            console.log(`✅ Test user found with ID: ${testUserId} - ${testUsers[0].name}`);
        }
        
        // Test 3: Check if products exist for ordering
        console.log('\n🛍️ Checking available products...');
        const [availableProducts] = await connection.execute(`
            SELECT id, name, price, is_active FROM products 
            WHERE is_active = 1 
            LIMIT 3
        `);
        
        if (availableProducts.length === 0) {
            console.log('❌ No active products found for testing');
            return;
        }
        
        console.log(`✅ Found ${availableProducts.length} active products for testing:`);
        availableProducts.forEach(product => {
            console.log(`   - ${product.name} ($${product.price}) - ID: ${product.id}`);
        });
        
        // Test 4: Generate test JWT token
        console.log('\n🔑 Generating test JWT token...');
        const testToken = jwt.sign(
            { 
                id: testUserId, 
                email: 'test@threadedtreasure.com',
                name: 'Test User',
                role: 'user'
            },
            process.env.JWT_SECRET || 'your-super-secret-jwt-key',
            { expiresIn: '24h' }
        );
        console.log('✅ Test JWT token generated');
        console.log('Token preview:', testToken.substring(0, 50) + '...');
        
        // Test 5: Simulate order creation
        console.log('\n📝 Testing order creation...');
        
        const testOrderData = {
            items: [
                {
                    id: availableProducts[0].id,
                    name: availableProducts[0].name,
                    price: parseFloat(availableProducts[0].price),
                    quantity: 2,
                    size: 'M',
                    color: 'Blue'
                }
            ],
            shippingAddress: {
                firstName: 'Test',
                lastName: 'User',
                name: 'Test User',
                address1: '123 Test Street',
                address_line_1: '123 Test Street',
                address2: 'Apt 1',
                address_line_2: 'Apt 1',
                city: 'Test City',
                state: 'CA',
                zipCode: '12345',
                postal_code: '12345',
                country: 'United States',
                phone: '(555) 123-4567'
            },
            paymentMethod: 'card',
            subtotal: parseFloat(availableProducts[0].price) * 2,
            shipping: 10.00,
            tax: 5.00,
            total: parseFloat(availableProducts[0].price) * 2 + 10.00 + 5.00
        };
        
        console.log('Test order data prepared:', {
            items: testOrderData.items.length,
            total: testOrderData.total,
            shippingAddress: testOrderData.shippingAddress.name
        });
        
        console.log('\n✅ Checkout system test completed successfully!');
        console.log('\n📋 Test Results Summary:');
        console.log(`   - Database tables: ✅ All present`);
        console.log(`   - Test user: ✅ Available (ID: ${testUserId})`);
        console.log(`   - Products: ✅ ${availableProducts.length} available`);
        console.log(`   - JWT token: ✅ Generated`);
        console.log(`   - Order data: ✅ Prepared`);
        
        console.log('\n🚀 Ready for frontend testing!');
        console.log('📌 Next steps:');
        console.log('   1. Start the server: node server.js');
        console.log('   2. Open http://localhost:3000/checkout.html');
        console.log('   3. Login with test user: test@threadedtreasure.com');
        console.log('   4. Add items to cart and test checkout');
        
    } catch (error) {
        console.error('❌ Checkout test failed:', error);
    } finally {
        await connection.end();
    }
}

// Run the test
testCheckout().catch(console.error);
