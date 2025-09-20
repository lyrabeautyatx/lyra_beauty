// Placeholder payment service functions
function processDownPayment(amount, token) {
  // Mock implementation - would integrate with Square API
  return Promise.resolve({ success: true, paymentId: `mock_${Date.now()}` });
}

function processFullPayment(amount, token) {
  // Mock implementation - would integrate with Square API
  return Promise.resolve({ success: true, paymentId: `mock_${Date.now()}` });
}

function createRemainingPaymentInvoice(appointmentId, amount) {
  // Mock implementation - would create Square invoice
  return Promise.resolve({ invoiceId: `inv_${Date.now()}`, invoiceUrl: '#' });
}

function calculateDownPayment(totalAmount) {
  return Math.round(totalAmount * 0.2); // 20% down payment
}

function calculateRemainingPayment(totalAmount) {
  return totalAmount - calculateDownPayment(totalAmount);
}

// Service pricing (in cents for Square)
async function getServicePricing() {
  return {
    'microblading': { name: 'Microblading', price: 35000 }, // $350.00
    'microshading': { name: 'Microshading', price: 30000 }, // $300.00
    'lipglow': { name: 'Lip Glow', price: 20000 }, // $200.00
    'browmapping': { name: 'Brow Mapping', price: 15000 }  // $150.00
  };
}

module.exports = {
  processDownPayment,
  processFullPayment,
  createRemainingPaymentInvoice,
  calculateDownPayment,
  calculateRemainingPayment,
  getServicePricing
};