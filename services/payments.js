const { v4: uuidv4 } = require('uuid');
const { paymentsApi, invoicesApi, refundsApi, squareConfig } = require('../config/square');

/**
 * Process full payment
 * @param {Object} booking - Booking details
 * @param {string} sourceId - Payment source ID from Square form
 * @param {number} amount - Amount in cents
 * @returns {Object} Payment result
 */
async function processFullPayment(booking, sourceId, amount) {
  try {
    // Input validation
    if (!booking || !booking.serviceInfo || !booking.date || !booking.time) {
      throw new Error('Invalid booking data provided');
    }
    if (!sourceId || typeof sourceId !== 'string') {
      throw new Error('Valid payment source ID is required');
    }
    if (!amount || amount <= 0 || !Number.isInteger(amount)) {
      throw new Error('Valid payment amount in cents is required');
    }

    const paymentRequest = {
      sourceId: sourceId,
      idempotencyKey: uuidv4(),
      amountMoney: {
        amount: amount,
        currency: 'USD'
      },
      locationId: squareConfig.locationId,
      note: `Full payment for ${booking.serviceInfo.name} - ${booking.date} at ${booking.time}`,
      referenceId: `booking_${booking.date}_${booking.time}_${Date.now()}`
    };

    const response = await paymentsApi.createPayment(paymentRequest);
    
    if (response.result && response.result.payment) {
      return {
        success: true,
        paymentId: response.result.payment.id,
        amount: amount,
        remainingAmount: 0,
        status: response.result.payment.status,
        referenceId: paymentRequest.referenceId
      };
    } else {
      throw new Error('Payment response missing payment data');
    }
  } catch (error) {
    console.error('Full payment processing error:', error);
    return {
      success: false,
      error: error.message || 'Payment processing failed',
      code: error.code || 'PAYMENT_ERROR'
    };
  }
}

/**
 * Process down payment (20% of service price)
 * @param {Object} booking - Booking details
 * @param {string} sourceId - Payment source ID from Square form
 * @param {number} amount - Amount in cents
 * @returns {Object} Payment result
 */
async function processDownPayment(booking, sourceId, amount) {
  try {
    // Input validation
    if (!booking || !booking.serviceInfo || !booking.date || !booking.time) {
      throw new Error('Invalid booking data provided');
    }
    if (!sourceId || typeof sourceId !== 'string') {
      throw new Error('Valid payment source ID is required');
    }
    if (!amount || amount <= 0 || !Number.isInteger(amount)) {
      throw new Error('Valid payment amount in cents is required');
    }

    const downPaymentAmount = Math.round(amount * 0.2); // 20% down payment
    
    const paymentRequest = {
      sourceId: sourceId,
      idempotencyKey: uuidv4(),
      amountMoney: {
        amount: downPaymentAmount,
        currency: 'USD'
      },
      locationId: squareConfig.locationId,
      note: `Down payment (20%) for ${booking.serviceInfo.name} - ${booking.date} at ${booking.time}`,
      referenceId: `booking_${booking.date}_${booking.time}_${Date.now()}`
    };

    const response = await paymentsApi.createPayment(paymentRequest);
    
    if (response.result && response.result.payment) {
      return {
        success: true,
        paymentId: response.result.payment.id,
        amount: downPaymentAmount,
        remainingAmount: amount - downPaymentAmount,
        status: response.result.payment.status,
        referenceId: paymentRequest.referenceId
      };
    } else {
      throw new Error('Payment response missing payment data');
    }
  } catch (error) {
    console.error('Down payment processing error:', error);
    return {
      success: false,
      error: error.message || 'Payment processing failed',
      code: error.code || 'PAYMENT_ERROR'
    };
  }
}

/**
 * Create invoice for remaining payment
 * @param {Object} booking - Booking details
 * @param {number} remainingAmount - Remaining amount in cents
 * @param {string} downPaymentId - ID of the down payment
 * @returns {Object} Invoice result
 */
