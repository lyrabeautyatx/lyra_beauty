const { getDatabase } = require('../database');

async function createTestCoupons() {
  const db = getDatabase();
  
  try {
    await db.connect();
    console.log('Creating test coupons...');
    
    // First, create a test partner user if one doesn't exist
    const partner = await db.get("SELECT id FROM users WHERE role = 'partner' LIMIT 1");
    let partnerId;
    
    if (!partner) {
      console.log('Creating test partner user...');
      const result = await db.run(`
        INSERT INTO users (username, password, role, first_name, last_name, email, partner_status) 
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `, ['partner1', 'pass123', 'partner', 'Sarah', 'Johnson', 'sarah@example.com', 'approved']);
      partnerId = result.lastID;
    } else {
      partnerId = partner.id;
    }
    
    // Create test coupons based on partner's first name
    const partnerInfo = await db.get("SELECT first_name FROM users WHERE id = ?", [partnerId]);
    
    if (!partnerInfo) {
      throw new Error('Partner not found');
    }
    
    // Generate animal-based coupon codes (as per business rules)
    const animals = ['penguin', 'dolphin', 'butterfly', 'elephant'];
    const couponCodes = animals.map(animal => `${animal}10off`);
    
    // Insert coupons
    for (const code of couponCodes) {
      try {
        await db.run(`
          INSERT INTO coupons (partner_id, code, discount_percentage, active) 
          VALUES (?, ?, ?, ?)
        `, [partnerId, code, 10.00, 1]);
        console.log(`✅ Created coupon: ${code}`);
      } catch (error) {
        if (error.message.includes('UNIQUE constraint failed')) {
          console.log(`⚠️ Coupon ${code} already exists`);
        } else {
          throw error;
        }
      }
    }
    
    // Display created coupons
    const coupons = await db.all(`
      SELECT c.*, u.first_name as partner_name 
      FROM coupons c 
      JOIN users u ON c.partner_id = u.id 
      WHERE c.active = 1
    `);
    
    console.log('\n📋 Active Coupons:');
    coupons.forEach(coupon => {
      console.log(`  ${coupon.code} - ${coupon.discount_percentage}% off (Partner: ${coupon.partner_name})`);
    });
    
    await db.close();
    
  } catch (error) {
    console.error('❌ Error creating test coupons:', error);
    throw error;
  }
}

// Run if called directly
if (require.main === module) {
  createTestCoupons()
    .then(() => {
      console.log('\n🎉 Test coupons created successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Failed to create test coupons:', error);
      process.exit(1);
    });
}

module.exports = { createTestCoupons };