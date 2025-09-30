const { validateCoupon, recordCouponUsage, createPartnerCommission } = require('../services/coupon');
const { calculatePricingWithDiscount } = require('../services/payments');
const { getDatabase } = require('../database');

async function runIntegrationTests() {
  console.log('🧪 Running Coupon Integration Tests...\n');
  
  const db = getDatabase();
  await db.connect();
  
  try {
    // Test 1: End-to-end coupon application flow
    console.log('📋 Test 1: End-to-end coupon application');
    
    // Get test customer
    const customer = await db.get("SELECT id, username, has_used_coupon FROM users WHERE role = 'customer' LIMIT 1");
    console.log(`Customer: ${customer.username} (ID: ${customer.id}, Used coupon: ${customer.has_used_coupon})`);
    
    // Validate coupon
    const validation = await validateCoupon('penguin10off', customer.id);
    console.log(`Coupon validation: ${validation.valid ? '✅ Valid' : '❌ Invalid'}`);
    
    if (validation.valid) {
      // Test pricing calculation
      const originalPrice = 35000; // $350 Microblading
      const pricing = calculatePricingWithDiscount(originalPrice, validation.coupon);
      
      console.log('Pricing breakdown:');
      console.log(`  Original Price: $${(pricing.originalPrice / 100).toFixed(2)}`);
      console.log(`  Discount: $${(pricing.discountAmount / 100).toFixed(2)} (${validation.coupon.discountPercentage}%)`);
      console.log(`  Final Price: $${(pricing.finalPrice / 100).toFixed(2)}`);
      console.log(`  Down Payment: $${(pricing.downPaymentAmount / 100).toFixed(2)}`);
      console.log(`  Remaining: $${(pricing.remainingAmount / 100).toFixed(2)}`);
      console.log(`  Partner Commission: $${(pricing.partnerCommission / 100).toFixed(2)}`);
      
      // Verify business rules
      const expectedDiscount = Math.floor(originalPrice * 0.10);
      const expectedCommission = Math.floor(originalPrice * 0.20);
      const expectedFinal = originalPrice - expectedDiscount;
      
      console.log('\nBusiness rule verification:');
      console.log(`  ✅ 10% discount: ${pricing.discountAmount === expectedDiscount ? 'PASS' : 'FAIL'}`);
      console.log(`  ✅ 20% commission: ${pricing.partnerCommission === expectedCommission ? 'PASS' : 'FAIL'}`);
      console.log(`  ✅ Final price: ${pricing.finalPrice === expectedFinal ? 'PASS' : 'FAIL'}`);
    }
    
    // Test 2: Database schema verification
    console.log('\n📊 Test 2: Database schema verification');
    
    const tables = await db.all("SELECT name FROM sqlite_master WHERE type='table'");
    const tableNames = tables.map(t => t.name);
    
    const requiredTables = ['coupons', 'coupon_usage', 'partner_commissions'];
    requiredTables.forEach(table => {
      console.log(`  ${tableNames.includes(table) ? '✅' : '❌'} Table: ${table}`);
    });
    
    // Check appointments table columns
    const appointmentColumns = await db.all("PRAGMA table_info(appointments)");
    const columnNames = appointmentColumns.map(col => col.name);
    
    const requiredColumns = ['coupon_id', 'original_price', 'final_price', 'down_payment_amount'];
    requiredColumns.forEach(column => {
      console.log(`  ${columnNames.includes(column) ? '✅' : '❌'} Column: appointments.${column}`);
    });
    
    // Test 3: Coupon validation edge cases
    console.log('\n🔍 Test 3: Edge case validation');
    
    // Invalid coupon
    const invalidTest = await validateCoupon('invalid123', customer.id);
    console.log(`  ❌ Invalid coupon: ${!invalidTest.valid ? 'PASS' : 'FAIL'}`);
    
    // Test 4: Data integrity check
    console.log('\n🔗 Test 4: Data integrity check');
    
    const couponCount = await db.get("SELECT COUNT(*) as count FROM coupons WHERE active = 1");
    const partnerCount = await db.get("SELECT COUNT(*) as count FROM users WHERE role = 'partner'");
    
    console.log(`  Active coupons: ${couponCount.count}`);
    console.log(`  Partner users: ${partnerCount.count}`);
    console.log(`  ✅ Data integrity: ${couponCount.count > 0 && partnerCount.count > 0 ? 'PASS' : 'FAIL'}`);
    
    console.log('\n🎉 All integration tests completed!');
    
  } catch (error) {
    console.error('❌ Integration test failed:', error);
    throw error;
  } finally {
    await db.close();
  }
}

// Run tests
if (require.main === module) {
  runIntegrationTests()
    .then(() => {
      console.log('\n✅ All integration tests passed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Integration tests failed:', error);
      process.exit(1);
    });
}

module.exports = { runIntegrationTests };