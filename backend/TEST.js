import fetch from 'node-fetch';
import FormData from 'form-data';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BASE_URL = 'http://localhost:8080';
let authToken = '';
let testListingId = '';

// Helper function to make authenticated requests
async function authFetch(endpoint, options = {}) {
  if (authToken) {
    options.headers = {
      ...options.headers,
      'Authorization': `Bearer ${authToken}`
    };
  }
  const response = await fetch(`${BASE_URL}${endpoint}`, options);
  return response;
}

async function runTests() {
  console.log('Starting API tests...\n');

  try {
    // 1. Register new user
    console.log('Testing user registration...');
    let response = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'testuser',
        email: 'test@example.com',
        password: 'testpass123'
      })
    });
    let data = await response.json();
    console.log('Status:', response.status, 'Expected: 200');
    console.log('Response:', data);
    console.log('Expected to contain: token\n');

    // 2. Login
    console.log('Testing login...');
    response = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'test@example.com',
        password: 'testpass123'
      })
    });
    data = await response.json();
    authToken = data.token;
    console.log('Status:', response.status, 'Expected: 200');
    console.log('Response:', data);
    console.log('Expected to contain: token, username\n');

    // 3. Create listing
    console.log('Testing listing creation...');
    const form = new FormData();
    
    // Create a temporary test image file
    const testImagePath = path.join(__dirname, 'test-image.gif');
    const imageBuffer = Buffer.from('R0lGODlhAQABAIAAAAUEBAAAACwAAAAAAQABAAACAkQBADs=', 'base64');
    fs.writeFileSync(testImagePath, imageBuffer);
    
    // Append file and data to form
    form.append('file', fs.createReadStream(testImagePath));
    form.append('data', JSON.stringify({
      title: 'Test Listing',
      description: 'A test listing',
      price: 99.99,
      category: 'Electronics',
      condition: 'Good'
    }));

    response = await authFetch('/api/listings', {
      method: 'POST',
      body: form
    });
    data = await response.json();
    testListingId = data.id;
    console.log('Status:', response.status, 'Expected: 200');
    console.log('Response:', data);
    console.log('Expected to contain: id, title, price\n');

    // Clean up the test image
    fs.unlinkSync(testImagePath);

    // 4. Get listings
    console.log('Testing get listings...');
    response = await fetch(`${BASE_URL}/api/listings`);
    data = await response.json();
    console.log('Status:', response.status, 'Expected: 200');
    console.log('Response contains listings:', data.listings.length > 0);
    console.log('Expected to contain: listings array, total, pages\n');

    // 5. Get single listing
    console.log('Testing get single listing...');
    response = await fetch(`${BASE_URL}/api/listings/${testListingId}`);
    data = await response.json();
    console.log('Status:', response.status, 'Expected: 200');
    console.log('Response:', data);
    console.log('Expected to contain: id, title, price\n');

    // 6. Like listing
    console.log('Testing like listing...');
    response = await authFetch(`/api/listings/${testListingId}/like`, {
      method: 'POST'
    });
    data = await response.json();
    console.log('Status:', response.status, 'Expected: 200');
    console.log('Response:', data);
    console.log('Expected to contain: liked: true\n');

    // 7. Get user profile
    console.log('Testing get user profile...');
    response = await fetch(`${BASE_URL}/api/users/testuser`);
    data = await response.json();
    console.log('Status:', response.status, 'Expected: 200');
    console.log('Response:', data);
    console.log('Expected to contain: username, listings\n');

    // 8. Get liked listings
    console.log('Testing get liked listings...');
    response = await authFetch('/api/users/me/likes');
    data = await response.json();
    console.log('Status:', response.status, 'Expected: 200');
    console.log('Response length:', data.length);
    console.log('Expected to contain: array of listings\n');

    // 9. Update user profile
    console.log('Testing update profile...');
    response = await authFetch('/api/users/me', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'testuser_updated'
      })
    });
    data = await response.json();
    console.log('Status:', response.status, 'Expected: 200');
    console.log('Response:', data);
    console.log('Expected to contain: updated username\n');

    // 10. Delete listing
    console.log('Testing delete listing...');
    response = await authFetch(`/api/listings/${testListingId}`, {
      method: 'DELETE'
    });
    data = await response.json();
    console.log('Status:', response.status, 'Expected: 200');
    console.log('Response:', data);
    console.log('Expected to contain: success: true\n');

    console.log('All tests completed successfully!');

  } catch (error) {
    console.error('Test failed:', error);
  }
}

// Ensure server is running before starting tests
console.log('Waiting for server to be ready...');
setTimeout(runTests, 1000);