// Quick test script to verify JWT token generation
require('dotenv').config();
const jwt = require('jsonwebtoken');

console.log('=== JWT Token Generation Test ===');
console.log('JWT_SECRET defined:', !!process.env.JWT_SECRET);
console.log('JWT_SECRET length:', process.env.JWT_SECRET ? process.env.JWT_SECRET.length : 0);

if (!process.env.JWT_SECRET) {
    console.error('❌ JWT_SECRET is not defined in environment variables!');
    process.exit(1);
}

try {
    // Test token generation
    const testPayload = {
        id: 1,
        email: 'test@example.com',
        role: 'customer'
    };
    
    const token = jwt.sign(testPayload, process.env.JWT_SECRET, { expiresIn: '24h' });
    console.log('✅ Token generated successfully');
    console.log('Token (first 50 chars):', token.substring(0, 50) + '...');
    
    // Test token verification
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log('✅ Token verified successfully');
    console.log('Decoded payload:', decoded);
    
} catch (error) {
    console.error('❌ Token generation/verification failed:', error.message);
}
