const express = require('express');
const cors = require('cors');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Basic route
app.get('/', (req, res) => {
    res.json({ 
        message: 'Server is running on Vercel!',
        status: 'success',
        timestamp: new Date().toISOString()
    });
});

// Health check route
app.get('/health', (req, res) => {
    res.json({ 
        status: 'healthy',
        uptime: process.uptime(),
        timestamp: new Date().toISOString()
    });
});

// Add your other routes here
// Example routes you can customize:

app.get('/api/test', (req, res) => {
    res.json({
        message: 'Test route working!',
        method: 'GET'
    });
});

app.post('/api/data', (req, res) => {
    const { body } = req;
    res.json({
        message: 'Data received successfully',
        receivedData: body,
        timestamp: new Date().toISOString()
    });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({
        error: 'Something went wrong!',
        message: err.message
    });
});

// 404 handler
app.use('*', (req, res) => {
    res.status(404).json({
        error: 'Route not found',
        path: req.originalUrl
    });
});

// Export the Express app (don't use app.listen() here)
module.exports = app;