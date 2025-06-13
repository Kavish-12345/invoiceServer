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

// Chainlink Functions API Routes

// 1. Invoice verification endpoint - main endpoint for Chainlink Functions
app.post('/api/verify-invoice', async (req, res) => {
  try {
    const { invoiceId, amount } = req.body;

    // Validate required parameters
    if (!invoiceId || !amount) {
      return res.status(400).json({ 
        error: 'Missing required parameters',
        message: 'Both invoiceId and amount are required'
      });
    }

    // Validate authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        error: 'Unauthorized',
        message: 'Valid Bearer token required'
      });
    }

    const token = authHeader.split(' ')[1];
    const expectedToken = process.env.API_KEY;
    
    if (!expectedToken || token !== expectedToken) {
      return res.status(401).json({ 
        error: 'Unauthorized',
        message: 'Invalid API key'
      });
    }

    console.log(`Processing invoice verification - ID: ${invoiceId}, Amount: ${amount}`);

    // Mock invoice verification logic
    // In a real implementation, you would:
    // 1. Connect to your ERP system/database
    // 2. Verify the invoice exists
    // 3. Check if the amount matches
    // 4. Validate other business rules
    
    const isValid = await verifyInvoiceLogic(invoiceId, amount);

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

// Mock invoice verification function
async function verifyInvoiceLogic(invoiceId, amount) {
  try {
    // Simulate database/ERP lookup
    await new Promise(resolve => setTimeout(resolve, 100)); // Simulate async operation
    
    // Mock invoice database
    const mockInvoices = {
      // Pending invoices (valid for verification)
      '1001': { amount: 1250.50, status: 'pending', supplier: 'TechCorp Solutions', createdAt: '2024-01-15', category: 'Software License' },
      '1002': { amount: 3750.00, status: 'pending', supplier: 'Global Manufacturing Ltd', createdAt: '2024-01-16', category: 'Raw Materials' },
      '1003': { amount: 890.25, status: 'pending', supplier: 'Office Supplies Pro', createdAt: '2024-01-17', category: 'Office Equipment' },
      '1004': { amount: 15000.00, status: 'pending', supplier: 'Construction Materials Inc', createdAt: '2024-01-18', category: 'Construction' },
      '1005': { amount: 2200.75, status: 'pending', supplier: 'Marketing Agency Plus', createdAt: '2024-01-19', category: 'Marketing Services' },
      '1006': { amount: 450.00, status: 'pending', supplier: 'Local Catering Services', createdAt: '2024-01-20', category: 'Catering' },
      '1007': { amount: 8500.00, status: 'pending', supplier: 'IT Consulting Group', createdAt: '2024-01-21', category: 'Consulting' },
      '1008': { amount: 1875.30, status: 'pending', supplier: 'Energy Solutions Corp', createdAt: '2024-01-22', category: 'Utilities' },
      '1009': { amount: 12000.00, status: 'pending', supplier: 'Heavy Machinery Rentals', createdAt: '2024-01-23', category: 'Equipment Rental' },
      '1010': { amount: 675.50, status: 'pending', supplier: 'Legal Services LLC', createdAt: '2024-01-24', category: 'Legal Services' },
      
      // Test invoices
      '12345': { amount: 5000.00, status: 'pending', supplier: 'Test Supplier', createdAt: '2024-01-25', category: 'Test Category' },
      '99999': { amount: 999.99, status: 'pending', supplier: 'Debug Supplier', createdAt: '2024-01-26', category: 'Testing' },
      '55555': { amount: 7500.25, status: 'pending', supplier: 'Demo Company', createdAt: '2024-01-27', category: 'Demo Services' },
      
      // Already processed invoices (invalid for verification)
      '2001': { amount: 3200.00, status: 'paid', supplier: 'Paid Supplier A', createdAt: '2024-01-10', category: 'Completed Services', paidAt: '2024-01-28' },
      '2002': { amount: 1800.75, status: 'rejected', supplier: 'Rejected Supplier B', createdAt: '2024-01-11', category: 'Invalid Request', rejectedAt: '2024-01-29' },
      '2003': { amount: 4500.00, status: 'paid', supplier: 'Quick Pay Corp', createdAt: '2024-01-12', category: 'Express Service', paidAt: '2024-01-30' },
      '2004': { amount: 950.25, status: 'cancelled', supplier: 'Cancelled Order Ltd', createdAt: '2024-01-13', category: 'Cancelled Order', cancelledAt: '2024-01-31' },
      '2005': { amount: 6750.00, status: 'disputed', supplier: 'Dispute Corp', createdAt: '2024-01-14', category: 'Disputed Service', disputedAt: '2024-02-01' },
      
      // High-value invoices
      '3001': { amount: 50000.00, status: 'pending', supplier: 'Enterprise Solutions Mega Corp', createdAt: '2024-01-28', category: 'Enterprise Software' },
      '3002': { amount: 75000.50, status: 'pending', supplier: 'Industrial Equipment Specialists', createdAt: '2024-01-29', category: 'Industrial Equipment' },
      '3003': { amount: 125000.00, status: 'pending', supplier: 'Commercial Real Estate Partners', createdAt: '2024-01-30', category: 'Real Estate Services' },
      
      // Small value invoices
      '4001': { amount: 25.99, status: 'pending', supplier: 'Coffee Shop Corner', createdAt: '2024-02-01', category: 'Office Refreshments' },
      '4002': { amount: 89.50, status: 'pending', supplier: 'Stationery World', createdAt: '2024-02-02', category: 'Office Supplies' },
      '4003': { amount: 15.75, status: 'pending', supplier: 'Quick Print Services', createdAt: '2024-02-03', category: 'Printing' },
      
      // International suppliers
      '5001': { amount: 3500.00, status: 'pending', supplier: 'European Tech Solutions GmbH', createdAt: '2024-02-04', category: 'International Services', currency: 'EUR' },
      '5002': { amount: 8200.00, status: 'pending', supplier: 'Asian Manufacturing Co Ltd', createdAt: '2024-02-05', category: 'Manufacturing', currency: 'USD' },
      '5003': { amount: 1250.00, status: 'pending', supplier: 'Canadian Consulting Inc', createdAt: '2024-02-06', category: 'Consulting', currency: 'CAD' },
      
      // Edge cases for testing
      '6001': { amount: 0.01, status: 'pending', supplier: 'Minimal Amount Test', createdAt: '2024-02-07', category: 'Test Case' },
      '6002': { amount: 999999.99, status: 'pending', supplier: 'Maximum Amount Test', createdAt: '2024-02-08', category: 'Large Transaction' },
      '6003': { amount: 1000.001, status: 'pending', supplier: 'Precision Test Corp', createdAt: '2024-02-09', category: 'Decimal Precision' }
    };

    const invoice = mockInvoices[invoiceId.toString()];
    
    if (!invoice) {
      console.log(`Invoice ${invoiceId} not found`);
      return false;
    }

    if (invoice.status !== 'pending') {
      console.log(`Invoice ${invoiceId} status is ${invoice.status}, not pending`);
      return false;
    }

    if (parseFloat(invoice.amount) !== parseFloat(amount)) {
      console.log(`Invoice ${invoiceId} amount mismatch: expected ${invoice.amount}, got ${amount}`);
      return false;
    }

    console.log(`Invoice ${invoiceId} verified successfully`);
    return true;

  } catch (error) {
    console.error('Error in verification logic:', error);
    return false;
  }
}

