const { SquareClient, SquareEnvironment } = require('square');
const { randomUUID } = require('crypto');
const { getDatabase } = require('../database');

// Initialize Square client
const squareEnvironment = process.env.SQUARE_ENVIRONMENT === 'production' 
  ? SquareEnvironment.Production 
  : SquareEnvironment.Sandbox;

const squareClient = new SquareClient({
  accessToken: process.env.SQUARE_ACCESS_TOKEN,
  environment: squareEnvironment
});

const { paymentsApi, invoicesApi } = squareClient;

// Calculate down payment (20% of total)
function calculateDownPayment(totalAmount) {
  return Math.floor(totalAmount * 0.20);
}

// Calculate remaining payment (80% of total)
function calculateRemainingPayment(totalAmount) {
  const downPayment = calculateDownPayment(totalAmount);
  return totalAmount - downPayment;
}

// Process down payment (20% of service cost)
async function processDownPayment(booking, sourceId, totalAmount) {
  const downPaymentAmount = calculateDownPayment(totalAmount);
  const remainingAmount = calculateRemainingPayment(totalAmount);

  try {
    const idempotencyKey = randomUUID();
    
    const payment = {
      sourceId,
      amountMoney: {
        amount: downPaymentAmount,
        currency: 'USD'
      },
      idempotencyKey,
      locationId: process.env.SQUARE_LOCATION_ID,
      note: `Down payment for ${booking.serviceInfo.name} appointment on ${booking.date} at ${booking.time}`,
      referenceId: `down_${booking.date}_${booking.time}`.replace(/[^a-zA-Z0-9]/g, '_')
    };

    console.log('Processing down payment:', {
      amount: downPaymentAmount,
      service: booking.serviceInfo.name,
      date: booking.date,
      time: booking.time
    });

    const response = await paymentsApi.createPayment(payment);
    
    if (response.result.payment) {
      const paymentResult = response.result.payment;
      
      console.log('Down payment successful:', {
        paymentId: paymentResult.id,
        status: paymentResult.status,
        amount: paymentResult.amountMoney.amount
      });

      return {
        success: true,
        paymentId: paymentResult.id,
        amount: downPaymentAmount,
        remainingAmount: remainingAmount,
        status: paymentResult.status
      };
    } else {
      console.error('Down payment failed: No payment object in response');
      return {
        success: false,
        error: 'Payment processing failed'
      };
    }
  } catch (error) {
    console.error('Down payment error:', error);
    
    // Extract useful error information
    let errorMessage = 'Payment processing failed';
    let errorCode = 'UNKNOWN_ERROR';
    
    if (error.result && error.result.errors) {
      const squareError = error.result.errors[0];
      errorMessage = squareError.detail || squareError.code || errorMessage;
      errorCode = squareError.code || errorCode;
    }
    
    return {
      success: false,
      error: errorMessage,
      code: errorCode
    };
  }
}

// Process full payment (100% of service cost)
async function processFullPayment(booking, sourceId, totalAmount) {
  try {
    const idempotencyKey = randomUUID();
    
    const payment = {
      sourceId,
      amountMoney: {
        amount: totalAmount,
        currency: 'USD'
      },
      idempotencyKey,
      locationId: process.env.SQUARE_LOCATION_ID,
      note: `Full payment for ${booking.serviceInfo.name} appointment on ${booking.date} at ${booking.time}`,
      referenceId: `full_${booking.date}_${booking.time}`.replace(/[^a-zA-Z0-9]/g, '_')
    };

    console.log('Processing full payment:', {
      amount: totalAmount,
      service: booking.serviceInfo.name,
      date: booking.date,
      time: booking.time
    });

    const response = await paymentsApi.createPayment(payment);
    
    if (response.result.payment) {
      const paymentResult = response.result.payment;
      
      console.log('Full payment successful:', {
        paymentId: paymentResult.id,
        status: paymentResult.status,
        amount: paymentResult.amountMoney.amount
      });

      return {
        success: true,
        paymentId: paymentResult.id,
        amount: totalAmount,
        status: paymentResult.status
      };
    } else {
      console.error('Full payment failed: No payment object in response');
      return {
        success: false,
        error: 'Payment processing failed'
      };
    }
  } catch (error) {
    console.error('Full payment error:', error);
    
    // Extract useful error information
    let errorMessage = 'Payment processing failed';
    let errorCode = 'UNKNOWN_ERROR';
    
    if (error.result && error.result.errors) {
      const squareError = error.result.errors[0];
      errorMessage = squareError.detail || squareError.code || errorMessage;
      errorCode = squareError.code || errorCode;
    }
    
    return {
      success: false,
      error: errorMessage,
      code: errorCode
    };
  }
}

