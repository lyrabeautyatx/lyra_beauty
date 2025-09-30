/**
 * Database Migration: Add missing columns to appointments table
 * This script adds coupon_id, final_price, and discount_amount columns for coupon system support
 */

const { getDatabase } = require('../database');

async function migrateAppointmentsTable() {
  const db = getDatabase();
  
  try {
    await db.connect();
    console.log('🚀 Starting appointments table migration...\n');
    
    // Check current schema
    const currentSchema = await db.all("PRAGMA table_info(appointments)");
    const columnNames = currentSchema.map(col => col.name);
    
    console.log('Current appointments table columns:', columnNames);
    
    // Add coupon_id column if it doesn't exist
    if (!columnNames.includes('coupon_id')) {
      console.log('Adding coupon_id column...');
      await db.run('ALTER TABLE appointments ADD COLUMN coupon_id INTEGER REFERENCES coupons(id)');
      console.log('✅ coupon_id column added');
    } else {
      console.log('✅ coupon_id column already exists');
    }
    
    // Add final_price column if it doesn't exist
    if (!columnNames.includes('final_price')) {
      console.log('Adding final_price column...');
      await db.run('ALTER TABLE appointments ADD COLUMN final_price INTEGER');
      console.log('✅ final_price column added');
    } else {
      console.log('✅ final_price column already exists');
    }
    
    // Add discount_amount column if it doesn't exist
    if (!columnNames.includes('discount_amount')) {
      console.log('Adding discount_amount column...');
      await db.run('ALTER TABLE appointments ADD COLUMN discount_amount INTEGER DEFAULT 0');
      console.log('✅ discount_amount column added');
    } else {
      console.log('✅ discount_amount column already exists');
    }
    
    // Verify the migration
    console.log('\n🔍 Verifying migration...');
    const newSchema = await db.all("PRAGMA table_info(appointments)");
    console.log('Updated appointments table columns:');
    newSchema.forEach(col => {
      console.log(`  ${col.name}: ${col.type} ${col.notnull ? 'NOT NULL' : ''} ${col.dflt_value ? `DEFAULT ${col.dflt_value}` : ''}`);
    });
    
    console.log('\n🎉 Appointments table migration completed successfully!');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await db.close();
  }
}

// Run the migration if this file is executed directly
if (require.main === module) {
  migrateAppointmentsTable()
    .then(() => {
      console.log('\n✅ Database migration completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Migration failed:', error);
      process.exit(1);
    });
}

module.exports = { migrateAppointmentsTable };