// 2. Get invoice details endpoint (for debugging/testing)
app.get('/api/invoice/:invoiceId', async (req, res) => {
  try {
    const { invoiceId } = req.params;
    
    // Validate authorization
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        error: 'Unauthorized',
        message: 'Valid Bearer token required'
      });
    }

    const token = authHeader.split(' ')[1];
    if (token !== process.env.API_KEY) {
      return res.status(401).json({ 
        error: 'Unauthorized',
        message: 'Invalid API key'
      });
    }

    // Mock invoice lookup
    const mockInvoices = {
      // Pending invoices (valid for verification)
      '1001': { id: '1001', amount: 1250.50, status: 'pending', supplier: 'TechCorp Solutions', createdAt: '2024-01-15', category: 'Software License' },
      '1002': { id: '1002', amount: 3750.00, status: 'pending', supplier: 'Global Manufacturing Ltd', createdAt: '2024-01-16', category: 'Raw Materials' },
      '1003': { id: '1003', amount: 890.25, status: 'pending', supplier: 'Office Supplies Pro', createdAt: '2024-01-17', category: 'Office Equipment' },
      '1004': { id: '1004', amount: 15000.00, status: 'pending', supplier: 'Construction Materials Inc', createdAt: '2024-01-18', category: 'Construction' },
      '1005': { id: '1005', amount: 2200.75, status: 'pending', supplier: 'Marketing Agency Plus', createdAt: '2024-01-19', category: 'Marketing Services' },
      '1006': { id: '1006', amount: 450.00, status: 'pending', supplier: 'Local Catering Services', createdAt: '2024-01-20', category: 'Catering' },
      '1007': { id: '1007', amount: 8500.00, status: 'pending', supplier: 'IT Consulting Group', createdAt: '2024-01-21', category: 'Consulting' },
      '1008': { id: '1008', amount: 1875.30, status: 'pending', supplier: 'Energy Solutions Corp', createdAt: '2024-01-22', category: 'Utilities' },
      '1009': { id: '1009', amount: 12000.00, status: 'pending', supplier: 'Heavy Machinery Rentals', createdAt: '2024-01-23', category: 'Equipment Rental' },
      '1010': { id: '1010', amount: 675.50, status: 'pending', supplier: 'Legal Services LLC', createdAt: '2024-01-24', category: 'Legal Services' },
      
      // Test invoices
      '12345': { id: '12345', amount: 5000.00, status: 'pending', supplier: 'Test Supplier', createdAt: '2024-01-25', category: 'Test Category' },
      '99999': { id: '99999', amount: 999.99, status: 'pending', supplier: 'Debug Supplier', createdAt: '2024-01-26', category: 'Testing' },
      '55555': { id: '55555', amount: 7500.25, status: 'pending', supplier: 'Demo Company', createdAt: '2024-01-27', category: 'Demo Services' },
      
      // Already processed invoices (invalid for verification)
      '2001': { id: '2001', amount: 3200.00, status: 'paid', supplier: 'Paid Supplier A', createdAt: '2024-01-10', category: 'Completed Services', paidAt: '2024-01-28' },
      '2002': { id: '2002', amount: 1800.75, status: 'rejected', supplier: 'Rejected Supplier B', createdAt: '2024-01-11', category: 'Invalid Request', rejectedAt: '2024-01-29' },
      '2003': { id: '2003', amount: 4500.00, status: 'paid', supplier: 'Quick Pay Corp', createdAt: '2024-01-12', category: 'Express Service', paidAt: '2024-01-30' },
      '2004': { id: '2004', amount: 950.25, status: 'cancelled', supplier: 'Cancelled Order Ltd', createdAt: '2024-01-13', category: 'Cancelled Order', cancelledAt: '2024-01-31' },
      '2005': { id: '2005', amount: 6750.00, status: 'disputed', supplier: 'Dispute Corp', createdAt: '2024-01-14', category: 'Disputed Service', disputedAt: '2024-02-01' },
      
      // High-value invoices
      '3001': { id: '3001', amount: 50000.00, status: 'pending', supplier: 'Enterprise Solutions Mega Corp', createdAt: '2024-01-28', category: 'Enterprise Software' },
      '3002': { id: '3002', amount: 75000.50, status: 'pending', supplier: 'Industrial Equipment Specialists', createdAt: '2024-01-29', category: 'Industrial Equipment' },
      '3003': { id: '3003', amount: 125000.00, status: 'pending', supplier: 'Commercial Real Estate Partners', createdAt: '2024-01-30', category: 'Real Estate Services' },
      
      // Small value invoices
      '4001': { id: '4001', amount: 25.99, status: 'pending', supplier: 'Coffee Shop Corner', createdAt: '2024-02-01', category: 'Office Refreshments' },
      '4002': { id: '4002', amount: 89.50, status: 'pending', supplier: 'Stationery World', createdAt: '2024-02-02', category: 'Office Supplies' },
      '4003': { id: '4003', amount: 15.75, status: 'pending', supplier: 'Quick Print Services', createdAt: '2024-02-03', category: 'Printing' },
      
      // International suppliers
      '5001': { id: '5001', amount: 3500.00, status: 'pending', supplier: 'European Tech Solutions GmbH', createdAt: '2024-02-04', category: 'International Services', currency: 'EUR' },
      '5002': { id: '5002', amount: 8200.00, status: 'pending', supplier: 'Asian Manufacturing Co Ltd', createdAt: '2024-02-05', category: 'Manufacturing', currency: 'USD' },
      '5003': { id: '5003', amount: 1250.00, status: 'pending', supplier: 'Canadian Consulting Inc', createdAt: '2024-02-06', category: 'Consulting', currency: 'CAD' },
      
      // Edge cases for testing
      '6001': { id: '6001', amount: 0.01, status: 'pending', supplier: 'Minimal Amount Test', createdAt: '2024-02-07', category: 'Test Case' },
      '6002': { id: '6002', amount: 999999.99, status: 'pending', supplier: 'Maximum Amount Test', createdAt: '2024-02-08', category: 'Large Transaction' },
      '6003': { id: '6003', amount: 1000.001, status: 'pending', supplier: 'Precision Test Corp', createdAt: '2024-02-09', category: 'Decimal Precision' }
    };

    const invoice = mockInvoices[invoiceId];
    
    if (!invoice) {
      return res.status(404).json({
        error: 'Invoice not found',
        invoiceId
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

// 3. Bulk invoice verification endpoint
app.post('/api/verify-invoices-bulk', async (req, res) => {
  try {
    const { invoices } = req.body; // Array of {invoiceId, amount}
    
    if (!invoices || !Array.isArray(invoices)) {
      return res.status(400).json({
        error: 'Invalid request',
        message: 'invoices array is required'
      });
    }

    // Validate authorization
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        error: 'Unauthorized',
        message: 'Valid Bearer token required'
      });
    }

    const token = authHeader.split(' ')[1];
    if (token !== process.env.API_KEY) {
      return res.status(401).json({ 
        error: 'Unauthorized',
        message: 'Invalid API key'
      });
    }

    const results = [];
    
    for (const invoice of invoices) {
      const { invoiceId, amount } = invoice;
      const isValid = await verifyInvoiceLogic(invoiceId, amount);
      
      results.push({
        invoiceId,
        amount,
        isValid,
        timestamp: Date.now()
      });
    }

    res.json({
      success: true,
      results,
      totalProcessed: results.length,
      validCount: results.filter(r => r.isValid).length,
      timestamp: Date.now()
    });

  } catch (error) {
    console.error('Bulk verification error:', error);
    res.status(500).json({
      error: 'Bulk verification failed',
      message: error.message
    });
  }
});

