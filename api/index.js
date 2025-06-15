// Enhanced api/index.js with improved CORS handling for Chainlink Functions
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const app = express();

// Enhanced CORS configuration specifically for Chainlink Functions
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps, Postman, Chainlink Functions)
    if (!origin) return callback(null, true);
    
    // Allow all origins for testing - you can restrict this later
    return callback(null, true);
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'HEAD'],
  allowedHeaders: [
    'Origin',
    'X-Requested-With',
    'Content-Type',
    'Accept',
    'Authorization',
    'Cache-Control',
    'X-Forwarded-For',
    'User-Agent',
    'Referer'
  ],
  credentials: true,
  maxAge: 86400, // 24 hours
  preflightContinue: false,
  optionsSuccessStatus: 200
};

// Apply CORS before other middleware
app.use(cors(corsOptions));

// Handle preflight requests explicitly
app.options('*', cors(corsOptions));

// Helmet with relaxed CSP for API
app.use(helmet({
  contentSecurityPolicy: false, // Disable CSP for API endpoints
  crossOriginEmbedderPolicy: false
}));

// Body parsing middleware
app.use(express.json({ 
  limit: '10mb',
  verify: (req, res, buf) => {
    // Log raw body for debugging
    if (req.url.includes('/api/verify-invoice')) {
      console.log('Raw body received:', buf.toString());
    }
  }
}));
app.use(express.urlencoded({ extended: true }));

// Rate limiting with exemption for Chainlink Functions
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 1000, // Increased for testing
  message: 'Too many requests from this IP, please try again later.',
  skip: (req) => {
    // Skip rate limiting for health checks and if needed for Chainlink
    return req.path === '/health' || req.path === '/api/health';
  }
});
app.use('/api/', limiter);

// Add explicit CORS headers middleware as backup
app.use((req, res, next) => {
  // Set CORS headers explicitly
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, HEAD');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, Cache-Control');
  res.header('Access-Control-Max-Age', '86400');
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    console.log('Handling preflight OPTIONS request for:', req.path);
    return res.status(200).end();
  }
  
  next();
});

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

// Health check endpoints
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    environment: 'Vercel Serverless',
    cors: 'enabled',
    authorizationEnabled: false
  });
});

app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    environment: 'Vercel Serverless',
    cors: 'enabled',
    authorizationEnabled: false,
    path: '/api/health'
  });
});

// CORS test endpoint
app.get('/api/cors-test', (req, res) => {
  res.status(200).json({
    message: 'CORS test successful',
    origin: req.get('Origin') || 'no-origin',
    userAgent: req.get('User-Agent') || 'no-user-agent',
    headers: req.headers,
    timestamp: new Date().toISOString()
  });
});

// Main verification endpoint - Enhanced for Chainlink Functions
app.post('/api/verify-invoice', async (req, res) => {
  try {
    console.log('=== CHAINLINK VERIFICATION REQUEST START ===');
    console.log('Request method:', req.method);
    console.log('Request URL:', req.url);
    console.log('Request origin:', req.get('Origin') || 'no-origin');
    console.log('Request user-agent:', req.get('User-Agent') || 'no-user-agent');
    console.log('Request body:', JSON.stringify(req.body, null, 2));
    console.log('All headers:', JSON.stringify(req.headers, null, 2));
    
    // Ensure CORS headers are set
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Content-Type', 'application/json');
    
    const { invoiceId } = req.body;
    console.log('Received invoiceId:', invoiceId, 'Type:', typeof invoiceId);

    // Enhanced parameter validation
    if (invoiceId === undefined || invoiceId === null) {
      console.log('ERROR: invoiceId is undefined or null');
      const errorResponse = { 
        error: 'Missing required parameters',
        message: 'invoiceId is required',
        isValid: false,
        timestamp: Date.now()
      };
      
      return res.status(400).json(errorResponse);
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
    
    return res.status(200).json(response);

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
    
    return res.status(500).json(errorResponse);
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
      '4984': { supplier: 'Chainlink Test Supplier', status: 'pending' }, // Added your test ID
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
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Content-Type', 'application/json');
    
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
        environment: 'Vercel',
        cors: 'enabled'
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

// Catch-all for API routes
app.use('/api/*', (req, res) => {
  console.log('404 - API route not found:', req.method, req.originalUrl);
  res.header('Access-Control-Allow-Origin', '*');
  res.status(404).json({
    error: 'API endpoint not found',
    method: req.method,
    path: req.originalUrl,
    availableEndpoints: [
      'GET /health',
      'GET /api/health',
      'GET /api/cors-test',
      'POST /api/verify-invoice',
      'POST /debug/verify-invoice'
    ]
  });
});

// Root catch-all
app.use('*', (req, res) => {
  console.log('404 - Route not found:', req.method, req.originalUrl);
  res.header('Access-Control-Allow-Origin', '*');
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
  res.header('Access-Control-Allow-Origin', '*');
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
  });
});

// Export for Vercel
module.exports = app;