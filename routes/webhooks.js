const express = require('express');
const crypto = require('crypto');
const { getDatabase } = require('../database');

const router = express.Router();

// Middleware to capture raw body for signature verification on Square endpoint only
router.use('/square', express.raw({ type: 'application/json' }));

// Use regular JSON parsing for other endpoints
router.use('/test', express.json());
router.use('/health', express.json());

// Square webhook signature verification
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

// Square webhook endpoint
router.post('/square', async (req, res) => {
  console.log('Received Square webhook:', {
    headers: req.headers,
    bodyLength: req.body ? req.body.length : 0
  });

  try {
    // Get signature from headers
    const signature = req.headers['x-square-hmacsha256-signature'];
    const signatureKey = process.env.SQUARE_WEBHOOK_SIGNATURE_KEY;

    // Verify signature in production/staging
    if (process.env.NODE_ENV === 'production' || process.env.SQUARE_ENVIRONMENT === 'production') {
      if (!verifySquareSignature(req.body, signature, signatureKey)) {
        console.error('Square webhook signature verification failed');
        return res.status(401).json({ error: 'Signature verification failed' });
      }
    } else {
      console.log('Skipping signature verification in development mode');
    }

    // Parse the webhook body (req.body is a Buffer when using express.raw)
    let bodyString;
    let event;
    
    if (Buffer.isBuffer(req.body)) {
      bodyString = req.body.toString();
    } else if (typeof req.body === 'string') {
      bodyString = req.body;
    } else {
      // If body is already parsed as JSON object
      event = req.body;
      bodyString = JSON.stringify(req.body);
    }
    
    if (!event) {
      event = JSON.parse(bodyString);
    }
    console.log('Square webhook event received:', {
      type: event.type,
      eventId: event.event_id,
      createdAt: event.created_at
    });

    // Handle different webhook event types
    await handleSquareWebhookEvent(event);

    // Acknowledge receipt
    res.status(200).json({ status: 'received' });

  } catch (error) {
    console.error('Error processing Square webhook:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

// Handle Square webhook events
async function handleSquareWebhookEvent(event) {
  const { type, data } = event;

  try {
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
        console.log(`Unhandled Square webhook event type: ${type}`);
    }
  } catch (error) {
    console.error(`Error handling Square webhook event ${type}:`, error);
    throw error;
  }
}

// Handle payment created events
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
    
    // Update payment record in database - compatible with migration schema
    await db.run(`
      INSERT OR REPLACE INTO payments (
        square_payment_id, appointment_id, amount, type, status, 
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [
      payment.id,
      null, // Will be updated when we link to appointment
      payment.amount_money?.amount || 0,
      'square_payment',
      payment.status,
      new Date().toISOString(),
      new Date().toISOString()
    ]);

    console.log(`Payment ${payment.id} recorded in database`);
  } catch (error) {
    console.error('Error recording payment in database:', error);
    throw error;
  }
}

// Handle payment updated events
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
    
    // Update payment status in database
    await db.run(`
      UPDATE payments 
      SET status = ?, updated_at = ?
      WHERE square_payment_id = ?
    `, [payment.status, new Date().toISOString(), payment.id]);

    // If payment is completed, update appointment status
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
    throw error;
  }
}

// Handle invoice payment made events
async function handleInvoicePaymentMade(invoice) {
  console.log('Processing invoice.payment_made webhook:', {
    invoiceId: invoice.id,
    status: invoice.invoice_request?.request_type
  });

  try {
    const db = getDatabase();
    
    // Update invoice payment status
    // This would typically update the remaining payment for an appointment
    console.log(`Invoice ${invoice.id} payment received`);
  } catch (error) {
    console.error('Error processing invoice payment:', error);
    throw error;
  }
}

// Handle invoice published events
async function handleInvoicePublished(invoice) {
  console.log('Processing invoice.published webhook:', {
    invoiceId: invoice.id
  });
  
  // Log that invoice was published and sent to customer
  console.log(`Invoice ${invoice.id} published and sent to customer`);
}

// Handle invoice payment request sent events
async function handleInvoicePaymentRequestSent(invoice) {
  console.log('Processing invoice.payment_request.sent webhook:', {
    invoiceId: invoice.id
  });
  
  // Log that payment request was sent
  console.log(`Invoice payment request sent for ${invoice.id}`);
}

// Health check endpoint for webhooks
router.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    service: 'webhooks',
    timestamp: new Date().toISOString()
  });
});

// Webhook test endpoint (for development)
router.post('/test', (req, res) => {
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