// 4. Test endpoint for Chainlink Functions testing
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
      encodedResult: isValid ? 1 : 0 // Same format as your smart contract expects
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

// 5. Computation endpoint - for complex calculations
app.post('/api/compute', async (req, res) => {
  try {
    const { operation, data, parameters } = req.body;

    if (!operation || !data) {
      return res.status(400).json({ error: 'operation and data are required' });
    }

    let result;

    switch (operation) {
      case 'average':
        const values = Array.isArray(data) ? data : Object.values(data);
        result = values.reduce((sum, val) => sum + Number(val), 0) / values.length;
        break;
      
      case 'volatility':
        const prices = Array.isArray(data) ? data : Object.values(data);
        const mean = prices.reduce((sum, val) => sum + Number(val), 0) / prices.length;
        const variance = prices.reduce((sum, val) => sum + Math.pow(Number(val) - mean, 2), 0) / prices.length;
        result = Math.sqrt(variance);
        break;
      
      case 'weighted_average':
        if (!parameters?.weights) {
          return res.status(400).json({ error: 'weights required for weighted_average' });
        }
        const weightedSum = data.reduce((sum, val, i) => sum + (Number(val) * parameters.weights[i]), 0);
        const totalWeight = parameters.weights.reduce((sum, weight) => sum + weight, 0);
        result = weightedSum / totalWeight;
        break;
      
      default:
        return res.status(400).json({ error: 'Unsupported operation' });
    }

    res.json({
      success: true,
      operation,
      result,
      timestamp: Date.now()
    });
  } catch (error) {
    console.error('Error in computation:', error);
    res.status(500).json({
      error: 'Computation failed',
      message: error.message
    });
  }
});

