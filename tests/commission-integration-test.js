#!/usr/bin/env node

/**
 * Integration Test for Commission System with Appointment Booking
 * Tests the full appointment -> commission workflow
 */

const { getDatabase } = require('../database');
const { getPartnerCommissions, getPartnerEarnings } = require('../services/commission');

// Import the saveAppointment function (requires running server context)
const path = require('path');

async function testAppointmentCommissionIntegration() {
  console.log('🧪 Testing Commission Integration with Appointment Booking...\n');
  
  const db = getDatabase();
  await db.connect();
  
  try {
    // Create test data
    console.log('1️⃣  Setting up test data...');
    const { partnerId, customerId, couponId, servicePrice } = await setupTestData();
    
    // Test appointment creation with coupon (simulates saveAppointment call)
    console.log('\n2️⃣  Testing appointment creation with commission processing...');
    const appointmentId = await testAppointmentWithCommission(customerId, couponId, servicePrice);
    
    // Verify commission was created
    console.log('\n3️⃣  Verifying commission creation...');
    await verifyCommissionCreated(partnerId, appointmentId);
    
    // Test commission retrieval
    console.log('\n4️⃣  Testing commission retrieval...');
    await testCommissionRetrieval(partnerId);
    
    console.log('\n✅ Commission Integration Tests Passed!');
    
  } catch (error) {
    console.error('\n❌ Commission Integration Tests Failed:', error);
    throw error;
  }
}

async function setupTestData() {
  const db = getDatabase();
  
  console.log('  Creating integration test partner...');
  let partnerId;
  try {
    const result = await db.run(`
      INSERT INTO users (first_name, last_name, email, role) 
      VALUES (?, ?, ?, ?)
    `, ['Integration', 'Partner', 'integration.partner@test.com', 'partner']);
    partnerId = result.id;
  } catch (error) {
    if (error.code === 'SQLITE_CONSTRAINT') {
      const existing = await db.get('SELECT id FROM users WHERE email = ?', ['integration.partner@test.com']);
      partnerId = existing.id;
    } else {
      throw error;
    }
  }
  console.log(`  ✓ Partner ID: ${partnerId}`);
  
  console.log('  Creating integration test customer...');
  let customerId;
  try {
    const result = await db.run(`
      INSERT INTO users (first_name, last_name, email, role) 
      VALUES (?, ?, ?, ?)
    `, ['Integration', 'Customer', 'integration.customer@test.com', 'customer']);
    customerId = result.id;
  } catch (error) {
    if (error.code === 'SQLITE_CONSTRAINT') {
      const existing = await db.get('SELECT id FROM users WHERE email = ?', ['integration.customer@test.com']);
      customerId = existing.id;
    } else {
      throw error;
    }
  }
  console.log(`  ✓ Customer ID: ${customerId}`);
  
  console.log('  Creating integration test coupon...');
  let couponId;
  try {
    const result = await db.run(`
      INSERT INTO coupons (partner_id, code, discount_percentage, active) 
      VALUES (?, ?, ?, ?)
    `, [partnerId, 'INTEGRATION10', 10, 1]);
    couponId = result.id;
  } catch (error) {
    if (error.code === 'SQLITE_CONSTRAINT') {
      const existing = await db.get('SELECT id FROM coupons WHERE code = ?', ['INTEGRATION10']);
      couponId = existing.id;
    } else {
      throw error;
    }
  }
  console.log(`  ✓ Coupon ID: ${couponId}`);
  
  // Get service price
  const service = await db.get('SELECT price FROM services WHERE service_key = ?', ['microblading']);
  const servicePrice = service.price * 100; // Convert to cents
  console.log(`  ✓ Service price: $${(servicePrice / 100).toFixed(2)}`);
  
  return { partnerId, customerId, couponId, servicePrice };
}

