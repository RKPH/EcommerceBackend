const http = require('http');

const options = {
  hostname: 'backend.d2f.io.vn',
  port: 443,
  path: '/api/v1/cors-test',
  method: 'GET',
  headers: {
    'Origin': 'https://d2f.io.vn'
  }
};

const req = http.request(options, (res) => {
  console.log(`Status Code: ${res.statusCode}`);
  console.log('Headers:', res.headers);
  
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    console.log('Response body:', data);
  });
});

req.on('error', (error) => {
  console.error('Error:', error);
});

req.end(); 