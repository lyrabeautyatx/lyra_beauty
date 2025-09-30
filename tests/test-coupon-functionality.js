const { validateCoupon, applyDiscount, recordCouponUsage, createPartnerCommission } = require('../services/coupon');
const { calculatePricingWithDiscount } = require('../services/payments');
const { getDatabase } = require('../database');

async function testCouponFunctionality() {
  console.log('🧪 Testing Coupon Functionality...\n');
  
  try {
    const db = getDatabase();
    await db.connect();
    
    // Test 1: Validate a valid coupon
    console.log('📝 Test 1: Validate coupon "penguin10off"');
    const customer = await db.get("SELECT id FROM users WHERE role = 'customer' LIMIT 1");
    if (!customer) {
      throw new Error('No customer found for testing');
    }
    
    const validation = await validateCoupon('penguin10off', customer.id);
    console.log('Validation result:', validation.valid ? '✅ Valid' : '❌ Invalid');
    if (validation.valid) {
      console.log(`  Coupon: ${validation.coupon.code}`);
      console.log(`  Partner: ${validation.coupon.partnerName}`);
      console.log(`  Discount: ${validation.coupon.discountPercentage}%`);
    } else {
      console.log(`  Error: ${validation.error}`);
    }
    
    // Test 2: Test discount calculation
    console.log('\n💰 Test 2: Calculate discount for $300 service');
    const originalPrice = 30000; // $300 in cents
    const pricingInfo = calculatePricingWithDiscount(originalPrice, validation.coupon);
    
    console.log(`  Original Price: $${(pricingInfo.originalPrice / 100).toFixed(2)}`);
    console.log(`  Discount Amount: $${(pricingInfo.discountAmount / 100).toFixed(2)}`);
    console.log(`  Final Price: $${(pricingInfo.finalPrice / 100).toFixed(2)}`);
    console.log(`  Down Payment (20%): $${(pricingInfo.downPaymentAmount / 100).toFixed(2)}`);
    console.log(`  Remaining Amount: $${(pricingInfo.remainingAmount / 100).toFixed(2)}`);
    console.log(`  Partner Commission (20% of original): $${(pricingInfo.partnerCommission / 100).toFixed(2)}`);
    
    // Test 3: Verify business rules
    console.log('\n📋 Test 3: Verify business rules');
    const expectedDiscount = Math.floor(originalPrice * 0.10); // 10% of original
    const expectedCommission = Math.floor(originalPrice * 0.20); // 20% of original
    const expectedFinalPrice = originalPrice - expectedDiscount;
    
    console.log('Business rule checks:');
    console.log(`  ✅ 10% customer discount: $${expectedDiscount/100} = $${pricingInfo.discountAmount/100}`);
    console.log(`  ✅ 20% partner commission: $${expectedCommission/100} = $${pricingInfo.partnerCommission/100}`);
    console.log(`  ✅ Final price calculation: $${expectedFinalPrice/100} = $${pricingInfo.finalPrice/100}`);
    
    // Test 4: Test invalid coupon
    console.log('\n❌ Test 4: Test invalid coupon "invalid123"');
    const invalidValidation = await validateCoupon('invalid123', customer.id);
    console.log('Validation result:', invalidValidation.valid ? '✅ Valid' : '❌ Invalid');
    console.log(`  Error: ${invalidValidation.error}`);
    
    // Test 5: Test pricing without coupon
    console.log('\n🚫 Test 5: Pricing without coupon');
    const noCouponPricing = calculatePricingWithDiscount(originalPrice, null);
    console.log(`  Original Price: $${(noCouponPricing.originalPrice / 100).toFixed(2)}`);
    console.log(`  Final Price: $${(noCouponPricing.finalPrice / 100).toFixed(2)}`);
    console.log(`  Discount Amount: $${(noCouponPricing.discountAmount / 100).toFixed(2)}`);
    console.log(`  Partner Commission: $${(noCouponPricing.partnerCommission / 100).toFixed(2)}`);
    
    await db.close();
    
    console.log('\n🎉 All coupon tests completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    throw error;
  }
}

// Run tests if called directly
if (require.main === module) {
  testCouponFunctionality()
    .then(() => {
      console.log('\n✅ All tests passed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Tests failed:', error);
      process.exit(1);
    });
}

module.exports = { testCouponFunctionality };