// 3. Aggregation endpoint - combine multiple data sources
app.post('/api/aggregate', async (req, res) => {
  try {
    const { sources, method = 'median' } = req.body;

    if (!sources || !Array.isArray(sources)) {
      return res.status(400).json({ error: 'sources array is required' });
    }

    // Mock aggregation logic
    const values = sources.map(source => source.value).filter(val => val !== null && val !== undefined);
    
    if (values.length === 0) {
      return res.status(400).json({ error: 'No valid values to aggregate' });
    }

    let result;
    const sortedValues = values.sort((a, b) => a - b);

    switch (method) {
      case 'median':
        const mid = Math.floor(sortedValues.length / 2);
        result = sortedValues.length % 2 === 0 
          ? (sortedValues[mid - 1] + sortedValues[mid]) / 2 
          : sortedValues[mid];
        break;
      
      case 'mean':
        result = values.reduce((sum, val) => sum + val, 0) / values.length;
        break;
      
      case 'min':
        result = Math.min(...values);
        break;
      
      case 'max':
        result = Math.max(...values);
        break;
      
      default:
        return res.status(400).json({ error: 'Unsupported aggregation method' });
    }

    res.json({
      success: true,
      method,
      result,
      sources_count: values.length,
      timestamp: Date.now()
    });
  } catch (error) {
    console.error('Error in aggregation:', error);
    res.status(500).json({
      error: 'Aggregation failed',
      message: error.message
    });
  }
});

