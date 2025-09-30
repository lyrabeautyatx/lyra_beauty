const { getDatabase } = require('../database');
const fs = require('fs');
const path = require('path');

async function applySchema() {
  const db = getDatabase();
  
  try {
    await db.connect();
    console.log('Connected to database');
    
    // Read and execute schema SQL
    const schemaPath = path.join(__dirname, 'schema.sql');
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');
    
    // Execute the entire schema as a single statement using exec
    await db.exec(schemaSql);
    
    console.log('✅ Database schema applied successfully');
    
    // Check if partner_applications table exists
    const tableExists = await db.get(`
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name='partner_applications'
    `);
    
    if (tableExists) {
      console.log('✅ Partner applications table created successfully');
    } else {
      console.log('❌ Partner applications table not found');
    }
    
    await db.close();
  } catch (error) {
    console.error('Error applying schema:', error);
    throw error;
  }
}

// Run if called directly
if (require.main === module) {
  applySchema().catch(console.error);
}

module.exports = { applySchema };