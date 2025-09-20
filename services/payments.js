const { paymentsApi, ordersApi, invoicesApi } = require('./square');
const { v4: uuidv4 } = require('uuid');

/**
 * Calculate down payment amount (20% of total)
 * @param {number} totalAmount - Total amount in cents
 * @returns {number} Down payment amount in cents
 */
function calculateDownPayment(totalAmount) {
  return Math.round(totalAmount * 0.2);
}

/**
 * Calculate remaining payment amount (80% of total)
 * @param {number} totalAmount - Total amount in cents
 * @returns {number} Remaining payment amount in cents
 */
function calculateRemainingPayment(totalAmount) {
  return totalAmount - calculateDownPayment(totalAmount);
}

/**
 * Get service pricing information
 * @returns {Object} Service pricing data in cents for Square
 */
async function getServicePricing() {
  return {
    'microblading': { name: 'Microblading', price: 35000 }, // $350.00
    'microshading': { name: 'Microshading', price: 30000 }, // $300.00
    'lipglow': { name: 'Lip Glow', price: 20000 }, // $200.00
    'browmapping': { name: 'Brow Mapping', price: 15000 }  // $150.00
  };
}

/**
 * Process down payment (20% of total) using Square
 * @param {Object} booking - Booking details
 * @param {string} sourceId - Square payment source ID
 * @param {number} totalAmount - Total service amount in cents
 * @returns {Promise<Object>} Payment result
 */
async function processDownPayment(booking, sourceId, totalAmount) {
  try {
    const downPaymentAmount = calculateDownPayment(totalAmount);
    const idempotencyKey = uuidv4();
    
    const paymentRequest = {
      sourceId: sourceId,
      idempotencyKey: idempotencyKey,
      amountMoney: {
        amount: downPaymentAmount,
        currency: 'USD'
      },
      note: `Down payment for ${booking.service} on ${booking.date} at ${booking.time}`,
      locationId: process.env.SQUARE_LOCATION_ID
    };
    
    console.log('Processing down payment:', {
      amount: downPaymentAmount,
      service: booking.service,
      date: booking.date
    });
    
    const response = await paymentsApi.create(paymentRequest);
    
    if (response.result.payment) {
      const payment = response.result.payment;
      
      console.log('✅ Down payment successful:', {
        paymentId: payment.id,
        amount: payment.amountMoney.amount,
        status: payment.status
      });
      
      return {
        success: true,
        paymentId: payment.id,
        amount: payment.amountMoney.amount,
        status: payment.status,
        receiptUrl: payment.receiptUrl,
        type: 'down_payment'
      };
    } else {
      throw new Error('Payment response missing payment object');
    }
    
  } catch (error) {
    console.error('❌ Down payment failed:', error);
    
    return {
      success: false,
      error: error.message || 'Payment processing failed',
      type: 'down_payment'
    };
  }
}

/**
 * Process full payment using Square
 * @param {Object} booking - Booking details
 * @param {string} sourceId - Square payment source ID
 * @param {number} totalAmount - Total service amount in cents
 * @returns {Promise<Object>} Payment result
 */
async function processFullPayment(booking, sourceId, totalAmount) {
  try {
    const idempotencyKey = uuidv4();
    
    const paymentRequest = {
      sourceId: sourceId,
      idempotencyKey: idempotencyKey,
      amountMoney: {
        amount: totalAmount,
        currency: 'USD'
      },
      note: `Full payment for ${booking.service} on ${booking.date} at ${booking.time}`,
      locationId: process.env.SQUARE_LOCATION_ID
    };
    
    console.log('Processing full payment:', {
      amount: totalAmount,
      service: booking.service,
      date: booking.date
    });
    
    const response = await paymentsApi.create(paymentRequest);
    
    if (response.result.payment) {
      const payment = response.result.payment;
      
      console.log('✅ Full payment successful:', {
        paymentId: payment.id,
        amount: payment.amountMoney.amount,
        status: payment.status
      });
      
      return {
        success: true,
        paymentId: payment.id,
        amount: payment.amountMoney.amount,
        status: payment.status,
        receiptUrl: payment.receiptUrl,
        type: 'full_payment'
      };
    } else {
      throw new Error('Payment response missing payment object');
    }
    
  } catch (error) {
    console.error('❌ Full payment failed:', error);
    
    return {
      success: false,
      error: error.message || 'Payment processing failed',
      type: 'full_payment'
    };
  }
}

/**
 * Create Square invoice for remaining payment (80%)
 * @param {Object} appointmentData - Appointment details
 * @param {string} customerEmail - Customer email address
 * @returns {Promise<Object>} Invoice creation result
 */
async function createRemainingPaymentInvoice(appointmentData, customerEmail) {
  try {
    const remainingAmount = calculateRemainingPayment(appointmentData.serviceInfo.price);
    const invoiceNumber = `LYRA-${Date.now()}`;
    
    const invoiceRequest = {
      invoice: {
        locationId: process.env.SQUARE_LOCATION_ID,
        invoiceNumber: invoiceNumber,
        title: `Remaining Payment - ${appointmentData.service}`,
        description: `Remaining payment for ${appointmentData.service} appointment on ${appointmentData.date} at ${appointmentData.time}`,
        primaryRecipient: {
          customerId: customerEmail // In production, this should be a Square customer ID
        },
        paymentRequests: [{
          requestMethod: 'EMAIL',
          requestType: 'BALANCE',
          dueDate: appointmentData.date // Due by appointment date
        }],
        orderRequest: {
          order: {
            locationId: process.env.SQUARE_LOCATION_ID,
            lineItems: [{
              name: `Remaining Payment - ${appointmentData.serviceInfo.name}`,
              quantity: '1',
              basePriceMoney: {
                amount: remainingAmount,
                currency: 'USD'
              }
            }]
          }
        },
        acceptedPaymentMethods: {
          card: true,
          squareGiftCard: false,
          bankAccount: true,
          buyNowPayLater: false
        }
      }
    };
    
    console.log('Creating invoice for remaining payment:', {
      amount: remainingAmount,
      customer: customerEmail,
      appointmentDate: appointmentData.date
    });
    
    const response = await invoicesApi.create(invoiceRequest);
    
    if (response.result.invoice) {
      const invoice = response.result.invoice;
      
      // Publish the invoice to send it
      const publishRequest = {
        version: invoice.version
      };
      
      await invoicesApi.publish(invoice.id, publishRequest);
      
      console.log('✅ Invoice created and sent:', {
        invoiceId: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        amount: remainingAmount
      });
      
      return {
        success: true,
        invoiceId: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        amount: remainingAmount,
        publicUrl: invoice.publicUrl
      };
    } else {
      throw new Error('Invoice response missing invoice object');
    }
    
  } catch (error) {
    console.error('❌ Invoice creation failed:', error);
    
    return {
      success: false,
      error: error.message || 'Invoice creation failed'
    };
  }
}

module.exports = {
  calculateDownPayment,
  calculateRemainingPayment,
  getServicePricing,
  processDownPayment,
  processFullPayment,
  createRemainingPaymentInvoice
};