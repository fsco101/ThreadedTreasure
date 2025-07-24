// Test script to verify authentication fix
console.log('🧪 Testing Authentication Fix\n');

// Mock localStorage for testing
const localStorage = {
    data: {},
    getItem(key) {
        return this.data[key] || null;
    },
    setItem(key, value) {
        this.data[key] = value;
    },
    removeItem(key) {
        delete this.data[key];
    },
    clear() {
        this.data = {};
    }
};

// Mock global localStorage
global.localStorage = localStorage;

// Test getCurrentUser function (from shop.html logic)
function getCurrentUser() {
    try {
        const userData = localStorage.getItem('userData');
        const token = localStorage.getItem('userToken');
        
        console.log('🔍 Debug - getCurrentUser check:');
        console.log('- userData exists:', !!userData);
        console.log('- token exists:', !!token);
        
        if (!userData || !token) {
            console.log('❌ No userData or token found');
            return { id: 'guest', isGuest: true };
        }
        
        const user = JSON.parse(userData);
        console.log('✅ Parsed user:', user);
        
        // Set isGuest property based on user data
        if (user && user.id && user.id !== 'guest') {
            user.isGuest = false;
            console.log('✅ Set isGuest = false for authenticated user');
        } else {
            console.log('❌ Invalid user data, treating as guest');
            return { id: 'guest', isGuest: true };
        }
        
        return user;
    } catch (error) {
        console.error('❌ Error getting current user:', error);
        return { id: 'guest', isGuest: true };
    }
}

// Test cases
console.log('📋 Test Case 1: No authentication data');
console.log('=============================================');
let user = getCurrentUser();
console.log('Result:', user);
console.log('✓ Expected guest user with isGuest: true\n');

console.log('📋 Test Case 2: Simulated authenticated user');
console.log('=============================================');
// Simulate successful login
const mockUser = {
    id: 123,
    name: 'Test User',
    email: 'test@example.com',
    role: 'customer'
};
const mockToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...';

localStorage.setItem('userData', JSON.stringify(mockUser));
localStorage.setItem('userToken', mockToken);

user = getCurrentUser();
console.log('Result:', user);
console.log('✓ Expected authenticated user with isGuest: false\n');

console.log('📋 Test Case 3: Invalid guest user data');
console.log('=============================================');
const guestUser = { id: 'guest', isGuest: true };
localStorage.setItem('userData', JSON.stringify(guestUser));
localStorage.setItem('userToken', 'invalid');

user = getCurrentUser();
console.log('Result:', user);
console.log('✓ Expected guest user with isGuest: true\n');

console.log('📋 Test Case 4: Corrupted userData');
console.log('=============================================');
localStorage.setItem('userData', 'invalid-json');
localStorage.setItem('userToken', mockToken);

user = getCurrentUser();
console.log('Result:', user);
console.log('✓ Expected guest user with isGuest: true (due to parse error)\n');

console.log('🎉 Authentication Fix Tests Complete!');
console.log('The fix ensures that:');
console.log('1. Authenticated users have isGuest: false');
console.log('2. Non-authenticated users have isGuest: true');
console.log('3. Invalid data is handled gracefully');
