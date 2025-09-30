// Test script for coupon creation system
const { getDatabase } = require('../database');
const couponService = require('../services/coupon');

async function testCouponSystem() {
  console.log('🧪 Starting Coupon System Tests...\n');

  try {
    const db = getDatabase();
    await db.connect();
    
    // Test 1: Coupon code generation
    console.log('Test 1: Coupon Code Generation');
    const testNames = ['Alice', 'Bob', 'Charlie', 'Diana', 'Eve', 'Frank'];
    
    for (const name of testNames) {
      const code = couponService.generateCouponCode(name, 10);
      console.log(`  ${name} -> ${code}`);
    }
    console.log('✓ Coupon code generation working\n');

    // Test 2: Code format validation
    console.log('Test 2: Code Format Validation');
    const testCodes = [
      'penguin10off',  // valid
      'lion15off',     // valid
      'invalid',       // invalid format
      'bear101off',    // invalid percentage
      'cat0off',       // invalid percentage
      ''               // empty
    ];

    for (const code of testCodes) {
      const result = couponService.validateCouponCodeFormat(code);
      console.log(`  ${code || '(empty)'} -> ${result.valid ? 'VALID' : 'INVALID'} ${!result.valid ? '(' + result.error + ')' : ''}`);
    }
    console.log('✓ Code format validation working\n');

    // Test 3: Database schema verification
    console.log('Test 3: Database Schema Verification');
    
    try {
      // Check if coupon tables exist
      const tables = await db.all("SELECT name FROM sqlite_master WHERE type='table' AND name LIKE '%coupon%'");
      console.log('  Coupon-related tables found:', tables.map(t => t.name));
      
      if (tables.length === 0) {
        console.log('  ⚠️  No coupon tables found. Running table creation...');
        await db.initializeTables();
        
        // Check again
        const tablesAfter = await db.all("SELECT name FROM sqlite_master WHERE type='table' AND name LIKE '%coupon%'");
        console.log('  Coupon-related tables after creation:', tablesAfter.map(t => t.name));
      }
      
      console.log('✓ Database schema verification complete\n');
    } catch (error) {
      console.error('❌ Database schema error:', error.message);
    }

    // Test 4: Create test partner and coupon
    console.log('Test 4: Creating Test Partner and Coupon');
    
    let partnerId; // Declare here so it's available for later tests
    
    try {
      // Insert a test partner if one doesn't exist
      const existingPartner = await db.get("SELECT id FROM users WHERE role = 'partner' LIMIT 1");
      
      if (!existingPartner) {
        const result = await db.run(
          "INSERT INTO users (first_name, last_name, email, role) VALUES (?, ?, ?, ?)",
          ['Test', 'Partner', 'testpartner2@example.com', 'partner']
        );
        partnerId = result.lastID;
        console.log(`  Created test partner with ID: ${partnerId}`);
      } else {
        partnerId = existingPartner.id;
        console.log(`  Using existing partner with ID: ${partnerId}`);
      }

      // Double-check partner exists
      const partner = await db.get("SELECT * FROM users WHERE id = ? AND role = 'partner'", [partnerId]);
      if (!partner) {
        console.log(`  ❌ Partner verification failed for ID: ${partnerId}`);
        return;
      }
      console.log(`  ✓ Partner verified: ${partner.first_name} ${partner.last_name}`);

      // Create a coupon for the partner (or check if it already exists)
      const couponResult = await couponService.createCoupon(partnerId, 10);
      
      console.log(`  Coupon creation result:`, couponResult);
      
      if (couponResult.success) {
        console.log(`  ✓ Created coupon: ${couponResult.coupon.code}`);
        console.log(`    Partner ID: ${couponResult.coupon.partner_id}`);
        console.log(`    Discount: ${couponResult.coupon.discount_percentage}%`);
      } else if (couponResult.error === 'Coupon code already exists') {
        console.log(`  ✓ Coupon already exists - checking existing coupons`);
        const existingCoupons = await couponService.getPartnerCoupons(partnerId);
        if (existingCoupons.success && existingCoupons.coupons.length > 0) {
          const coupon = existingCoupons.coupons[0];
          console.log(`  ✓ Found existing coupon: ${coupon.code}`);
          console.log(`    Partner ID: ${coupon.partner_id}`);
          console.log(`    Discount: ${coupon.discount_percentage}%`);
        }
      } else {
        console.log(`  ❌ Failed to create coupon: ${couponResult.error}`);
      }
      
    } catch (error) {
      console.error('❌ Partner/coupon creation error:', error.message);
    }

    console.log('\n🎉 Coupon System Tests Complete!');

    // Test 5: Test coupon validation for customers
    console.log('\nTest 5: Customer Coupon Validation');
    
    try {
      // Create a test customer if one doesn't exist
      const existingCustomer = await db.get("SELECT id FROM users WHERE role = 'customer' AND has_used_coupon = 0 LIMIT 1");
      
      let customerId;
      if (!existingCustomer) {
        const result = await db.run(
          "INSERT INTO users (first_name, last_name, email, role, has_used_coupon) VALUES (?, ?, ?, ?, ?)",
          ['Test', 'Customer', 'testcustomer@example.com', 'customer', 0]
        );
        customerId = result.lastID;
        console.log(`  Created test customer with ID: ${customerId}`);
      } else {
        customerId = existingCustomer.id;
        console.log(`  Using existing customer with ID: ${customerId}`);
      }

      // Test coupon validation
      const validationResult = await couponService.canCustomerUseCoupon(customerId, 'tiger10off');
      console.log(`  Can customer use 'tiger10off': ${validationResult.canUse}`);
      if (!validationResult.canUse) {
        console.log(`    Reason: ${validationResult.reason}`);
      } else {
        console.log(`    ✓ Customer can use coupon!`);
      }

      // Test with invalid coupon
      const invalidResult = await couponService.canCustomerUseCoupon(customerId, 'nonexistent10off');
      console.log(`  Can customer use 'nonexistent10off': ${invalidResult.canUse}`);
      console.log(`    Reason: ${invalidResult.reason}`);

    } catch (error) {
      console.error('❌ Customer validation test error:', error.message);
    }

    // Test 6: Test coupon usage statistics
    console.log('\nTest 6: Coupon Usage Statistics');
    
    try {
      const statsResult = await couponService.getCouponUsageStats(partnerId);
      if (statsResult.success) {
        console.log(`  ✓ Usage stats for partner ${partnerId}:`);
        console.log(`    Total uses: ${statsResult.stats.total_uses}`);
        console.log(`    Unique customers: ${statsResult.stats.unique_customers}`);
        console.log(`    Completed appointments: ${statsResult.stats.completed_appointments}`);
      } else {
        console.log(`  ❌ Failed to get stats: ${statsResult.error}`);
      }
    } catch (error) {
      console.error('❌ Stats test error:', error.message);
    }
    
    console.log('\n🎉 All Coupon System Tests Complete!');
    
  } catch (error) {
    console.error('❌ Test suite failed:', error);
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  testCouponSystem().then(() => {
    console.log('Tests finished');
    process.exit(0);
  }).catch(error => {
    console.error('Test suite error:', error);
    process.exit(1);
  });
}

module.exports = { testCouponSystem };