async function testAppointmentWithCommission(customerId, couponId, servicePrice) {
  const db = getDatabase();
  
  // Simulate appointment creation with coupon (manual version of saveAppointment)
  console.log('  Creating appointment with coupon...');
  
  // Get service and coupon data
  const service = await db.get('SELECT * FROM services WHERE service_key = ?', ['microblading']);
  const coupon = await db.get('SELECT * FROM coupons WHERE id = ?', [couponId]);
  
  // Calculate pricing
  const originalPrice = servicePrice;
  const discountAmount = Math.floor(originalPrice * (coupon.discount_percentage / 100));
  const finalPrice = originalPrice - discountAmount;
  const downPaymentAmount = Math.floor(finalPrice * 0.2);
  
  console.log(`  ✓ Original price: $${(originalPrice / 100).toFixed(2)}`);
  console.log(`  ✓ Discount (${coupon.discount_percentage}%): $${(discountAmount / 100).toFixed(2)}`);
  console.log(`  ✓ Final price: $${(finalPrice / 100).toFixed(2)}`);
  console.log(`  ✓ Down payment: $${(downPaymentAmount / 100).toFixed(2)}`);
  
  // Create appointment
  const timestamp = Date.now();
  const result = await db.run(`
    INSERT INTO appointments (
      user_id, service_id, coupon_id, date, time, status,
      final_price, down_payment_amount
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    customerId,
    service.id,
    couponId,
    '2025-02-01',
    `11:${timestamp % 60}`, // Unique time
    'confirmed',
    finalPrice,
    downPaymentAmount
  ]);
  
  const appointmentId = result.id;
  console.log(`  ✓ Appointment created: ID ${appointmentId}`);
  
  // Process commission manually (simulating the logic in saveAppointment)
  console.log('  Processing commission...');
  const { processAppointmentCommission } = require('../services/commission');
  
  const commission = await processAppointmentCommission({
    appointmentId,
    couponId,
    originalPrice
  });
  
  console.log(`  ✓ Commission created: $${(commission.commissionAmount / 100).toFixed(2)}`);
  
  return appointmentId;
}

async function verifyCommissionCreated(partnerId, appointmentId) {
  const db = getDatabase();
  
  console.log('  Checking commission record...');
  const commission = await db.get(`
    SELECT * FROM partner_commissions 
    WHERE partner_id = ? AND appointment_id = ?
  `, [partnerId, appointmentId]);
  
  if (!commission) {
    throw new Error('Commission record not found');
  }
  
  console.log(`  ✓ Commission ID: ${commission.id}`);
  console.log(`  ✓ Amount: $${(commission.commission_amount / 100).toFixed(2)}`);
  console.log(`  ✓ Status: ${commission.status}`);
  console.log(`  ✓ Original price: $${(commission.original_price / 100).toFixed(2)}`);
  
  // Verify 20% calculation
  const expectedCommission = Math.floor(commission.original_price * 0.2);
  if (commission.commission_amount !== expectedCommission) {
    throw new Error(`Commission calculation error: expected ${expectedCommission}, got ${commission.commission_amount}`);
  }
  console.log('  ✓ Commission calculation correct (20% of original price)');
}

async function testCommissionRetrieval(partnerId) {
  console.log('  Testing commission service functions...');
  
  const commissions = await getPartnerCommissions(partnerId);
  console.log(`  ✓ Partner has ${commissions.length} commission(s)`);
  
  if (commissions.length === 0) {
    throw new Error('No commissions found for partner');
  }
  
  const earnings = await getPartnerEarnings(partnerId);
  console.log(`  ✓ Total earnings: $${earnings.total_amount_dollars}`);
  console.log(`  ✓ Pending: $${earnings.pending_amount_dollars}`);
  console.log(`  ✓ Paid: $${earnings.paid_amount_dollars}`);
}

// Run test if called directly
if (require.main === module) {
  testAppointmentCommissionIntegration()
    .then(() => {
      console.log('\n🎉 Commission Integration Tests Completed Successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Commission Integration Tests Failed:', error);
      process.exit(1);
    });
}

module.exports = { testAppointmentCommissionIntegration };