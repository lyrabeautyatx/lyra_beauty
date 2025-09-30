#!/usr/bin/env node

/**
 * Schema Update for Commission System
 * Adds missing columns to appointments table
 */

const { getDatabase } = require('../database');

async function updateSchema() {
  console.log('🔄 Updating database schema for commission system...');
  
  const db = getDatabase();
  await db.connect();
  
  try {
    console.log('📋 Adding missing columns to appointments table...');
    
    // Add coupon_id column
    try {
      await db.run('ALTER TABLE appointments ADD COLUMN coupon_id INTEGER REFERENCES coupons(id)');
      console.log('  ✓ Added coupon_id column');
    } catch (error) {
      if (error.message.includes('duplicate column name')) {
        console.log('  ✓ coupon_id column already exists');
      } else {
        throw error;
      }
    }
    
    // Add final_price column
    try {
      await db.run('ALTER TABLE appointments ADD COLUMN final_price INTEGER');
      console.log('  ✓ Added final_price column');
    } catch (error) {
      if (error.message.includes('duplicate column name')) {
        console.log('  ✓ final_price column already exists');
      } else {
        throw error;
      }
    }
    
    // Add down_payment_amount column
    try {
      await db.run('ALTER TABLE appointments ADD COLUMN down_payment_amount INTEGER');
      console.log('  ✓ Added down_payment_amount column');
    } catch (error) {
      if (error.message.includes('duplicate column name')) {
        console.log('  ✓ down_payment_amount column already exists');
      } else {
        throw error;
      }
    }
    
    // Verify the schema updates
    console.log('\n🔍 Verifying schema updates...');
    const tableInfo = await new Promise((resolve, reject) => {
      db.db.all("PRAGMA table_info(appointments)", (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
    
    const columns = tableInfo.map(col => col.name);
    console.log('  Current columns:', columns.join(', '));
    
    const requiredColumns = ['coupon_id', 'final_price', 'down_payment_amount'];
    const missingColumns = requiredColumns.filter(col => !columns.includes(col));
    
    if (missingColumns.length === 0) {
      console.log('  ✅ All required columns present');
    } else {
      throw new Error(`Missing columns: ${missingColumns.join(', ')}`);
    }
    
    console.log('\n✅ Schema update completed successfully!');
    
  } catch (error) {
    console.error('❌ Schema update failed:', error);
    throw error;
  }
}

// Run update if called directly
if (require.main === module) {
  updateSchema()
    .then(() => {
      console.log('\n🎉 Schema update completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Schema update failed:', error);
      process.exit(1);
    });
}

module.exports = { updateSchema };