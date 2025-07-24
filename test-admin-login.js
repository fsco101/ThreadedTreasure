// Test admin login and generate real token
const http = require('http');
const querystring = require('querystring');

console.log('🔐 Testing admin login to generate real token...');

const loginData = querystring.stringify({
  email: 'admin@test.com',
  password: 'admin123' // This should be a real admin password
});

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/auth/login',
  method: 'POST',
  headers: {
    'Content-Type': 'application/x-www-form-urlencoded',
    'Content-Length': Buffer.byteLength(loginData)
  }
};

const req = http.request(options, (res) => {
  console.log(`Status: ${res.statusCode}`);
  
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    try {
      const response = JSON.parse(data);
      console.log('Login Response:', response);
      
      if (response.success && response.data && response.data.token) {
        console.log('\n🎉 Login successful!');
        console.log('Token:', response.data.token);
        console.log('User:', response.data.user);
        
        // Test API with this token
        testAPIWithToken(response.data.token);
      } else {
        console.log('❌ Login failed:', response.message);
        console.log('\nTrying to create test admin user...');
        createTestAdmin();
      }
    } catch (error) {
      console.log('❌ Error parsing response:', error.message);
      console.log('Raw response:', data);
    }
  });
});

req.on('error', (error) => {
  console.log(`❌ Request Error: ${error.message}`);
});

req.write(loginData);
req.end();

function testAPIWithToken(token) {
  console.log('\n📡 Testing API endpoints with real token...');
  
  const endpoints = ['/api/products', '/api/categories', '/api/users'];
  
  endpoints.forEach(endpoint => {
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: endpoint,
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    };
    
    const req = http.request(options, (res) => {
      console.log(`${endpoint}: ${res.statusCode} ${res.statusMessage}`);
      
      if (res.statusCode === 200) {
        let data = '';
        res.on('data', (chunk) => {
          data += chunk;
        });
        
        res.on('end', () => {
          try {
            const response = JSON.parse(data);
            if (response.success && response.data) {
              console.log(`  ✅ Success: ${response.data.length} records found`);
            } else {
              console.log(`  ⚠️ Success but no data: ${response.message}`);
            }
          } catch (error) {
            console.log(`  ❌ Invalid JSON response`);
          }
        });
      }
    });
    
    req.on('error', (error) => {
      console.log(`  ❌ ${endpoint} Error: ${error.message}`);
    });
    
    req.end();
  });
}

function createTestAdmin() {
  console.log('🔧 Creating test admin user...');
  
  const adminData = querystring.stringify({
    name: 'Test Admin',
    email: 'admin@test.com',
    password: 'admin123',
    role: 'admin'
  });

  const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/auth/register',
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Content-Length': Buffer.byteLength(adminData)
    }
  };

  const req = http.request(options, (res) => {
    let data = '';
    res.on('data', (chunk) => {
      data += chunk;
    });
    
    res.on('end', () => {
      try {
        const response = JSON.parse(data);
        console.log('Registration Response:', response);
        
        if (response.success) {
          console.log('✅ Test admin created successfully');
          console.log('Now try logging in again...');
        } else {
          console.log('❌ Failed to create admin:', response.message);
        }
      } catch (error) {
        console.log('❌ Error parsing registration response:', error.message);
        console.log('Raw response:', data);
      }
    });
  });

  req.on('error', (error) => {
    console.log(`❌ Registration Error: ${error.message}`);
  });

  req.write(adminData);
  req.end();
}
