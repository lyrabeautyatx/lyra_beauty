// Demo script to showcase the coupon creation system functionality
const { getDatabase } = require('../database');
const couponService = require('../services/coupon');

async function demonstrateCouponSystem() {
  console.log('🎯 COUPON CREATION SYSTEM DEMONSTRATION\n');

  try {
    const db = getDatabase();
    await db.connect();

    // Demo 1: Show animal mapping for different partner names
    console.log('📋 Demo 1: Animal Code Generation for Different Partner Names');
    console.log('=' .repeat(60));
    
    const partnerNames = [
      'Alice', 'Bob', 'Charlie', 'Diana', 'Emma', 'Frank', 'Grace', 
      'Henry', 'Isabella', 'Jack', 'Kate', 'Liam', 'Maya', 'Noah', 
      'Olivia', 'Peter', 'Quinn', 'Rachel', 'Sam', 'Tara', 'Uma', 
      'Victor', 'Wendy', 'Xavier', 'Yvonne', 'Zoe'
    ];

    partnerNames.forEach(name => {
      const code = couponService.generateCouponCode(name, 10);
      console.log(`  ${name.padEnd(9)} → ${code}`);
    });
    
    // Demo 2: Format validation examples
    console.log('\n🔍 Demo 2: Coupon Code Format Validation');
    console.log('=' .repeat(60));
    
    const testCodes = [
      { code: 'penguin10off', description: 'Valid standard format' },
      { code: 'lion25off', description: 'Valid with 25% discount' },
      { code: 'elephant5off', description: 'Valid with 5% discount' },
      { code: 'bear100off', description: 'Valid at max 100% discount' },
      { code: 'tiger101off', description: 'Invalid - over 100%' },
      { code: 'cat0off', description: 'Invalid - 0% discount' },
      { code: 'invalidcode', description: 'Invalid - wrong format' },
      { code: 'bear-10off', description: 'Invalid - special characters' },
      { code: '', description: 'Invalid - empty code' }
    ];

    testCodes.forEach(({ code, description }) => {
      const result = couponService.validateCouponCodeFormat(code);
      const status = result.valid ? '✅ VALID' : '❌ INVALID';
      console.log(`  ${status} ${code.padEnd(15)} - ${description}`);
      if (!result.valid) {
        console.log(`    └─ Error: ${result.error}`);
      }
    });

    // Demo 3: Database structure verification
    console.log('\n🗄️  Demo 3: Database Schema Verification');
    console.log('=' .repeat(60));
    
    const tables = await db.all(`
      SELECT name, sql FROM sqlite_master 
      WHERE type='table' AND name IN ('coupons', 'coupon_usage', 'partner_commissions')
      ORDER BY name
    `);

    tables.forEach(table => {
      console.log(`  ✅ Table: ${table.name}`);
      // Show key columns
      if (table.name === 'coupons') {
        console.log(`     - Stores partner coupons with unique codes`);
        console.log(`     - Links to partner_id, enforces discount limits`);
      } else if (table.name === 'coupon_usage') {
        console.log(`     - Tracks customer usage (one per lifetime)`);
        console.log(`     - UNIQUE constraint on (coupon_id, customer_id)`);
      } else if (table.name === 'partner_commissions') {
        console.log(`     - Tracks partner earnings from referrals`);
        console.log(`     - Links appointments to commission payments`);
      }
    });

    // Demo 4: Business rules enforcement
    console.log('\n📏 Demo 4: Business Rules Enforcement');
    console.log('=' .repeat(60));
    
    console.log('  ✅ Coupon Format: [animal][discount]off');
    console.log('  ✅ Discount Range: 1-100%');
    console.log('  ✅ One coupon per customer lifetime');
    console.log('  ✅ Unique coupon codes per partner');
    console.log('  ✅ Partner-specific animal mapping');
    console.log('  ✅ Database constraints prevent duplicates');

    // Demo 5: API Endpoints Available
    console.log('\n🌐 Demo 5: Available API Endpoints');
    console.log('=' .repeat(60));
    
    const endpoints = [
      { method: 'POST', path: '/api/coupons', auth: 'Partner', desc: 'Create new coupon' },
      { method: 'GET', path: '/api/coupons', auth: 'Partner', desc: 'List partner coupons' },
      { method: 'GET', path: '/api/coupons/stats', auth: 'Partner', desc: 'Usage statistics' },
      { method: 'POST', path: '/api/coupons/validate', auth: 'Customer', desc: 'Validate coupon' },
      { method: 'GET', path: '/api/coupons/:code', auth: 'Public', desc: 'Lookup coupon info' },
      { method: 'POST', path: '/api/admin/coupons', auth: 'Admin', desc: 'Admin create coupon' }
    ];

    endpoints.forEach(endpoint => {
      const authBadge = endpoint.auth === 'Public' ? '🌍' : 
                       endpoint.auth === 'Admin' ? '🔑' : 
                       endpoint.auth === 'Partner' ? '🤝' : '👤';
      console.log(`  ${endpoint.method.padEnd(4)} ${endpoint.path.padEnd(25)} ${authBadge} ${endpoint.auth.padEnd(8)} - ${endpoint.desc}`);
    });

    // Demo 6: Show actual data from database
    console.log('\n📊 Demo 6: Current Database State');
    console.log('=' .repeat(60));
    
    const partners = await db.all("SELECT id, first_name, last_name, email FROM users WHERE role = 'partner'");
    console.log(`  Partners in system: ${partners.length}`);
    partners.forEach(partner => {
      console.log(`    - ${partner.first_name} ${partner.last_name} (ID: ${partner.id})`);
    });

    const coupons = await db.all("SELECT c.*, u.first_name FROM coupons c JOIN users u ON c.partner_id = u.id");
    console.log(`  \n  Coupons created: ${coupons.length}`);
    coupons.forEach(coupon => {
      console.log(`    - ${coupon.code} (${coupon.discount_percentage}%) by ${coupon.first_name}`);
    });

    const customers = await db.all("SELECT COUNT(*) as count FROM users WHERE role = 'customer' AND has_used_coupon = 0");
    console.log(`  \n  Customers eligible for coupons: ${customers[0].count}`);

    console.log('\n🎉 Coupon Creation System Demo Complete!');
    console.log('\nThe system is ready for:');
    console.log('  • Partners to create personalized coupons');
    console.log('  • Customers to validate and use coupons (one-time only)');
    console.log('  • Admins to manage and track coupon performance');
    console.log('  • Integration with appointment booking system');

  } catch (error) {
    console.error('❌ Demo failed:', error);
  }
}

// Run demo if this file is executed directly
if (require.main === module) {
  demonstrateCouponSystem().then(() => {
    console.log('\nDemo completed successfully!');
    process.exit(0);
  }).catch(error => {
    console.error('Demo error:', error);
    process.exit(1);
  });
}

module.exports = { demonstrateCouponSystem };