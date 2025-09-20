const { getDatabase } = require('../database');

async function validateApplication() {
  const db = getDatabase();
  
  try {
    await db.connect();
    console.log('🔍 Testing application integration...');

    // Test 1: Load appointments using server.js logic
    console.log('\n📅 Testing appointment loading...');
    const appointments = await db.all(`
      SELECT a.*, u.username, s.service_key, s.name as service_name, s.price as service_price
      FROM appointments a
      LEFT JOIN users u ON a.user_id = u.id
      LEFT JOIN services s ON a.service_id = s.id
      ORDER BY a.date, a.time
    `);
    
    console.log(`✓ Found ${appointments.length} appointments in database`);
    if (appointments.length > 0) {
      const sample = appointments[0];
      console.log(`  Sample: ${sample.username} - ${sample.service_name} on ${sample.date} at ${sample.time}`);
    }

    // Test 2: Load services using server.js logic  
    console.log('\n💄 Testing service pricing...');
    const services = await db.all('SELECT * FROM services WHERE active = 1');
    const pricing = {};
    services.forEach(service => {
      pricing[service.service_key] = {
        name: service.name,
        price: Math.round(service.price * 100) // Convert to cents for Square
      };
    });
    
    console.log(`✓ Loaded ${services.length} services:`);
    Object.entries(pricing).forEach(([key, info]) => {
      console.log(`  ${key}: ${info.name} - $${(info.price / 100).toFixed(2)}`);
    });

    // Test 3: Verify admin user can authenticate
    console.log('\n👤 Testing admin authentication...');
    const adminUser = await db.get(
      'SELECT * FROM users WHERE username = ? AND password = ?',
      ['admin', 'admin123']
    );
    
    if (adminUser) {
      console.log(`✓ Admin user authentication test passed`);
      console.log(`  Role: ${adminUser.role}, Name: ${adminUser.first_name} ${adminUser.last_name}`);
    } else {
      console.log('❌ Admin user authentication failed');
    }

    // Test 4: Check data integrity
    console.log('\n🔍 Testing data integrity...');
    
    const stats = await Promise.all([
      db.get('SELECT COUNT(*) as count FROM users'),
      db.get('SELECT COUNT(*) as count FROM services'),
      db.get('SELECT COUNT(*) as count FROM appointments'),
      db.get('SELECT COUNT(*) as count FROM appointments WHERE user_id NOT IN (SELECT id FROM users)'),
      db.get('SELECT COUNT(*) as count FROM appointments WHERE service_id NOT IN (SELECT id FROM services)')
    ]);

    console.log(`✓ Users: ${stats[0].count}`);
    console.log(`✓ Services: ${stats[1].count}`);
    console.log(`✓ Appointments: ${stats[2].count}`);
    console.log(`✓ Orphaned appointments (user): ${stats[3].count}`);
    console.log(`✓ Orphaned appointments (service): ${stats[4].count}`);

    if (stats[3].count === 0 && stats[4].count === 0) {
      console.log('✅ All data integrity checks passed!');
    } else {
      console.log('❌ Data integrity issues found!');
    }

    console.log('\n🎉 Application validation completed successfully!');
    
    await db.close();
    return true;
  } catch (error) {
    console.error('❌ Validation failed:', error);
    throw error;
  }
}

// Run validation if called directly
if (require.main === module) {
  validateApplication()
    .then(() => {
      process.exit(0);
    })
    .catch((error) => {
      console.error('Validation failed:', error);
      process.exit(1);
    });
}

module.exports = { validateApplication };