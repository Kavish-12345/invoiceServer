// api/index.js
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const app = express();

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  message: 'Too many requests from this IP, please try again later.'
});
app.use('/api/', limiter);

// Helper function to normalize invoice ID
function normalizeInvoiceId(invoiceId) {
  if (invoiceId === null || invoiceId === undefined || invoiceId === '') {
    return null;
  }
  
  // Convert to string and remove any whitespace
  const idStr = String(invoiceId).trim();
  
  // Handle the case where it might be "0" 
  if (idStr === '0') {
    return '0';
  }
  
  // Remove leading zeros but keep at least one digit
  const normalizedId = idStr.replace(/^0+/, '') || '0';
  
  console.log(`Normalizing ID: "${invoiceId}" (${typeof invoiceId}) -> "${normalizedId}"`);
  return normalizedId;
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    environment: 'Vercel Serverless',
    authorizationEnabled: false
  });
});

// Debug endpoint to test without auth
app.post('/debug/verify-invoice', async (req, res) => {
  try {
    const { invoiceId } = req.body;
    console.log('DEBUG: Received request:', { invoiceId, type: typeof invoiceId });
    
    const isValid = await verifyInvoiceLogic(invoiceId);
    
    res.json({
      isValid,
      invoiceId,
      normalizedId: normalizeInvoiceId(invoiceId),
      debug: {
        invoiceIdType: typeof invoiceId,
        timestamp: Date.now(),
        environment: 'Vercel'
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

// Main API endpoint - This is what your Chainlink function calls
app.post('/api/verify-invoice', async (req, res) => {
  try {
    console.log('=== CHAINLINK VERIFICATION REQUEST START ===');
    console.log('Full request headers:', JSON.stringify(req.headers, null, 2));
    console.log('Request body:', JSON.stringify(req.body, null, 2));
    console.log('Request method:', req.method);
    console.log('Request URL:', req.url);
    console.log('Environment variables check:');
    console.log('- Authorization disabled for development');
    
    const { invoiceId } = req.body;

    // Enhanced parameter validation
    if (!invoiceId && invoiceId !== 0 && invoiceId !== '0') {
      console.log('ERROR: Missing invoiceId');
      return res.status(400).json({ 
        error: 'Missing required parameters',
        message: 'invoiceId is required',
        received: { invoiceId },
        isValid: false
      });
    }

    console.log('⚠  No authorization check - running in development mode');
    console.log(`Processing invoice verification - ID: ${invoiceId}`);

    const isValid = await verifyInvoiceLogic(invoiceId);

    console.log(`Verification result: ${isValid}`);
    console.log('=== CHAINLINK VERIFICATION REQUEST END ===');

    // Return response in the exact format Chainlink expects
    const response = {
      isValid,
      invoiceId,
      normalizedId: normalizeInvoiceId(invoiceId),
      timestamp: Date.now(),
      message: isValid ? 'Invoice verified successfully' : 'Invoice verification failed'
    };

    console.log('Sending response:', JSON.stringify(response, null, 2));
    res.json(response);

  } catch (error) {
    console.error('Invoice verification error:', error);
    console.error('Error stack:', error.stack);
    
    // Always return isValid: false on error
    res.status(500).json({
      error: 'Invoice verification failed',
      message: error.message,
      isValid: false,
      timestamp: Date.now()
    });
  }
});

// Enhanced invoice verification function with better ID handling
async function verifyInvoiceLogic(invoiceId) {
  try {
    console.log('\n--- VERIFICATION LOGIC START ---');
    console.log(`Input - InvoiceId: ${invoiceId} (type: ${typeof invoiceId})`);
    
    // Normalize the invoice ID
    const normalizedId = normalizeInvoiceId(invoiceId);
    
    if (normalizedId === null) {
      console.log('❌ Invalid invoice ID provided');
      return false;
    }
    
    console.log(`Normalized ID: "${normalizedId}"`);
    
    // Simulate database/ERP lookup delay
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Mock invoice database - using normalized keys
    const mockInvoices = {
      '1001': { supplier: 'TechCorp Solutions', status: 'pending' },
      '1002': { supplier: 'Global Manufacturing Ltd', status: 'pending' },
      '1003': { supplier: 'Office Supplies Pro', status: 'pending' },
      '12345': { supplier: 'Test Supplier', status: 'pending' },
      '99999': { supplier: 'Debug Supplier', status: 'pending' },
      '100': { supplier: 'Small Invoice', status: 'pending' },
      '200': { supplier: 'Medium Invoice', status: 'pending' },
      '300': { supplier: 'Large Invoice', status: 'pending' },
      '2001': { supplier: 'Supplier A', status: 'pending' },
      '2002': { supplier: 'Supplier B', status: 'pending' },
      '5000': { supplier: 'New Supplier', status: 'pending' },
      '6000': { supplier: 'Another Supplier', status: 'pending' },
      '7000': { supplier: 'Final Supplier', status: 'pending' },
      '0': { supplier: 'Zero Invoice', status: 'pending' } // Handle zero case
    };

    const invoice = mockInvoices[normalizedId];
    
    console.log(`Looking up invoice: "${normalizedId}"`);
    console.log('Found invoice:', invoice);
    
    if (!invoice) {
      console.log(`❌ Invoice ${normalizedId} not found in database`);
      console.log('Available invoices:', Object.keys(mockInvoices));
      return false;
    }

    console.log(`✅ Invoice ${normalizedId} verified successfully`);
    console.log(`   Supplier: ${invoice.supplier}`);
    console.log(`   Status: ${invoice.status}`);
    console.log('--- VERIFICATION LOGIC END ---\n');
    return true;

  } catch (error) {
    console.error('❌ Error in verification logic:', error);
    return false;
  }
}

// Test endpoint for easier debugging
app.post('/api/test-verification', async (req, res) => {
  try {
    const { invoiceId = '12345' } = req.body;
    
    console.log('Test verification request:', { invoiceId });
    
    const isValid = await verifyInvoiceLogic(invoiceId);
    const normalizedId = normalizeInvoiceId(invoiceId);
    
    res.json({
      isValid,
      invoiceId,
      normalizedId,
      timestamp: Date.now(),
      message: 'Test verification completed',
      encodedResult: isValid ? 1 : 0,
      environment: 'Vercel'
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
    const normalizedId = normalizeInvoiceId(invoiceId);
    
    const mockInvoices = {
      '1001': { id: '1001', supplier: 'TechCorp Solutions', status: 'pending' },
      '1002': { id: '1002', supplier: 'Global Manufacturing Ltd', status: 'pending' },
      '1003': { id: '1003', supplier: 'Office Supplies Pro', status: 'pending' },
      '12345': { id: '12345', supplier: 'Test Supplier', status: 'pending' },
      '99999': { id: '99999', supplier: 'Debug Supplier', status: 'pending' },
      '100': { id: '100', supplier: 'Small Invoice', status: 'pending' },
      '200': { id: '200', supplier: 'Medium Invoice', status: 'pending' },
      '300': { id: '300', supplier: 'Large Invoice', status: 'pending' },
      '2001': { id: '2001', supplier: 'Supplier A', status: 'pending' },
      '2002': { id: '2002', supplier: 'Supplier B', status: 'pending' },
      '5000': { id: '5000', supplier: 'New Supplier', status: 'pending' },
      '6000': { id: '6000', supplier: 'Another Supplier', status: 'pending' },
      '7000': { id: '7000', supplier: 'Final Supplier', status: 'pending' },
      '0': { id: '0', supplier: 'Zero Invoice', status: 'pending' }
    };

    const invoice = mockInvoices[normalizedId];
    
    if (!invoice) {
      return res.status(404).json({
        error: 'Invoice not found',
        invoiceId,
        normalizedId,
        availableInvoices: Object.keys(mockInvoices)
      });
    }

    res.json({
      success: true,
      invoice,
      originalId: invoiceId,
      normalizedId,
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
    '1001': { id: '1001', supplier: 'TechCorp Solutions', status: 'pending' },
    '1002': { id: '1002', supplier: 'Global Manufacturing Ltd', status: 'pending' },
    '1003': { id: '1003', supplier: 'Office Supplies Pro', status: 'pending' },
    '12345': { id: '12345', supplier: 'Test Supplier', status: 'pending' },
    '99999': { id: '99999', supplier: 'Debug Supplier', status: 'pending' },
    '100': { id: '100', supplier: 'Small Invoice', status: 'pending' },
    '200': { id: '200', supplier: 'Medium Invoice', status: 'pending' },
    '300': { id: '300', supplier: 'Large Invoice', status: 'pending' },
    '2001': { id: '2001', supplier: 'Supplier A', status: 'pending' },
    '2002': { id: '2002', supplier: 'Supplier B', status: 'pending' },
    '5000': { id: '5000', supplier: 'New Supplier', status: 'pending' },
    '6000': { id: '6000', supplier: 'Another Supplier', status: 'pending' },
    '7000': { id: '7000', supplier: 'Final Supplier', status: 'pending' },
    '0': { id: '0', supplier: 'Zero Invoice', status: 'pending' }
  };

  res.json({
    success: true,
    invoices: Object.values(mockInvoices),
    count: Object.keys(mockInvoices).length,
    environment: 'Vercel'
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

// Export the Express app for Vercel
module.exports = app;