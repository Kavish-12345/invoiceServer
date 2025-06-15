// Fixed api/index.js - ensure proper route handling
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const app = express();

// Middleware
app.use(helmet());
app.use(cors({
  origin: '*', // Be more permissive for testing
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
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
  
  const idStr = String(invoiceId).trim();
  
  if (idStr === '0') {
    return '0';
  }
  
  const normalizedId = idStr.replace(/^0+/, '') || '0';
  
  console.log(`Normalizing ID: "${invoiceId}" (${typeof invoiceId}) -> "${normalizedId}"`);
  return normalizedId;
}

// Health check endpoint - accessible at both root and /api
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    environment: 'Vercel Serverless',
    authorizationEnabled: false
  });
});

app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    environment: 'Vercel Serverless',
    authorizationEnabled: false,
    path: '/api/health'
  });
});

// Main verification endpoint - this is what Chainlink calls
app.post('/api/verify-invoice', async (req, res) => {
  try {
    console.log('=== CHAINLINK VERIFICATION REQUEST START ===');
    console.log('Request method:', req.method);
    console.log('Request URL:', req.url);
    console.log('Request body:', JSON.stringify(req.body, null, 2));
    console.log('Request headers:', JSON.stringify(req.headers, null, 2));
    
    const { invoiceId } = req.body;
    console.log('Received invoiceId:', invoiceId, 'Type:', typeof invoiceId);

    // Enhanced parameter validation
    if (invoiceId === undefined || invoiceId === null) {
      console.log('ERROR: invoiceId is undefined or null');
      return res.status(400).json({ 
        error: 'Missing required parameters',
        message: 'invoiceId is required',
        isValid: false
      });
    }

    console.log('Processing invoice verification - ID:', invoiceId);

    const isValid = await verifyInvoiceLogic(invoiceId);
    console.log('Verification result:', isValid);

    // Simple, consistent response format
    const response = {
      isValid: isValid,
      invoiceId: invoiceId,
      timestamp: Date.now(),
      message: isValid ? 'Invoice verified successfully' : 'Invoice verification failed'
    };

    console.log('Sending response:', JSON.stringify(response, null, 2));
    console.log('=== CHAINLINK VERIFICATION REQUEST END ===');
    
    // Set explicit headers
    res.set('Content-Type', 'application/json');
    res.status(200).json(response);

  } catch (error) {
    console.error('Invoice verification error:', error);
    console.error('Error stack:', error.stack);
    
    const errorResponse = {
      error: 'Invoice verification failed',
      message: error.message,
      isValid: false,
      timestamp: Date.now()
    };
    
    console.log('Sending error response:', JSON.stringify(errorResponse, null, 2));
    
    res.set('Content-Type', 'application/json');
    res.status(500).json(errorResponse);
  }
});

// Enhanced invoice verification function
async function verifyInvoiceLogic(invoiceId) {
  try {
    console.log('\n--- VERIFICATION LOGIC START ---');
    console.log(`Input - InvoiceId: ${invoiceId} (type: ${typeof invoiceId})`);
    
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
      '0': { supplier: 'Zero Invoice', status: 'pending' }
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

// Debug endpoints for testing
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

// Catch-all for API routes to help debug 404s
app.use('/api/*', (req, res) => {
  console.log('404 - API route not found:', req.method, req.originalUrl);
  res.status(404).json({
    error: 'API endpoint not found',
    method: req.method,
    path: req.originalUrl,
    availableEndpoints: [
      'GET /health',
      'GET /api/health',
      'POST /api/verify-invoice',
      'POST /debug/verify-invoice'
    ]
  });
});

// Root catch-all
app.use('*', (req, res) => {
  console.log('404 - Route not found:', req.method, req.originalUrl);
  res.status(404).json({
    error: 'Route not found',
    method: req.method,
    path: req.originalUrl,
    message: 'This endpoint does not exist'
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

// Export for Vercel
module.exports = app;