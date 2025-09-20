const express = require('express');
const crypto = require('crypto');
const { getDatabase } = require('../database');
const router = express.Router();

// Enhanced Square webhook signature verification
function verifySquareSignature(body, signature, signatureKey) {
  if (!signature || !signatureKey) {
    console.warn('Missing signature or signature key for webhook verification');
    return false;
  }

  try {
    // Square uses HMAC-SHA256 for webhook signatures
    const computedSignature = crypto
      .createHmac('sha256', signatureKey)
      .update(body)
      .digest('base64');

    return signature === computedSignature;
  } catch (error) {
    console.error('Error verifying Square webhook signature:', error);
    return false;
  }
}

// Enhanced middleware to verify Square webhook signatures
const verifySignature = (req, res, next) => {
  try {
    const signature = req.headers['x-square-hmacsha256-signature'] || req.headers['x-square-signature'];
    const signatureKey = process.env.SQUARE_WEBHOOK_SIGNATURE_KEY;
    const body = req.rawBody || JSON.stringify(req.body);
    
    // Skip signature verification in development if not configured
    if (process.env.NODE_ENV !== 'production' && !signatureKey) {
      console.log('Skipping webhook signature verification in development mode');
      return next();
    }
    
    if (!verifySquareSignature(body, signature, signatureKey)) {
      console.error('Square webhook signature verification failed');
      return res.status(401).json({ error: 'Invalid webhook signature' });
    }
    
    next();
  } catch (error) {
    console.error('Webhook signature verification failed:', error);
    res.status(401).json({ error: 'Webhook verification failed' });
  }
};

// Enhanced Square webhook endpoint for payment events
router.post('/square', express.raw({ type: 'application/json' }), (req, res, next) => {
  req.rawBody = req.body;
  next();
}, express.json(), verifySignature, async (req, res) => {
  try {
    const { type, data, event_id, created_at } = req.body;
    
    console.log('Received Square webhook:', {
      type,
      eventId: event_id,
      createdAt: created_at
    });
    
    switch (type) {
      case 'payment.created':
        await handlePaymentCreated(data.object.payment);
        break;
        
      case 'payment.updated':
        await handlePaymentUpdated(data.object.payment);
        break;
        
      case 'invoice.payment_made':
        await handleInvoicePaymentMade(data.object.invoice);
        break;

      case 'invoice.published':
        await handleInvoicePublished(data.object.invoice);
        break;

      case 'invoice.payment_request.sent':
        await handleInvoicePaymentRequestSent(data.object.invoice);
        break;
        
      default:
        console.log('Unhandled webhook type:', type);
    }
    
    // Always respond with 200 to acknowledge receipt
    res.status(200).json({ status: 'received', eventId: event_id });
    
  } catch (error) {
    console.error('Webhook processing error:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

// Enhanced webhook event handlers with database integration
async function handlePaymentCreated(payment) {
  console.log('Processing payment.created webhook:', {
    paymentId: payment.id,
    amount: payment.amount_money?.amount,
    status: payment.status
  });

  try {
    const db = getDatabase();
    if (!db.isReady()) {
      await db.connect();
    }
    
    // Record payment in database
    await db.run(`
      INSERT OR REPLACE INTO payments (
        square_payment_id, appointment_id, amount, type, status, 
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [
      payment.id,
      null, // Will be linked later when appointment is associated
      payment.amount_money?.amount || 0,
      'square_payment',
      payment.status,
      new Date().toISOString(),
      new Date().toISOString()
    ]);

    console.log(`Payment ${payment.id} recorded in database`);
  } catch (error) {
    console.error('Error recording payment in database:', error);
    // Don't throw - we still want to acknowledge the webhook
  }
}

async function handlePaymentUpdated(payment) {
  console.log('Processing payment.updated webhook:', {
    paymentId: payment.id,
    status: payment.status
  });

  try {
    const db = getDatabase();
    if (!db.isReady()) {
      await db.connect();
    }
    
    // Update payment status
    await db.run(`
      UPDATE payments 
      SET status = ?, updated_at = ?
      WHERE square_payment_id = ?
    `, [payment.status, new Date().toISOString(), payment.id]);

    // If payment is completed, update related appointments
    if (payment.status === 'COMPLETED') {
      await db.run(`
        UPDATE appointments 
        SET status = 'confirmed'
        WHERE id = (
          SELECT appointment_id FROM payments 
          WHERE square_payment_id = ? AND appointment_id IS NOT NULL
        )
      `, [payment.id]);
    }

    console.log(`Payment ${payment.id} status updated to ${payment.status}`);
  } catch (error) {
    console.error('Error updating payment status:', error);
  }
}

async function handleInvoicePaymentMade(invoice) {
  console.log('Processing invoice.payment_made webhook:', {
    invoiceId: invoice.id,
    status: invoice.invoice_request?.request_type
  });
  
  // Handle remaining payment invoice completion
  console.log(`Invoice ${invoice.id} payment received`);
}

async function handleInvoicePublished(invoice) {
  console.log('Processing invoice.published webhook:', {
    invoiceId: invoice.id
  });
  
  console.log(`Invoice ${invoice.id} published and sent to customer`);
}

async function handleInvoicePaymentRequestSent(invoice) {
  console.log('Processing invoice.payment_request.sent webhook:', {
    invoiceId: invoice.id
  });
  
  console.log(`Invoice payment request sent for ${invoice.id}`);
}

// Health check endpoint for webhook monitoring
router.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    service: 'webhooks',
    timestamp: new Date().toISOString()
  });
});

// Development test endpoint
router.post('/test', express.json(), (req, res) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(404).json({ error: 'Test endpoint not available in production' });
  }

  console.log('Test webhook received:', req.body);
  res.status(200).json({ 
    status: 'test_received', 
    body: req.body,
    timestamp: new Date().toISOString()
  });
});

module.exports = router;