async function createRemainingPaymentInvoice(booking, remainingAmount, downPaymentId) {
  try {
    // Input validation
    if (!booking || !booking.serviceInfo || !booking.date || !booking.time) {
      throw new Error('Invalid booking data provided');
    }
    if (!remainingAmount || remainingAmount <= 0 || !Number.isInteger(remainingAmount)) {
      throw new Error('Valid remaining amount in cents is required');
    }
    if (!downPaymentId || typeof downPaymentId !== 'string') {
      throw new Error('Valid down payment ID is required');
    }

    // Create order first for the invoice
    const orderRequest = {
      locationId: squareConfig.locationId,
      order: {
        locationId: squareConfig.locationId,
        lineItems: [{
          name: `Balance for ${booking.serviceInfo.name}`,
          quantity: '1',
          basePriceMoney: {
            amount: remainingAmount,
            currency: 'USD'
          }
        }]
      }
    };

    const invoiceRequest = {
      invoice: {
        locationId: squareConfig.locationId,
        invoiceNumber: `INV-${Date.now()}`,
        title: `Remaining Payment - ${booking.serviceInfo.name}`,
        description: `Balance payment for ${booking.serviceInfo.name} appointment on ${booking.date} at ${booking.time}. Down payment ID: ${downPaymentId}`,
        primaryRecipient: {
          customerId: booking.customerId || undefined
        },
        paymentRequests: [{
          requestMethod: 'BALANCE',
          requestType: 'BALANCE'
        }],
        deliveryMethod: 'EMAIL',
        invoiceRequestMethod: 'EMAIL',
        status: 'DRAFT',
        orderRequest: orderRequest
      }
    };

    const response = await invoicesApi.createInvoice(invoiceRequest);
    
    if (response.result && response.result.invoice) {
      const invoiceId = response.result.invoice.id;
      
      // Attempt to publish/send the invoice
      try {
        const publishRequest = {
          requestMethod: 'SEND'
        };
        
        const publishResponse = await invoicesApi.sendInvoice(invoiceId, publishRequest);
        console.log('Invoice sent successfully:', invoiceId);
      } catch (publishError) {
        console.warn('Failed to send invoice automatically:', publishError.message);
        // Continue without failing - invoice was created successfully
      }
      
      return {
        success: true,
        invoiceId: response.result.invoice.id,
        invoiceNumber: response.result.invoice.invoiceNumber,
        amount: remainingAmount,
        status: response.result.invoice.status
      };
    } else {
      throw new Error('Invoice response missing invoice data');
    }
  } catch (error) {
    console.error('Invoice creation error:', error);
    return {
      success: false,
      error: error.message || 'Invoice creation failed',
      code: error.code || 'INVOICE_ERROR'
    };
  }
}

/**
 * Process refund for cancellation (keep 20% down payment)
 * @param {string} paymentId - Original payment ID
 * @param {number} refundAmount - Amount to refund in cents
 * @param {string} reason - Refund reason
 * @returns {Object} Refund result
 */
async function processRefund(paymentId, refundAmount, reason = 'Appointment cancellation') {
  try {
    // Input validation
    if (!paymentId || typeof paymentId !== 'string') {
      throw new Error('Valid payment ID is required');
    }
    if (!refundAmount || refundAmount <= 0 || !Number.isInteger(refundAmount)) {
      throw new Error('Valid refund amount in cents is required');
    }
    if (!reason || typeof reason !== 'string') {
      throw new Error('Valid refund reason is required');
    }

    const refundRequest = {
      idempotencyKey: uuidv4(),
      amountMoney: {
        amount: refundAmount,
        currency: 'USD'
      },
      paymentId: paymentId,
      reason: reason
    };

    const response = await refundsApi.refundPayment(refundRequest);
    
    if (response.result && response.result.refund) {
      return {
        success: true,
        refundId: response.result.refund.id,
        amount: refundAmount,
        status: response.result.refund.status,
        reason: reason
      };
    } else {
      throw new Error('Refund response missing refund data');
    }
  } catch (error) {
    console.error('Refund processing error:', error);
    return {
      success: false,
      error: error.message || 'Refund processing failed',
      code: error.code || 'REFUND_ERROR'
    };
  }
}

/**
 * Update payment status in appointment record
 * @param {Object} appointment - Appointment object
 * @param {string} status - New payment status
 * @param {Object} paymentData - Payment data to update
 * @returns {Object} Updated appointment
 */
function updatePaymentStatus(appointment, status, paymentData) {
  appointment.paymentStatus = status;
  appointment.lastUpdated = new Date().toISOString();
  
  if (paymentData) {
    appointment.paymentData = {
      ...appointment.paymentData,
      ...paymentData
    };
  }
  
  return appointment;
}

/**
 * Calculate down payment amount (20%)
 * @param {number} totalAmount - Total amount in cents
 * @returns {number} Down payment amount in cents
 */
function calculateDownPayment(totalAmount) {
  return Math.round(totalAmount * 0.2);
}

/**
 * Calculate remaining payment amount (80%)
 * @param {number} totalAmount - Total amount in cents
 * @returns {number} Remaining payment amount in cents
 */
function calculateRemainingPayment(totalAmount) {
  return totalAmount - calculateDownPayment(totalAmount);
}

module.exports = {
  processDownPayment,
  processFullPayment,
  createRemainingPaymentInvoice,
  processRefund,
  updatePaymentStatus,
  calculateDownPayment,
  calculateRemainingPayment
};