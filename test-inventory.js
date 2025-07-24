// Test product creation with inventory table
const axios = require('axios');

async function testProductCreation() {
  try {
    console.log('🧪 Testing product creation with inventory table...');
    
    const baseURL = 'http://localhost:5000';
    
    // First login to get admin token
    const loginResponse = await axios.post(`${baseURL}/api/auth/login`, {
      email: 'admin@threadedtreasure.com',
      password: 'admin123'
    });
    
    const token = loginResponse.data.token;
    console.log('✅ Admin login successful, got token');
    
    // Test product creation
    const productData = {
      name: 'Test Product with Inventory',
      description: 'This is a test product using inventory table for stock management',
      price: 49.99,
      category_id: 1,
      stock_quantity: 25, // This should go to inventory table
      sku: 'TEST-INV-001',
      is_active: 1
    };
    
    console.log('📦 Creating test product...');
    const createResponse = await axios.post(`${baseURL}/api/products`, productData, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ Product created successfully!');
    console.log('📋 Product data:', createResponse.data.data);
    console.log('📊 Stock quantity from inventory:', createResponse.data.data.stock_quantity);
    
    // Test getting all products to verify inventory calculation
    console.log('🔍 Testing getAllProducts with inventory calculation...');
    const getAllResponse = await axios.get(`${baseURL}/api/products`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    console.log('✅ GetAllProducts successful!');
    console.log('📊 Products with stock quantities:');
    getAllResponse.data.data.forEach(product => {
      console.log(`  - ${product.name}: Stock = ${product.stock_quantity}`);
    });
    
  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
  }
}

testProductCreation();
