const express = require('express');
const crypto = require('crypto');
const { squareConfig } = require('../config/square');
const { updatePaymentStatus } = require('../services/payments');

const router = express.Router();

/**
 * Verify Square webhook signature
 * @param {string} signature - Signature from Square webhook header
 * @param {string} body - Raw request body
 * @param {string} url - Webhook URL
 * @returns {boolean} Signature is valid
 */
function verifyWebhookSignature(signature, body, url) {
  if (!squareConfig.webhookSignatureKey) {
    console.warn('Webhook signature key not configured');
    return false;
  }

  try {
    const hmac = crypto.createHmac('sha256', squareConfig.webhookSignatureKey);
    hmac.update(url + body);
    const calculatedSignature = hmac.digest('base64');
    
    return signature === calculatedSignature;
  } catch (error) {
    console.error('Signature verification error:', error);
    return false;
  }
}

/**
 * Load appointments from file
 * @returns {Array} Array of appointments
 */
function loadAppointments() {
  const fs = require('fs');
  const path = require('path');
  const appointmentsFile = path.join(__dirname, '../appointments.json');
  
  try {
    const data = fs.readFileSync(appointmentsFile, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error loading appointments:', error);
    return [];
  }
}

/**
 * Save appointments to file
 * @param {Array} appointments - Array of appointments
 */
function saveAppointments(appointments) {
  const fs = require('fs');
  const path = require('path');
  const appointmentsFile = path.join(__dirname, '../appointments.json');
  
  try {
    fs.writeFileSync(appointmentsFile, JSON.stringify(appointments, null, 2));
  } catch (error) {
    console.error('Error saving appointments:', error);
  }
}

/**
 * Handle payment completion webhook
 * @param {Object} eventData - Square webhook event data
 */
async function handlePaymentCompleted(eventData) {
  try {
    const payment = eventData.data.object.payment;
    const referenceId = payment.reference_id;
    
    if (!referenceId) {
      console.log('Payment completed but no reference ID found');
      return;
    }

    // Find appointment by reference ID
    const appointments = loadAppointments();
    const appointmentIndex = appointments.findIndex(apt => 
      apt.paymentData && apt.paymentData.referenceId === referenceId
    );

    if (appointmentIndex === -1) {
      console.log('No appointment found for reference ID:', referenceId);
      return;
    }

    // Update appointment payment status
    const appointment = appointments[appointmentIndex];
    const updatedAppointment = updatePaymentStatus(appointment, 'completed', {
      finalPaymentId: payment.id,
      finalPaymentStatus: payment.status,
      completedAt: new Date().toISOString()
    });

    appointments[appointmentIndex] = updatedAppointment;
    saveAppointments(appointments);

    console.log(`Payment completed for appointment ${appointment.id}: ${payment.id}`);
  } catch (error) {
    console.error('Error handling payment completed:', error);
  }
}

/**
 * Handle payment failed webhook
 * @param {Object} eventData - Square webhook event data
 */
async function handlePaymentFailed(eventData) {
  try {
    const payment = eventData.data.object.payment;
    const referenceId = payment.reference_id;
    
    if (!referenceId) {
      console.log('Payment failed but no reference ID found');
      return;
    }

    // Find appointment by reference ID
    const appointments = loadAppointments();
    const appointmentIndex = appointments.findIndex(apt => 
      apt.paymentData && apt.paymentData.referenceId === referenceId
    );

    if (appointmentIndex === -1) {
      console.log('No appointment found for reference ID:', referenceId);
      return;
    }

    // Update appointment payment status
    const appointment = appointments[appointmentIndex];
    const updatedAppointment = updatePaymentStatus(appointment, 'failed', {
      failedPaymentId: payment.id,
      failedReason: payment.status,
      failedAt: new Date().toISOString()
    });

    appointments[appointmentIndex] = updatedAppointment;
    saveAppointments(appointments);

    console.log(`Payment failed for appointment ${appointment.id}: ${payment.id}`);
  } catch (error) {
    console.error('Error handling payment failed:', error);
  }
}

/**
 * Handle refund completed webhook
 * @param {Object} eventData - Square webhook event data
 */
async function handleRefundCompleted(eventData) {
  try {
    const refund = eventData.data.object.refund;
    const paymentId = refund.payment_id;
    
    // Find appointment by payment ID
    const appointments = loadAppointments();
    const appointmentIndex = appointments.findIndex(apt => 
      apt.paymentData && (
        apt.paymentData.paymentId === paymentId ||
        apt.paymentData.finalPaymentId === paymentId
      )
    );

    if (appointmentIndex === -1) {
      console.log('No appointment found for payment ID:', paymentId);
      return;
    }

    // Update appointment refund status
    const appointment = appointments[appointmentIndex];
    const updatedAppointment = updatePaymentStatus(appointment, 'refunded', {
      refundId: refund.id,
      refundAmount: refund.amount_money.amount,
      refundStatus: refund.status,
      refundedAt: new Date().toISOString()
    });

    appointments[appointmentIndex] = updatedAppointment;
    saveAppointments(appointments);

    console.log(`Refund completed for appointment ${appointment.id}: ${refund.id}`);
  } catch (error) {
    console.error('Error handling refund completed:', error);
  }
}

// Webhook endpoint
router.post('/square', express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    const signature = req.get('x-square-signature');
    const body = req.body.toString('utf8');
    const url = `${req.protocol}://${req.get('host')}${req.originalUrl}`;

    // Verify webhook signature
    if (!verifyWebhookSignature(signature, body, url)) {
      console.error('Invalid webhook signature');
      return res.status(401).json({ error: 'Invalid signature' });
    }

    const event = JSON.parse(body);
    console.log('Received Square webhook:', event.type);

    // Handle different event types
    switch (event.type) {
      case 'payment.created':
        console.log('Payment created:', event.data.object.payment.id);
        break;

      case 'payment.updated':
        if (event.data.object.payment.status === 'COMPLETED') {
          await handlePaymentCompleted(event);
        } else if (event.data.object.payment.status === 'FAILED') {
          await handlePaymentFailed(event);
        }
        break;

      case 'refund.created':
        console.log('Refund created:', event.data.object.refund.id);
        break;

      case 'refund.updated':
        if (event.data.object.refund.status === 'COMPLETED') {
          await handleRefundCompleted(event);
        }
        break;

      case 'invoice.created':
        console.log('Invoice created:', event.data.object.invoice.id);
        break;

      case 'invoice.updated':
        console.log('Invoice updated:', event.data.object.invoice.id);
        break;

      default:
        console.log('Unhandled webhook event type:', event.type);
    }

    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Webhook processing error:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

module.exports = router;