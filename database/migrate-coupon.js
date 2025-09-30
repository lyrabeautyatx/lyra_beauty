const { getDatabase } = require('../database');

async function migrateCouponColumns() {
  const db = getDatabase();
  
  try {
    await db.connect();
    console.log('🚀 Starting coupon migration...');
    
    // Check if columns already exist
    const tableInfo = await db.all("PRAGMA table_info(appointments)");
    const columnNames = tableInfo.map(col => col.name);
    
    console.log('Current columns:', columnNames);
    
    // Add new columns if they don't exist
    if (!columnNames.includes('coupon_id')) {
      console.log('Adding coupon_id column...');
      await db.run('ALTER TABLE appointments ADD COLUMN coupon_id INTEGER REFERENCES coupons(id)');
    }
    
    if (!columnNames.includes('original_price')) {
      console.log('Adding original_price column...');
      await db.run('ALTER TABLE appointments ADD COLUMN original_price INTEGER NOT NULL DEFAULT 0');
    }
    
    if (!columnNames.includes('final_price')) {
      console.log('Adding final_price column...');
      await db.run('ALTER TABLE appointments ADD COLUMN final_price INTEGER NOT NULL DEFAULT 0');
    }
    
    if (!columnNames.includes('down_payment_amount')) {
      console.log('Adding down_payment_amount column...');
      await db.run('ALTER TABLE appointments ADD COLUMN down_payment_amount INTEGER DEFAULT 0');
    }
    
    // Migrate existing appointments to have pricing data
    console.log('Migrating existing appointment pricing data...');
    
    const existingAppointments = await db.all(`
      SELECT a.id, s.price * 100 as service_price 
      FROM appointments a 
      JOIN services s ON a.service_id = s.id 
      WHERE a.original_price = 0 OR a.final_price = 0
    `);
    
    for (const apt of existingAppointments) {
      const servicePrice = apt.service_price;
      await db.run(`
        UPDATE appointments 
        SET original_price = ?, final_price = ? 
        WHERE id = ?
      `, [servicePrice, servicePrice, apt.id]);
    }
    
    console.log(`✅ Migration completed! Updated ${existingAppointments.length} appointments`);
    
    // Verify the migration
    const finalTableInfo = await db.all("PRAGMA table_info(appointments)");
    console.log('Final columns:', finalTableInfo.map(col => col.name));
    
    await db.close();
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
}

// Run migration if called directly
if (require.main === module) {
  migrateCouponColumns()
    .then(() => {
      console.log('Migration successful!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration failed:', error);
      process.exit(1);
    });
}

module.exports = { migrateCouponColumns };