// 4. Validation endpoint - validate data integrity
app.post('/api/validate', async (req, res) => {
  try {
    const { data, rules } = req.body;

    if (!data || !rules) {
      return res.status(400).json({ error: 'data and rules are required' });
    }

    const validationResults = [];

    for (const rule of rules) {
      const { field, type, min, max, required } = rule;
      const value = data[field];

      const result = {
        field,
        valid: true,
        errors: []
      };

      if (required && (value === null || value === undefined)) {
        result.valid = false;
        result.errors.push('Field is required');
      }

      if (value !== null && value !== undefined) {
        if (type === 'number' && isNaN(Number(value))) {
          result.valid = false;
          result.errors.push('Must be a number');
        }

        if (type === 'number' && !isNaN(Number(value))) {
          const numValue = Number(value);
          if (min !== undefined && numValue < min) {
            result.valid = false;
            result.errors.push(`Must be >= ${min}`);
          }
          if (max !== undefined && numValue > max) {
            result.valid = false;
            result.errors.push(`Must be <= ${max}`);
          }
        }
      }

      validationResults.push(result);
    }

    const isValid = validationResults.every(result => result.valid);

    res.json({
      success: true,
      valid: isValid,
      results: validationResults,
      timestamp: Date.now()
    });
  } catch (error) {
    console.error('Error in validation:', error);
    res.status(500).json({
      error: 'Validation failed',
      message: error.message
    });
  }
});

// 5. Webhook endpoint for receiving data updates
app.post('/api/webhook/:id', (req, res) => {
  try {
    const { id } = req.params;
    const payload = req.body;

    console.log(`Webhook ${id} received:`, payload);

    // Process webhook data here
    // You might want to store this in a database or trigger other actions

    res.json({
      success: true,
      webhook_id: id,
      received_at: Date.now(),
      message: 'Webhook processed successfully'
    });
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).json({
      error: 'Webhook processing failed',
      message: error.message
    });
  }
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
    message: `${req.method} ${req.path} is not a valid endpoint`
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Chainlink Functions server running on port ${PORT}`);
  console.log(`📋 Health check: http://localhost:${PORT}/health`);
  console.log(`🔗 API base URL: http://localhost:${PORT}/api`);
});