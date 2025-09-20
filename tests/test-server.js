// Test the payment workflow without Square API
const express = require('express');
const session = require('express-session');

const app = express();

// Mock session setup for testing
app.use(session({
  secret: 'test_secret',
  resave: false,
  saveUninitialized: false
}));

app.use(express.json());

// Simulate a booking in session for testing
app.get('/test-setup', (req, res) => {
  req.session.pendingBooking = {
    date: '2025-09-20',
    time: '10:00',
    service: 'microblading',
    serviceInfo: { name: 'Microblading', price: 35000 }
  };
  res.json({ message: 'Test booking created', booking: req.session.pendingBooking });
});

// Import payment functions
const { 
  calculateDownPayment, 
  calculateRemainingPayment 
} = require('../services/payments');

// Test payment calculations endpoint
app.get('/test-calculations', (req, res) => {
  const amounts = [35000, 30000, 20000, 15000]; // Service prices in cents
  const results = amounts.map(amount => ({
    total: amount / 100,
    downPayment: calculateDownPayment(amount) / 100,
    remaining: calculateRemainingPayment(amount) / 100
  }));
  
  res.json({ calculations: results });
});

// Test webhook signature verification
app.post('/test-webhook', (req, res) => {
  const crypto = require('crypto');
  const testKey = 'test_webhook_signature_key';
  const body = JSON.stringify(req.body);
  const url = 'https://example.com/webhooks/square';
  
  const hmac = crypto.createHmac('sha256', testKey);
  hmac.update(url + body);
  const signature = hmac.digest('base64');
  
  res.json({
    message: 'Webhook signature test',
    body: body,
    expectedSignature: signature
  });
});

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`Test server running on http://localhost:${PORT}`);
  console.log('Available test endpoints:');
  console.log('- GET /test-setup (create test booking)');
  console.log('- GET /test-calculations (test payment calculations)');
  console.log('- POST /test-webhook (test webhook signature)');
});

module.exports = app;