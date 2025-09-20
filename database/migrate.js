const { getDatabase } = require('./index');
const fs = require('fs');
const path = require('path');

async function runMigration() {
  console.log('🚀 Starting database migration...');
  
  try {
    const db = getDatabase();
    await db.connect();
    
    // Read and execute schema
    const schemaPath = path.join(__dirname, 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    
    // Execute schema as individual statements
    console.log('📋 Executing schema statements...');
    
    // Split by statements, being careful with triggers
    const statements = [];
    let currentStatement = '';
    let inTrigger = false;
    
    const lines = schema.split('\n');
    for (const line of lines) {
      const trimmedLine = line.trim();
      
      // Skip empty lines and comments
      if (!trimmedLine || trimmedLine.startsWith('--')) {
        continue;
      }
      
      currentStatement += line + '\n';
      
      // Check if we're entering a trigger
      if (trimmedLine.toUpperCase().includes('CREATE TRIGGER')) {
        inTrigger = true;
      }
      
      // Check if we're ending a trigger or regular statement
      if (trimmedLine.endsWith(';')) {
        if (inTrigger && trimmedLine.toUpperCase() === 'END;') {
          // End of trigger
          statements.push(currentStatement.trim());
          currentStatement = '';
          inTrigger = false;
        } else if (!inTrigger) {
          // Regular statement
          statements.push(currentStatement.trim());
          currentStatement = '';
        }
        // If in trigger but not END;, continue accumulating
      }
    }
    
    // Add any remaining statement
    if (currentStatement.trim()) {
      statements.push(currentStatement.trim());
    }
    
    for (const statement of statements) {
      if (statement) {
        try {
          await db.run(statement);
        } catch (error) {
          console.error('Error executing statement:', statement.substring(0, 100) + '...');
          throw error;
        }
      }
    }
    
    console.log('✅ Schema created successfully');
    
    // Insert default services
    console.log('💅 Inserting default services...');
    const services = [
      {
        name: 'Microblading',
        service_key: 'microblading',
        price: 350.00,
        duration_minutes: 180,
        description: 'Semi-permanent eyebrow technique using fine strokes'
      },
      {
        name: 'Microshading',
        service_key: 'microshading',
        price: 300.00,
        duration_minutes: 150,
        description: 'Semi-permanent eyebrow technique using powder/ombre effect'
      },
      {
        name: 'Lip Glow',
        service_key: 'lipglow',
        price: 200.00,
        duration_minutes: 120,
        description: 'Semi-permanent lip enhancement for natural color'
      },
      {
        name: 'Brow Mapping',
        service_key: 'browmapping',
        price: 150.00,
        duration_minutes: 60,
        description: 'Professional eyebrow shaping and mapping service'
      }
    ];
    
    for (const service of services) {
      // Check if service already exists
      const existing = await db.get(
        'SELECT id FROM services WHERE service_key = ?',
        [service.service_key]
      );
      
      if (!existing) {
        await db.run(
          `INSERT INTO services (name, service_key, price, duration_minutes, description, active)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [service.name, service.service_key, service.price, service.duration_minutes, service.description, true]
        );
        console.log(`   ✓ Added service: ${service.name}`);
      } else {
        console.log(`   - Service already exists: ${service.name}`);
      }
    }
    
    // Insert default admin user
    console.log('👤 Creating default admin user...');
    const existingAdmin = await db.get(
      'SELECT id FROM users WHERE role = ? AND username = ?',
      ['admin', 'admin']
    );
    
    if (!existingAdmin) {
      await db.run(
        `INSERT INTO users (username, password, email, first_name, last_name, role, has_used_coupon)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        ['admin', 'adminpass', 'admin@lyrabeautyatx.com', 'Admin', 'User', 'admin', false]
      );
      console.log('   ✓ Default admin user created (username: admin, password: adminpass)');
    } else {
      console.log('   - Admin user already exists');
    }
    
    // Verify tables were created
    console.log('🔍 Verifying database structure...');
    const tables = await db.all(
      "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'"
    );
    
    console.log('   📊 Tables created:', tables.map(t => t.name).join(', '));
    
    // Check constraints and indexes
    const userIndexes = await db.all(
      "SELECT name FROM sqlite_master WHERE type='index' AND tbl_name='users'"
    );
    const serviceIndexes = await db.all(
      "SELECT name FROM sqlite_master WHERE type='index' AND tbl_name='services'"
    );
    
    console.log('   📈 User indexes:', userIndexes.map(i => i.name).join(', '));
    console.log('   📈 Service indexes:', serviceIndexes.map(i => i.name).join(', '));
    
    // Test basic operations
    console.log('🧪 Testing database operations...');
    const userCount = await db.get('SELECT COUNT(*) as count FROM users');
    const serviceCount = await db.get('SELECT COUNT(*) as count FROM services');
    
    console.log(`   👥 Users in database: ${userCount.count}`);
    console.log(`   💅 Services in database: ${serviceCount.count}`);
    
    console.log('🎉 Database migration completed successfully!');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

// Run migration if called directly
if (require.main === module) {
  runMigration()
    .then(() => process.exit(0))
    .catch(err => {
      console.error('Migration error:', err);
      process.exit(1);
    });
}

module.exports = { runMigration };