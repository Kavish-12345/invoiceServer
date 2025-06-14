const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet()); // Security headers
app.use(cors()); // Enable CORS
app.use(express.json({ limit: '10mb' })); // Parse JSON bodies
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded bodies

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});
app.use('/api/', limiter);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Debug endpoint to test without auth
app.post('/debug/verify-invoice', async (req, res) => {
  try {
    const { invoiceId, amount } = req.body;
    console.log('DEBUG: Received request:', { invoiceId, amount, type: typeof amount });
    
    const isValid = await verifyInvoiceLogic(invoiceId, amount);
    
    res.json({
      isValid,
      invoiceId,
      amount,
      debug: {
        invoiceIdType: typeof invoiceId,
        amountType: typeof amount,
        amountParsed: parseFloat(amount),
        timestamp: Date.now()
      }
    });
  } catch (error) {
    console.error('DEBUG verification error:', error);
    res.status(500).json({
      error: 'Debug verification failed',
      message: error.message,
      isValid: false
    });
  }
});

// Main API endpoint with enhanced debugging
app.post('/api/verify-invoice', async (req, res) => {
  try {
    console.log('=== VERIFICATION REQUEST START ===');
    console.log('Headers:', req.headers);
    console.log('Body:', req.body);
    
    const { invoiceId, amount } = req.body;

    // Enhanced parameter validation
    if (!invoiceId) {
      console.log('ERROR: Missing invoiceId');
      return res.status(400).json({ 
        error: 'Missing required parameters',
        message: 'invoiceId is required',
        received: { invoiceId, amount }
      });
    }

    if (!amount && amount !== 0) {
      console.log('ERROR: Missing amount');
      return res.status(400).json({ 
        error: 'Missing required parameters',
        message: 'amount is required',
        received: { invoiceId, amount }
      });
    }

    // Validate authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('ERROR: Missing or invalid authorization header');
      return res.status(401).json({ 
        error: 'Unauthorized',
        message: 'Valid Bearer token required'
      });
    }

    const token = authHeader.split(' ')[1];
    const expectedToken = process.env.API_KEY;
    
    if (!expectedToken) {
      console.log('ERROR: API_KEY not set in environment');
      return res.status(500).json({ 
        error: 'Server configuration error',
        message: 'API key not configured'
      });
    }
    
    if (token !== expectedToken) {
      console.log('ERROR: Invalid API key provided');
      return res.status(401).json({ 
        error: 'Unauthorized',
        message: 'Invalid API key'
      });
    }

    console.log(`Processing invoice verification - ID: ${invoiceId}, Amount: ${amount}`);

    const isValid = await verifyInvoiceLogic(invoiceId, amount);

    console.log(`Verification result: ${isValid}`);
    console.log('=== VERIFICATION REQUEST END ===');

    res.json({
      isValid,
      invoiceId,
      amount,
      timestamp: Date.now(),
      message: isValid ? 'Invoice verified successfully' : 'Invoice verification failed'
    });

  } catch (error) {
    console.error('Invoice verification error:', error);
    res.status(500).json({
      error: 'Invoice verification failed',
      message: error.message,
      isValid: false
    });
  }
});

// Enhanced invoice verification function with better debugging
async function verifyInvoiceLogic(invoiceId, amount) {
  try {
    console.log(`\n--- VERIFICATION LOGIC START ---`);
    console.log(`Input - InvoiceId: ${invoiceId} (type: ${typeof invoiceId})`);
    console.log(`Input - Amount: ${amount} (type: ${typeof amount})`);
    
    // Simulate database/ERP lookup
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Mock invoice database
    const mockInvoices = {
      // Test invoices with various amount formats
      '1001': { amount: 1250.50, status: 'pending', supplier: 'TechCorp Solutions' },
      '1002': { amount: 3750.00, status: 'pending', supplier: 'Global Manufacturing Ltd' },
      '1003': { amount: 890.25, status: 'pending', supplier: 'Office Supplies Pro' },
      '12345': { amount: 5000.00, status: 'pending', supplier: 'Test Supplier' },
      '99999': { amount: 999.99, status: 'pending', supplier: 'Debug Supplier' },
      
      // Different status invoices
      '2001': { amount: 3200.00, status: 'paid', supplier: 'Paid Supplier A' },
      '2002': { amount: 1800.75, status: 'rejected', supplier: 'Rejected Supplier B' },
    };

    const invoiceIdStr = invoiceId.toString();
    const invoice = mockInvoices[invoiceIdStr];
    
    console.log(`Looking up invoice: ${invoiceIdStr}`);
    console.log(`Found invoice:`, invoice);
    
    if (!invoice) {
      console.log(`❌ Invoice ${invoiceIdStr} not found in database`);
      return false;
    }

    if (invoice.status !== 'pending') {
      console.log(`❌ Invoice ${invoiceIdStr} status is '${invoice.status}', not 'pending'`);
      return false;
    }

    // Enhanced amount comparison with multiple parsing attempts
    const expectedAmount = parseFloat(invoice.amount);
    let providedAmount;
    
    // Try different parsing methods
    if (typeof amount === 'string') {
      providedAmount = parseFloat(amount);
    } else if (typeof amount === 'number') {
      providedAmount = amount;
    } else {
      console.log(`❌ Invalid amount type: ${typeof amount}`);
      return false;
    }
    
    console.log(`Expected amount: ${expectedAmount}`);
    console.log(`Provided amount: ${providedAmount}`);
    
    // Use a small epsilon for floating point comparison
    const epsilon = 0.001;
    const amountDifference = Math.abs(expectedAmount - providedAmount);
    
    console.log(`Amount difference: ${amountDifference}`);
    
    if (amountDifference > epsilon) {
      console.log(`❌ Invoice ${invoiceIdStr} amount mismatch:`);
      console.log(`   Expected: ${expectedAmount}`);
      console.log(`   Provided: ${providedAmount}`);
      console.log(`   Difference: ${amountDifference}`);
      return false;
    }

    console.log(`✅ Invoice ${invoiceIdStr} verified successfully`);
    console.log(`--- VERIFICATION LOGIC END ---\n`);
    return true;

  } catch (error) {
    console.error('❌ Error in verification logic:', error);
    return false;
  }
}

