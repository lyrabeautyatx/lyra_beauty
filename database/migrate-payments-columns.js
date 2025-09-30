/**
 * Database Migration: Add missing columns to payments table
 * This script adds error_message and retry_count columns to support Issue #50
 */

const { getDatabase } = require('../database');

async function migratePaymentsTable() {
  const db = getDatabase();
  
  try {
    await db.connect();
    console.log('🚀 Starting payments table migration...\n');
    
    // Check current schema
    const currentSchema = await db.all("PRAGMA table_info(payments)");
    const columnNames = currentSchema.map(col => col.name);
    
    console.log('Current payments table columns:', columnNames);
    
    // Add error_message column if it doesn't exist
    if (!columnNames.includes('error_message')) {
      console.log('Adding error_message column...');
      await db.run('ALTER TABLE payments ADD COLUMN error_message TEXT');
      console.log('✅ error_message column added');
    } else {
      console.log('✅ error_message column already exists');
    }
    
    // Add retry_count column if it doesn't exist
    if (!columnNames.includes('retry_count')) {
      console.log('Adding retry_count column...');
      await db.run('ALTER TABLE payments ADD COLUMN retry_count INTEGER DEFAULT 0');
      console.log('✅ retry_count column added');
    } else {
      console.log('✅ retry_count column already exists');
    }
    
    // Verify the migration
    console.log('\n🔍 Verifying migration...');
    const newSchema = await db.all("PRAGMA table_info(payments)");
    console.log('Updated payments table columns:');
    newSchema.forEach(col => {
      console.log(`  ${col.name}: ${col.type} ${col.notnull ? 'NOT NULL' : ''} ${col.dflt_value ? `DEFAULT ${col.dflt_value}` : ''}`);
    });
    
    console.log('\n🎉 Migration completed successfully!');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await db.close();
  }
}

// Run the migration if this file is executed directly
if (require.main === module) {
  migratePaymentsTable()
    .then(() => {
      console.log('\n✅ Database migration completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Migration failed:', error);
      process.exit(1);
    });
}

module.exports = { migratePaymentsTable };