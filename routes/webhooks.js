const express = require('express');
const router = express.Router();
const { verifyWebhookSignature } = require('../services/square');

// Middleware to verify Square webhook signatures
const verifySignature = (req, res, next) => {
  try {
    const signature = req.headers['x-square-signature'];
    const body = req.rawBody || JSON.stringify(req.body);
    
    if (!verifyWebhookSignature(body, signature)) {
      return res.status(401).json({ error: 'Invalid webhook signature' });
    }
    
    next();
  } catch (error) {
    console.error('Webhook signature verification failed:', error);
    res.status(401).json({ error: 'Webhook verification failed' });
  }
};

// Square webhook endpoint for payment events
router.post('/square', express.raw({ type: 'application/json' }), (req, res, next) => {
  req.rawBody = req.body;
  next();
}, express.json(), verifySignature, async (req, res) => {
  try {
    const { type, data } = req.body;
    
    console.log('Received Square webhook:', type);
    
    switch (type) {
      case 'payment.created':
        // Handle payment created event
        console.log('Payment created:', data.object.payment);
        break;
        
      case 'payment.updated':
        // Handle payment updated event
        console.log('Payment updated:', data.object.payment);
        break;
        
      case 'invoice.payment_made':
        // Handle invoice payment
        console.log('Invoice payment made:', data.object.invoice);
        break;
        
      default:
        console.log('Unhandled webhook type:', type);
    }
    
    // Always respond with 200 to acknowledge receipt
    res.status(200).json({ received: true });
    
  } catch (error) {
    console.error('Webhook processing error:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

module.exports = router;