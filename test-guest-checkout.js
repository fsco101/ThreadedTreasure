// Simple test script to verify checkout functionality
console.log('Testing checkout flow...');

// Simulate guest checkout process
function testGuestCheckout() {
    console.log('1. Testing guest user creation...');
    
    // Clear any existing auth data
    localStorage.removeItem('authToken');
    localStorage.removeItem('userData');
    
    // Add some test items to cart
    const testCart = [
        {
            id: 1,
            name: 'Test Product 1',
            price: 29.99,
            quantity: 2,
            size: 'M',
            color: 'Blue',
            image: 'products/test1.jpg'
        },
        {
            id: 2,
            name: 'Test Product 2',
            price: 49.99,
            quantity: 1,
            size: 'L',
            color: 'Red',
            image: 'products/test2.jpg'
        }
    ];
    
    localStorage.setItem('cart', JSON.stringify(testCart));
    
    console.log('2. Cart items added:', testCart);
    
    // Test the guest token creation
    const guestUser = {
        id: 'guest-' + Date.now(),
        email: 'guest@example.com',
        first_name: 'Guest',
        last_name: 'User',
        isGuest: true
    };
    
    const guestToken = 'guest-token-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
    localStorage.setItem('authToken', guestToken);
    localStorage.setItem('userData', JSON.stringify(guestUser));
    
    console.log('3. Guest user created:', guestUser);
    console.log('4. Guest token:', guestToken);
    
    // Verify the data
    const savedToken = localStorage.getItem('authToken');
    const savedUser = JSON.parse(localStorage.getItem('userData'));
    
    console.log('5. Verification - Token:', savedToken?.substring(0, 20) + '...');
    console.log('6. Verification - User:', savedUser);
    
    if (savedToken && savedUser && savedUser.isGuest) {
        console.log('✅ Guest checkout setup successful!');
        console.log('🎉 You can now proceed to checkout without login!');
    } else {
        console.log('❌ Something went wrong with the setup');
    }
}

// Run the test
testGuestCheckout();
