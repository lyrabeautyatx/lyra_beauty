// Minimal payment services for development
// TODO: Implement full Square payment integration

async function processDownPayment(paymentData) {
  console.log('Processing down payment:', paymentData);
  // Placeholder implementation
  return { success: true, paymentId: 'test_payment_' + Date.now() };
}

async function processFullPayment(paymentData) {
  console.log('Processing full payment:', paymentData);
  // Placeholder implementation
  return { success: true, paymentId: 'test_payment_' + Date.now() };
}

async function createRemainingPaymentInvoice(appointmentData) {
  console.log('Creating remaining payment invoice:', appointmentData);
  // Placeholder implementation
  return { success: true, invoiceId: 'test_invoice_' + Date.now() };
}

function calculateDownPayment(totalAmount) {
  // 20% down payment
  return Math.round(totalAmount * 0.2);
}

function calculateRemainingPayment(totalAmount) {
  // 80% remaining payment
  return Math.round(totalAmount * 0.8);
}

module.exports = {
  processDownPayment,
  processFullPayment,
  createRemainingPaymentInvoice,
  calculateDownPayment,
  calculateRemainingPayment
};