// Create invoice for remaining payment (80% of service cost)
async function createRemainingPaymentInvoice(booking, remainingAmount, downPaymentId) {
  try {
    const invoiceRequest = {
      requestMethod: 'EMAIL',
      requestType: 'BALANCE',
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] // 7 days from now
    };

    const primaryRecipient = {
      customerId: booking.customerId || null // Will need to implement customer creation
    };

    const paymentRequests = [{
      requestMethod: 'EMAIL',
      requestType: 'BALANCE',
      dueDate: invoiceRequest.dueDate
    }];

    const deliveryMethod = 'EMAIL';
    const invoiceNumber = `INV-${booking.date}-${booking.time}`.replace(/[^a-zA-Z0-9-]/g, '');
    const title = `Remaining Payment - ${booking.serviceInfo.name}`;
    const description = `Remaining balance for ${booking.serviceInfo.name} appointment scheduled for ${booking.date} at ${booking.time}`;
    const scheduledAt = new Date().toISOString();
    const acceptedPaymentMethods = {
      card: true,
      squareGiftCard: false,
      bankAccount: false,
      buyNowPayLater: false
    };

    const invoice = {
      locationId: process.env.SQUARE_LOCATION_ID,
      orderRequest: {
        order: {
          locationId: process.env.SQUARE_LOCATION_ID,
          referenceId: `remaining_${booking.date}_${booking.time}`.replace(/[^a-zA-Z0-9]/g, '_'),
          lineItems: [{
            name: `Remaining Balance - ${booking.serviceInfo.name}`,
            quantity: '1',
            basePriceMoney: {
              amount: remainingAmount,
              currency: 'USD'
            },
            note: `Balance due for appointment on ${booking.date} at ${booking.time}. Down payment ID: ${downPaymentId}`
          }]
        }
      },
      primaryRecipient,
      paymentRequests,
      deliveryMethod,
      invoiceNumber,
      title,
      description,
      scheduledAt,
      acceptedPaymentMethods
    };

    console.log('Creating remaining payment invoice:', {
      amount: remainingAmount,
      invoiceNumber,
      dueDate: invoiceRequest.dueDate
    });

    const response = await invoicesApi.createInvoice(invoice);
    
    if (response.result.invoice) {
      const invoiceResult = response.result.invoice;
      
      // Publish the invoice to send it to the customer
      try {
        const publishResponse = await invoicesApi.publishInvoice(invoiceResult.id, {
          requestMethod: 'EMAIL'
        });
        
        console.log('Invoice created and published:', {
          invoiceId: invoiceResult.id,
          invoiceNumber: invoiceResult.invoiceNumber,
          status: publishResponse.result.invoice.status
        });
        
        return {
          success: true,
          invoiceId: invoiceResult.id,
          invoiceNumber: invoiceResult.invoiceNumber,
          dueDate: invoiceRequest.dueDate,
          amount: remainingAmount
        };
      } catch (publishError) {
        console.error('Error publishing invoice:', publishError);
        
        // Return success for creation but note publish failure
        return {
          success: true,
          invoiceId: invoiceResult.id,
          invoiceNumber: invoiceResult.invoiceNumber,
          dueDate: invoiceRequest.dueDate,
          amount: remainingAmount,
          publishError: 'Failed to send invoice to customer'
        };
      }
    } else {
      console.error('Invoice creation failed: No invoice object in response');
      return {
        success: false,
        error: 'Invoice creation failed'
      };
    }
  } catch (error) {
    console.error('Invoice creation error:', error);
    
    // Extract useful error information
    let errorMessage = 'Invoice creation failed';
    
    if (error.result && error.result.errors) {
      const squareError = error.result.errors[0];
      errorMessage = squareError.detail || squareError.code || errorMessage;
    }
    
    return {
      success: false,
      error: errorMessage
    };
  }
}

// Get payment details from Square
async function getPaymentDetails(paymentId) {
  try {
    const response = await paymentsApi.getPayment(paymentId);
    return response.result.payment;
  } catch (error) {
    console.error('Error getting payment details:', error);
    return null;
  }
}

// Refund payment (used for cancellations)
async function refundPayment(paymentId, refundAmount) {
  try {
    const idempotencyKey = randomUUID();
    
    const refund = {
      amountMoney: {
        amount: refundAmount,
        currency: 'USD'
      },
      paymentId,
      idempotencyKey,
      reason: 'Customer cancellation'
    };

    console.log('Processing refund:', {
      paymentId,
      amount: refundAmount
    });

    const response = await paymentsApi.refundPayment(refund);
    
    if (response.result.refund) {
      const refundResult = response.result.refund;
      
      console.log('Refund successful:', {
        refundId: refundResult.id,
        status: refundResult.status,
        amount: refundResult.amountMoney.amount
      });

      return {
        success: true,
        refundId: refundResult.id,
        amount: refundAmount,
        status: refundResult.status
      };
    } else {
      console.error('Refund failed: No refund object in response');
      return {
        success: false,
        error: 'Refund processing failed'
      };
    }
  } catch (error) {
    console.error('Refund error:', error);
    
    // Extract useful error information
    let errorMessage = 'Refund processing failed';
    
    if (error.result && error.result.errors) {
      const squareError = error.result.errors[0];
      errorMessage = squareError.detail || squareError.code || errorMessage;
    }
    
    return {
      success: false,
      error: errorMessage
    };
  }
}

module.exports = {
  processDownPayment,
  processFullPayment,
  createRemainingPaymentInvoice,
  calculateDownPayment,
  calculateRemainingPayment,
  getPaymentDetails,
  refundPayment
};