#!/usr/bin/env node

/**
 * Commission System Test
 * Validates commission calculation, creation, and tracking functionality
 */

const { getDatabase } = require('../database');
const { 
  calculateCommission, 
  createCommission, 
  getCommission,
  getPartnerCommissions,
  updateCommissionStatus,
  getPartnerEarnings,
  processAppointmentCommission
} = require('../services/commission');

async function runCommissionTests() {
  console.log('🧪 Starting Commission System Tests...\n');
  
  const db = getDatabase();
  await db.connect();
  
  try {
    // Test 1: Commission Calculation
    console.log('1️⃣  Testing Commission Calculation...');
    testCommissionCalculation();
    
    // Test 2: Create Test Data
    console.log('\n2️⃣  Creating Test Data...');
    const { partnerId, appointmentId, servicePrice } = await createTestData();
    
    // Test 3: Commission Creation
    console.log('\n3️⃣  Testing Commission Creation...');
    const commission = await testCommissionCreation(partnerId, appointmentId, servicePrice);
    
    // Test 4: Commission Retrieval
    console.log('\n4️⃣  Testing Commission Retrieval...');
    await testCommissionRetrieval(commission.id, partnerId);
    
    // Test 5: Commission Status Update
    console.log('\n5️⃣  Testing Commission Status Update...');
    await testCommissionStatusUpdate(commission.id);
    
    // Test 6: Partner Earnings Summary
    console.log('\n6️⃣  Testing Partner Earnings Summary...');
    await testPartnerEarnings(partnerId);
    
    // Test 7: Appointment Commission Processing
    console.log('\n7️⃣  Testing Appointment Commission Processing...');
    await testAppointmentCommissionProcessing(appointmentId, servicePrice);
    
    console.log('\n✅ All Commission System Tests Passed!');
    
  } catch (error) {
    console.error('\n❌ Commission System Tests Failed:', error);
    throw error;
  }
}

function testCommissionCalculation() {
  // Test standard commission calculations
  const tests = [
    { price: 35000, expected: 7000 }, // $350 -> $70 commission
    { price: 30000, expected: 6000 }, // $300 -> $60 commission  
    { price: 20000, expected: 4000 }, // $200 -> $40 commission
    { price: 15000, expected: 3000 }, // $150 -> $30 commission
  ];
  
  tests.forEach(test => {
    const result = calculateCommission(test.price);
    console.log(`  Price: $${(test.price/100).toFixed(2)} -> Commission: $${(result/100).toFixed(2)}`);
    
    if (result !== test.expected) {
      throw new Error(`Commission calculation failed: expected ${test.expected}, got ${result}`);
    }
  });
  
  console.log('  ✓ Commission calculation working correctly (20% of original price)');
}

async function createTestData() {
  const db = getDatabase();
  
  // Create test partner or get existing one
  let partnerId;
  try {
    const partnerResult = await db.run(`
      INSERT INTO users (
        first_name, last_name, email, role, created_at
      ) VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
    `, ['Test', 'Partner', 'test.partner@test.com', 'partner']);
    partnerId = partnerResult.id;
    console.log(`  ✓ Created test partner (ID: ${partnerId})`);
  } catch (error) {
    if (error.code === 'SQLITE_CONSTRAINT') {
      const existingPartner = await db.get('SELECT id FROM users WHERE email = ?', ['test.partner@test.com']);
      partnerId = existingPartner.id;
      console.log(`  ✓ Using existing test partner (ID: ${partnerId})`);
    } else {
      throw error;
    }
  }
  
  // Create test customer or get existing one
  let customerId;
  try {
    const customerResult = await db.run(`
      INSERT INTO users (
        first_name, last_name, email, role, created_at
      ) VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
    `, ['Test', 'Customer', 'test.customer@test.com', 'customer']);
    customerId = customerResult.id;
    console.log(`  ✓ Created test customer (ID: ${customerId})`);
  } catch (error) {
    if (error.code === 'SQLITE_CONSTRAINT') {
      const existingCustomer = await db.get('SELECT id FROM users WHERE email = ?', ['test.customer@test.com']);
      customerId = existingCustomer.id;
      console.log(`  ✓ Using existing test customer (ID: ${customerId})`);
    } else {
      throw error;
    }
  }
  
  // Get a service (microblading)
  const service = await db.get('SELECT * FROM services WHERE service_key = ?', ['microblading']);
  const servicePrice = Math.floor(service.price * 100); // Convert to cents
  console.log(`  ✓ Using service: ${service.name} - $${service.price}`);
  
  // Create test coupon or get existing one
  let couponId;
  try {
    const couponResult = await db.run(`
      INSERT INTO coupons (
        partner_id, code, discount_percentage, active, created_at
      ) VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
    `, [partnerId, 'TESTCOUPON10', 10, 1]);
    couponId = couponResult.id;
    console.log(`  ✓ Created test coupon (ID: ${couponId})`);
  } catch (error) {
    if (error.code === 'SQLITE_CONSTRAINT') {
      const existingCoupon = await db.get('SELECT id FROM coupons WHERE code = ?', ['TESTCOUPON10']);
      couponId = existingCoupon.id;
      console.log(`  ✓ Using existing test coupon (ID: ${couponId})`);
    } else {
      throw error;
    }
  }
  
  // Create test appointment - use timestamp to ensure uniqueness
  const timestamp = Date.now();
  const appointmentResult = await db.run(`
    INSERT INTO appointments (
      user_id, service_id, coupon_id, date, time, status, 
      final_price, down_payment_amount, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
  `, [
    customerId, 
    service.id, 
    couponId,
    '2025-01-15', 
    `10:${timestamp % 60}`, // Unique time
    'confirmed',
    servicePrice * 0.9, // 10% discount applied
    Math.floor(servicePrice * 0.9 * 0.2) // 20% down payment of discounted price
  ]);
  
  const appointmentId = appointmentResult.id;
  console.log(`  ✓ Created test appointment (ID: ${appointmentId})`);
  
  return { partnerId, customerId, appointmentId, servicePrice, couponId };
}

