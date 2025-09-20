const { getDatabase } = require('../database');

async function createDatabaseSchema() {
  const db = getDatabase();
  
  try {
    await db.connect();
    console.log('Creating database schema...');

    // Create users table
    await db.run(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        google_id TEXT UNIQUE,
        email TEXT UNIQUE,
        first_name TEXT NOT NULL,
        last_name TEXT NOT NULL,
        username TEXT UNIQUE,
        password TEXT,
        role TEXT NOT NULL DEFAULT 'customer',
        partner_status TEXT,
        has_used_coupon BOOLEAN DEFAULT FALSE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✓ Users table created');

    // Create services table
    await db.run(`
      CREATE TABLE IF NOT EXISTS services (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        service_key TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        price DECIMAL(10,2) NOT NULL,
        duration_minutes INTEGER DEFAULT 60,
        active BOOLEAN DEFAULT TRUE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✓ Services table created');

    // Create appointments table
    await db.run(`
      CREATE TABLE IF NOT EXISTS appointments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        service_id INTEGER NOT NULL,
        date TEXT NOT NULL,
        time TEXT NOT NULL,
        status TEXT DEFAULT 'confirmed',
        payment_id TEXT,
        paid_amount INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id),
        FOREIGN KEY (service_id) REFERENCES services(id)
      )
    `);
    console.log('✓ Appointments table created');

    // Create coupons table (for future partner system)
    await db.run(`
      CREATE TABLE IF NOT EXISTS coupons (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        partner_id INTEGER NOT NULL,
        code TEXT UNIQUE NOT NULL,
        discount_percentage INTEGER NOT NULL DEFAULT 10,
        active BOOLEAN DEFAULT TRUE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (partner_id) REFERENCES users(id)
      )
    `);
    console.log('✓ Coupons table created');

    // Create coupon_usage table (track customer coupon usage)
    await db.run(`
      CREATE TABLE IF NOT EXISTS coupon_usage (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        coupon_id INTEGER NOT NULL,
        customer_id INTEGER NOT NULL,
        appointment_id INTEGER NOT NULL,
        used_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (coupon_id) REFERENCES coupons(id),
        FOREIGN KEY (customer_id) REFERENCES users(id),
        FOREIGN KEY (appointment_id) REFERENCES appointments(id),
        UNIQUE(coupon_id, customer_id)
      )
    `);
    console.log('✓ Coupon usage table created');

    // Create partner_commissions table
    await db.run(`
      CREATE TABLE IF NOT EXISTS partner_commissions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        partner_id INTEGER NOT NULL,
        appointment_id INTEGER NOT NULL,
        commission_amount DECIMAL(10,2) NOT NULL,
        status TEXT DEFAULT 'pending',
        paid_at DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (partner_id) REFERENCES users(id),
        FOREIGN KEY (appointment_id) REFERENCES appointments(id)
      )
    `);
    console.log('✓ Partner commissions table created');

    // Create indexes for performance
    await db.run(`CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)`);
    await db.run(`CREATE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id)`);
    await db.run(`CREATE INDEX IF NOT EXISTS idx_users_username ON users(username)`);
    await db.run(`CREATE INDEX IF NOT EXISTS idx_appointments_user_id ON appointments(user_id)`);
    await db.run(`CREATE INDEX IF NOT EXISTS idx_appointments_date ON appointments(date)`);
    await db.run(`CREATE INDEX IF NOT EXISTS idx_services_key ON services(service_key)`);
    await db.run(`CREATE INDEX IF NOT EXISTS idx_coupons_code ON coupons(code)`);
    console.log('✓ Database indexes created');

    console.log('Database schema created successfully!');
    return true;
  } catch (error) {
    console.error('Error creating database schema:', error);
    throw error;
  }
}

// Run schema creation if called directly
if (require.main === module) {
  createDatabaseSchema()
    .then(() => {
      console.log('Schema creation completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Schema creation failed:', error);
      process.exit(1);
    });
}

module.exports = { createDatabaseSchema };