const { SquareClient, SquareEnvironment } = require('square');
const { randomUUID } = require('crypto');
const { getDatabase } = require('../database');

// Initialize Square client with defensive checks and thorough logging
let squareClient, paymentsApi, invoicesApi;
console.log('[Square] ENVIRONMENT:', process.env.SQUARE_ENVIRONMENT);
console.log('[Square] ACCESS_TOKEN present:', !!process.env.SQUARE_ACCESS_TOKEN);
console.log('[Square] LOCATION_ID:', process.env.SQUARE_LOCATION_ID);
if (!process.env.SQUARE_ACCESS_TOKEN || !process.env.SQUARE_ENVIRONMENT || !process.env.SQUARE_LOCATION_ID) {
  console.error('[Square] Missing required environment variables: SQUARE_ACCESS_TOKEN, SQUARE_ENVIRONMENT, or SQUARE_LOCATION_ID.');
} else {
  try {
    squareClient = new SquareClient({
      token: process.env.SQUARE_ACCESS_TOKEN,
      environment: process.env.SQUARE_ENVIRONMENT === 'production'
        ? SquareEnvironment.Production
        : SquareEnvironment.Sandbox,
    });
    paymentsApi = squareClient.payments; // v43+ SDK uses .payments
    invoicesApi = squareClient.invoices; // v43+ SDK uses .invoices
    if (!paymentsApi) {
      console.error('[Square] paymentsApi is undefined after client initialization.');
    } else {
      console.log('[Square] paymentsApi initialized successfully.');
    }
  } catch (err) {
    console.error('[Square] Failed to initialize SquareClient:', err);
  }
}

// Calculate down payment (20% of total)
function calculateDownPayment(totalAmount) {
  return Math.floor(totalAmount * 0.20);
}

// Calculate remaining payment (80% of total)
function calculateRemainingPayment(totalAmount) {
  const downPayment = calculateDownPayment(totalAmount);
  return totalAmount - downPayment;
}

// Calculate pricing with optional coupon discount
function calculatePricingWithDiscount(originalPrice, couponDiscount = null) {
  let finalPrice = originalPrice;
  let discountAmount = 0;
  let partnerCommission = 0;
  
  if (couponDiscount) {
    discountAmount = Math.floor(originalPrice * (couponDiscount.discountPercentage / 100));
    finalPrice = originalPrice - discountAmount;
    partnerCommission = Math.floor(originalPrice * 0.20); // 20% of original price
  }
  
  const downPaymentAmount = calculateDownPayment(finalPrice);
  const remainingAmount = calculateRemainingPayment(finalPrice);
  
  return {
    originalPrice,
    finalPrice,
    discountAmount,
    partnerCommission,
    downPaymentAmount,
    remainingAmount,
    couponDiscount
  };
}

// Process down payment (20% of service cost)
async function processDownPayment(booking, sourceId, totalAmount) {
  const downPaymentAmount = calculateDownPayment(totalAmount);
  const remainingAmount = calculateRemainingPayment(totalAmount);
  console.log('[Square] Starting down payment process:', {
    booking,
    sourceId,
    totalAmount,
    downPaymentAmount,
    remainingAmount
  });
  const idempotencyKey = randomUUID();
  const payment = {
    sourceId,
    idempotencyKey,
    amountMoney: {
      amount: BigInt(downPaymentAmount),
      currency: 'USD'
    },
    locationId: process.env.SQUARE_LOCATION_ID,
    note: `Down payment for ${booking.serviceInfo.name} appointment on ${booking.date} at ${booking.time}`,
    referenceId: `down_${booking.date}_${booking.time}`.replace(/[^a-zA-Z0-9]/g, '_')
  };
  console.log('[Square] Requesting createPayment:', payment);
  if (!paymentsApi) {
    console.error('[Square] paymentsApi is undefined at payment time!');
    throw new Error('Square paymentsApi is not initialized');
  }
  try {
    const response = await paymentsApi.create(payment);
    console.log('[Square] createPayment response:', response);
    if (response.payment) {
      const paymentResult = response.payment;
      console.log('[Square] Down payment successful:', {
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
      console.error('[Square] Down payment failed: No payment object in response', response);
      return {
        success: false,
        error: 'Payment processing failed'
      };
    }
  } catch (error) {
    console.error('[Square] Down payment error:', error);
    // SquareError handling
    let errorMessage = 'Payment processing failed';
    let errorCode = 'UNKNOWN_ERROR';
    if (error.statusCode && error.body) {
      errorMessage = error.body.message || errorMessage;
      errorCode = error.statusCode;
      console.error('[Square] Error details:', error.body);
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
  const idempotencyKey = randomUUID();
  const payment = {
    sourceId,
    idempotencyKey,
    amountMoney: {
      amount: BigInt(totalAmount),
      currency: 'USD'
    },
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

  try {
    const response = await paymentsApi.create(payment);
    if (response.payment) {
      const paymentResult = response.payment;
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
      console.error('Full payment failed: No payment object in response', response);
      return {
        success: false,
        error: 'Payment processing failed'
      };
    }
  } catch (error) {
    console.error('Full payment error:', error);
    // SquareError handling
    let errorMessage = 'Payment processing failed';
    let errorCode = 'UNKNOWN_ERROR';
    if (error.statusCode && error.body) {
      errorMessage = error.body.message || errorMessage;
      errorCode = error.statusCode;
      console.error('Full payment error details:', error.body);
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
  calculatePricingWithDiscount,
  getPaymentDetails,
  refundPayment
};