// Test endpoint for easier debugging
app.post('/api/test-verification', async (req, res) => {
  try {
    const { invoiceId = '12345', amount = '5000' } = req.body;
    
    console.log('Test verification request:', { invoiceId, amount });
    
    const isValid = await verifyInvoiceLogic(invoiceId, amount);
    
    res.json({
      isValid,
      invoiceId,
      amount,
      timestamp: Date.now(),
      message: 'Test verification completed',
      encodedResult: isValid ? 1 : 0
    });

  } catch (error) {
    console.error('Test verification error:', error);
    res.status(500).json({
      error: 'Test verification failed',
      message: error.message,
      isValid: false
    });
  }
});

// Get invoice details endpoint (for debugging)
app.get('/api/invoice/:invoiceId', async (req, res) => {
  try {
    const { invoiceId } = req.params;
    
    const mockInvoices = {
      '1001': { id: '1001', amount: 1250.50, status: 'pending', supplier: 'TechCorp Solutions' },
      '1002': { id: '1002', amount: 3750.00, status: 'pending', supplier: 'Global Manufacturing Ltd' },
      '1003': { id: '1003', amount: 890.25, status: 'pending', supplier: 'Office Supplies Pro' },
      '12345': { id: '12345', amount: 5000.00, status: 'pending', supplier: 'Test Supplier' },
      '99999': { id: '99999', amount: 999.99, status: 'pending', supplier: 'Debug Supplier' },
      '2001': { id: '2001', amount: 3200.00, status: 'paid', supplier: 'Paid Supplier A' },
      '2002': { id: '2002', amount: 1800.75, status: 'rejected', supplier: 'Rejected Supplier B' },
    };

    const invoice = mockInvoices[invoiceId];
    
    if (!invoice) {
      return res.status(404).json({
        error: 'Invoice not found',
        invoiceId,
        availableInvoices: Object.keys(mockInvoices)
      });
    }

    res.json({
      success: true,
      invoice,
      timestamp: Date.now()
    });

  } catch (error) {
    console.error('Error fetching invoice:', error);
    res.status(500).json({
      error: 'Failed to fetch invoice',
      message: error.message
    });
  }
});

// List all available invoices for testing
app.get('/api/invoices', (req, res) => {
  const mockInvoices = {
    '1001': { id: '1001', amount: 1250.50, status: 'pending', supplier: 'TechCorp Solutions' },
    '1002': { id: '1002', amount: 3750.00, status: 'pending', supplier: 'Global Manufacturing Ltd' },
    '1003': { id: '1003', amount: 890.25, status: 'pending', supplier: 'Office Supplies Pro' },
    '12345': { id: '12345', amount: 5000.00, status: 'pending', supplier: 'Test Supplier' },
    '99999': { id: '99999', amount: 999.99, status: 'pending', supplier: 'Debug Supplier' },
    '2001': { id: '2001', amount: 3200.00, status: 'paid', supplier: 'Paid Supplier A' },
    '2002': { id: '2002', amount: 1800.75, status: 'rejected', supplier: 'Rejected Supplier B' },
  };

  res.json({
    success: true,
    invoices: Object.values(mockInvoices),
    count: Object.keys(mockInvoices).length
  });
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Unhandled error:', error);
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Endpoint not found',
    message: `${req.method} ${req.path} is not a valid endpoint`,
    availableEndpoints: [
      'GET /health',
      'POST /api/verify-invoice',
      'POST /api/test-verification',
      'POST /debug/verify-invoice',
      'GET /api/invoice/:invoiceId',
      'GET /api/invoices'
    ]
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Chainlink Functions server running on port ${PORT}`);
  console.log(`📋 Health check: http://localhost:${PORT}/health`);
  console.log(`🔗 API base URL: http://localhost:${PORT}/api`);
  console.log(`🐛 Debug endpoint: http://localhost:${PORT}/debug/verify-invoice`);
  
  // Check if API_KEY is set
  if (!process.env.API_KEY) {
    console.warn('⚠️  WARNING: API_KEY environment variable is not set!');
  } else {
    console.log('✅ API_KEY is configured');
  }
});