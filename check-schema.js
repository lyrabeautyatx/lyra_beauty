const { getDatabase } = require('./database');

async function checkDatabaseSchema() {
  const db = getDatabase();
  
  try {
    await db.connect();
    console.log('Checking database schema...\n');
    
    // Check payments table schema
    const paymentsSchema = await db.all("PRAGMA table_info(payments)");
    console.log('Payments table columns:');
    paymentsSchema.forEach(col => {
      console.log(`  ${col.name}: ${col.type} ${col.notnull ? 'NOT NULL' : ''} ${col.dflt_value ? `DEFAULT ${col.dflt_value}` : ''}`);
    });
    
    // Check if payments table exists and has data
    const paymentsCount = await db.get("SELECT COUNT(*) as count FROM payments");
    console.log(`\nPayments table has ${paymentsCount.count} records`);
    
    // Check appointments table schema
    const appointmentsSchema = await db.all("PRAGMA table_info(appointments)");
    console.log('\nAppointments table columns:');
    appointmentsSchema.forEach(col => {
      console.log(`  ${col.name}: ${col.type} ${col.notnull ? 'NOT NULL' : ''} ${col.dflt_value ? `DEFAULT ${col.dflt_value}` : ''}`);
    });
    
  } catch (error) {
    console.error('Error checking schema:', error);
  } finally {
    await db.close();
  }
}

checkDatabaseSchema();