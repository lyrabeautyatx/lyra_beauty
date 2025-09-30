const { getDatabase } = require('../database');

async function migratePaymentsTable() {
  console.log('🔄 Starting payments table migration...');
  
  const db = getDatabase();
  
  try {
    await db.connect();
    
    // Check if error_message column exists
    const tableInfo = await db.all("PRAGMA table_info(payments)");
    const hasErrorMessage = tableInfo.some(col => col.name === 'error_message');
    const hasRetryCount = tableInfo.some(col => col.name === 'retry_count');
    
    if (!hasErrorMessage) {
      console.log('Adding error_message column...');
      await db.run('ALTER TABLE payments ADD COLUMN error_message TEXT');
      console.log('✓ error_message column added');
    } else {
      console.log('✓ error_message column already exists');
    }
    
    if (!hasRetryCount) {
      console.log('Adding retry_count column...');
      await db.run('ALTER TABLE payments ADD COLUMN retry_count INTEGER DEFAULT 0');
      console.log('✓ retry_count column added');
    } else {
      console.log('✓ retry_count column already exists');
    }
    
    console.log('🎉 Payments table migration completed successfully!');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
}

// Run migration if this file is executed directly
if (require.main === module) {
  migratePaymentsTable().catch(console.error);
}

module.exports = { migratePaymentsTable };