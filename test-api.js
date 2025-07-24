// Simple API test script
const http = require('http');

console.log('🔍 Testing ThreadedTreasure API...');

// Test health endpoint
const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/health',
  method: 'GET',
  headers: {
    'Content-Type': 'application/json'
  }
};

const req = http.request(options, (res) => {
  console.log(`✅ Health Check Status: ${res.statusCode}`);
  
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    try {
      const response = JSON.parse(data);
      console.log('📊 Health Response:', response);
      
      if (response.success) {
        console.log('🎉 API is working correctly!');
        testOtherEndpoints();
      } else {
        console.log('⚠️ API responded but with an error');
      }
    } catch (error) {
      console.log('❌ Invalid JSON response:', data);
    }
  });
});

req.on('error', (error) => {
  console.log(`❌ Connection Error: ${error.message}`);
  console.log('💡 Make sure the server is running with: npm start');
});

req.end();

// Test other endpoints with proper authentication
function testOtherEndpoints() {
  console.log('\n🔍 Testing other API endpoints...');
  
  // Note: These would need proper authentication in a real scenario
  const endpoints = [
    '/api/products',
    '/api/categories', 
    '/api/users'
  ];
  
  endpoints.forEach(endpoint => {
    const testOptions = {
      hostname: 'localhost',
      port: 3000,
      path: endpoint,
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    };
    
    const testReq = http.request(testOptions, (res) => {
      console.log(`📡 ${endpoint}: ${res.statusCode} ${res.statusMessage}`);
      
      if (res.statusCode === 401) {
        console.log('🔒 Authentication required (expected)');
      } else if (res.statusCode === 200) {
        console.log('✅ Endpoint accessible');
      }
    });
    
    testReq.on('error', (error) => {
      console.log(`❌ ${endpoint} Error: ${error.message}`);
    });
    
    testReq.end();
  });
}
