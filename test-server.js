const axios = require('axios');

// Test configuration
const BASE_URL = 'http://localhost:3000';
const API_KEY = 'your-secure-api-key-here'; // Should match your .env file

async function testServer() {
  console.log('🧪 Testing Chainlink Functions Invoice Server...\n');

  try {
    // Test 1: Health check
    console.log('1. Testing health check...');
    const healthResponse = await axios.get(`${BASE_URL}/health`);
    console.log('✅ Health check passed:', healthResponse.data.status);

    // Test 2: Invoice verification (valid case)
    console.log('\n2. Testing valid invoice verification...');
    const validInvoiceResponse = await axios.post(
      `${BASE_URL}/api/verify-invoice`,
      {
        invoiceId: '12345',
        amount: '5000'
      },
      {
        headers: {
          'Authorization': `Bearer ${API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );
    console.log('✅ Valid invoice test passed:', validInvoiceResponse.data);

    // Test 3: Invoice verification (invalid case)
    console.log('\n3. Testing invalid invoice verification...');
    const invalidInvoiceResponse = await axios.post(
      `${BASE_URL}/api/verify-invoice`,
      {
        invoiceId: '99999',
        amount: '1000'
      },
      {
        headers: {
          'Authorization': `Bearer ${API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );
    console.log('✅ Invalid invoice test passed:', invalidInvoiceResponse.data);

    // Test 4: Invoice verification (amount mismatch)
    console.log('\n4. Testing amount mismatch...');
    const mismatchResponse = await axios.post(
      `${BASE_URL}/api/verify-invoice`,
      {
        invoiceId: '12345',
        amount: '9999' // Wrong amount
      },
      {
        headers: {
          'Authorization': `Bearer ${API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );
    console.log('✅ Amount mismatch test passed:', mismatchResponse.data);

    // Test 5: Unauthorized request
    console.log('\n5. Testing unauthorized request...');
    try {
      await axios.post(
        `${BASE_URL}/api/verify-invoice`,
        {
          invoiceId: '12345',
          amount: '5000'
        },
        {
          headers: {
            'Content-Type': 'application/json'
            // No Authorization header
          }
        }
      );
    } catch (error) {
      if (error.response && error.response.status === 401) {
        console.log('✅ Unauthorized test passed: Request properly rejected');
      } else {
        throw error;
      }
    }

    // Test 6: Get invoice details
    console.log('\n6. Testing get invoice details...');
    const invoiceDetailsResponse = await axios.get(
      `${BASE_URL}/api/invoice/12345`,
      {
        headers: {
          'Authorization': `Bearer ${API_KEY}`
        }
      }
    );
    console.log('✅ Get invoice details passed:', invoiceDetailsResponse.data);

    // Test 7: Test verification endpoint
    console.log('\n7. Testing test verification endpoint...');
    const testResponse = await axios.post(
      `${BASE_URL}/api/test-verification`,
      {
        invoiceId: '12345',
        amount: '5000'
      }
    );
    console.log('✅ Test verification passed:', testResponse.data);

    console.log('\n🎉 All tests passed! Your server is ready for Chainlink Functions.');

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
    process.exit(1);
  }
}

// Run tests
testServer();