async function testCommissionCreation(partnerId, appointmentId, originalPrice) {
  const commission = await createCommission({
    partnerId,
    appointmentId,
    originalPrice
  });
  
  console.log(`  ✓ Commission created: ID ${commission.id}`);
  console.log(`  ✓ Commission amount: $${(commission.commissionAmount / 100).toFixed(2)}`);
  console.log(`  ✓ Original price: $${(commission.originalPrice / 100).toFixed(2)}`);
  console.log(`  ✓ Status: ${commission.status}`);
  
  // Verify commission amount is 20% of original price
  const expectedAmount = Math.floor(originalPrice * 0.20);
  if (commission.commissionAmount !== expectedAmount) {
    throw new Error(`Commission amount incorrect: expected ${expectedAmount}, got ${commission.commissionAmount}`);
  }
  
  return commission;
}

async function testCommissionRetrieval(commissionId, partnerId) {
  // Test individual commission retrieval
  const commission = await getCommission(commissionId);
  console.log(`  ✓ Retrieved commission: ${commission.partner_email}`);
  console.log(`  ✓ Service: ${commission.service_name}`);
  console.log(`  ✓ Amount: $${commission.commission_amount_dollars}`);
  
  // Test partner commission list
  const partnerCommissions = await getPartnerCommissions(partnerId);
  console.log(`  ✓ Partner has ${partnerCommissions.length} commission(s)`);
  
  if (partnerCommissions.length === 0) {
    throw new Error('Partner should have at least one commission');
  }
}

async function testCommissionStatusUpdate(commissionId) {
  // Update status to paid
  await updateCommissionStatus(commissionId, 'paid');
  console.log(`  ✓ Commission status updated to 'paid'`);
  
  // Verify update
  const commission = await getCommission(commissionId);
  if (commission.status !== 'paid') {
    throw new Error(`Status update failed: expected 'paid', got '${commission.status}'`);
  }
  
  // Test invalid status
  try {
    await updateCommissionStatus(commissionId, 'invalid');
    throw new Error('Should have thrown error for invalid status');
  } catch (error) {
    if (error.message.includes('Invalid status')) {
      console.log(`  ✓ Invalid status properly rejected`);
    } else {
      throw error;
    }
  }
}

async function testPartnerEarnings(partnerId) {
  const earnings = await getPartnerEarnings(partnerId);
  
  console.log(`  ✓ Total commissions: ${earnings.total_count}`);
  console.log(`  ✓ Pending: ${earnings.pending_count} ($${earnings.pending_amount_dollars})`);
  console.log(`  ✓ Paid: ${earnings.paid_count} ($${earnings.paid_amount_dollars})`);
  console.log(`  ✓ Total earnings: $${earnings.total_amount_dollars}`);
  
  if (earnings.total_count === 0) {
    throw new Error('Partner should have earnings');
  }
}

async function testAppointmentCommissionProcessing(appointmentId, originalPrice) {
  const db = getDatabase();
  
  // Get the coupon ID from the appointment
  const appointment = await db.get(
    'SELECT coupon_id FROM appointments WHERE id = ?',
    [appointmentId]
  );
  
  if (!appointment.coupon_id) {
    console.log('  ⚠️  Appointment has no coupon, skipping commission processing test');
    return;
  }
  
  // Test processing commission for appointment
  try {
    const commission = await processAppointmentCommission({
      appointmentId,
      couponId: appointment.coupon_id,
      originalPrice
    });
    
    console.log(`  ✓ Appointment commission processed: $${(commission.commissionAmount / 100).toFixed(2)}`);
  } catch (error) {
    if (error.message.includes('Commission already exists')) {
      console.log(`  ✓ Duplicate commission prevention working`);
    } else {
      throw error;
    }
  }
}

// Run tests if called directly
if (require.main === module) {
  runCommissionTests()
    .then(() => {
      console.log('\n🎉 Commission System Tests Completed Successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Commission System Tests Failed:', error);
      process.exit(1);
    });
}

module.exports = { runCommissionTests };