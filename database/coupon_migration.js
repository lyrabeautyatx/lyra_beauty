const { getDatabase } = require('../database');

class CouponMigration {
  constructor() {
    this.db = getDatabase();
  }

  async run() {
    try {
      console.log('🎟️  Starting coupon system migration...');
      
      // Connect to database
      await this.db.connect();
      
      // Create coupon-related tables
      await this.createCouponTables();
      
      // Create sample partner and coupon data
      await this.createSampleData();
      
      console.log('✅ Coupon system migration completed successfully!');
      return true;
    } catch (error) {
      console.error('❌ Coupon migration failed:', error);
      throw error;
    }
  }

  async createCouponTables() {
    console.log('Creating coupon-related tables...');

    // Coupons table - stores partner referral coupons
    await this.db.run(`
      CREATE TABLE IF NOT EXISTS coupons (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        partner_id INTEGER NOT NULL,
        code VARCHAR(50) NOT NULL UNIQUE,
        discount_percentage DECIMAL(5,2) NOT NULL DEFAULT 10.00,
        active BOOLEAN NOT NULL DEFAULT TRUE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (partner_id) REFERENCES users (id) ON DELETE CASCADE
      )
    `);

    // Coupon usage table - tracks one-time use per customer
    await this.db.run(`
      CREATE TABLE IF NOT EXISTS coupon_usage (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        coupon_id INTEGER NOT NULL,
        customer_id INTEGER NOT NULL,
        appointment_id INTEGER NOT NULL,
        discount_amount INTEGER NOT NULL,
        used_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (coupon_id) REFERENCES coupons (id) ON DELETE CASCADE,
        FOREIGN KEY (customer_id) REFERENCES users (id) ON DELETE CASCADE,
        FOREIGN KEY (appointment_id) REFERENCES appointments (id) ON DELETE CASCADE,
        UNIQUE(coupon_id, customer_id)
      )
    `);

    // Partner commissions table - tracks partner earnings
    await this.db.run(`
      CREATE TABLE IF NOT EXISTS partner_commissions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        partner_id INTEGER NOT NULL,
        appointment_id INTEGER NOT NULL,
        coupon_id INTEGER NOT NULL,
        original_service_price INTEGER NOT NULL,
        commission_amount INTEGER NOT NULL,
        commission_percentage DECIMAL(5,2) NOT NULL DEFAULT 20.00,
        status VARCHAR(20) NOT NULL DEFAULT 'pending',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        paid_at DATETIME NULL,
        FOREIGN KEY (partner_id) REFERENCES users (id) ON DELETE CASCADE,
        FOREIGN KEY (appointment_id) REFERENCES appointments (id) ON DELETE CASCADE,
        FOREIGN KEY (coupon_id) REFERENCES coupons (id) ON DELETE CASCADE
      )
    `);

    // Add indexes for performance
    await this.db.run(`CREATE INDEX IF NOT EXISTS idx_coupons_code ON coupons(code)`);
    await this.db.run(`CREATE INDEX IF NOT EXISTS idx_coupons_partner_id ON coupons(partner_id)`);
    await this.db.run(`CREATE INDEX IF NOT EXISTS idx_coupon_usage_customer ON coupon_usage(customer_id)`);
    await this.db.run(`CREATE INDEX IF NOT EXISTS idx_coupon_usage_coupon ON coupon_usage(coupon_id)`);
    await this.db.run(`CREATE INDEX IF NOT EXISTS idx_partner_commissions_partner ON partner_commissions(partner_id)`);
    await this.db.run(`CREATE INDEX IF NOT EXISTS idx_partner_commissions_status ON partner_commissions(status)`);

    // Add coupon_id and final_price columns to appointments table if they don't exist
    try {
      await this.db.run(`ALTER TABLE appointments ADD COLUMN coupon_id INTEGER REFERENCES coupons(id)`);
      console.log('Added coupon_id column to appointments table');
    } catch (error) {
      if (!error.message.includes('duplicate column name')) {
        throw error;
      }
    }

    try {
      await this.db.run(`ALTER TABLE appointments ADD COLUMN final_price INTEGER`);
      console.log('Added final_price column to appointments table');
    } catch (error) {
      if (!error.message.includes('duplicate column name')) {
        throw error;
      }
    }

    try {
      await this.db.run(`ALTER TABLE appointments ADD COLUMN discount_amount INTEGER DEFAULT 0`);
      console.log('Added discount_amount column to appointments table');
    } catch (error) {
      if (!error.message.includes('duplicate column name')) {
        throw error;
      }
    }

    console.log('Coupon tables created successfully');
  }

  async createSampleData() {
    console.log('Creating sample partner and coupon data...');

    // Check if we already have partners
    const existingPartners = await this.db.all('SELECT * FROM users WHERE role = "partner"');
    
    if (existingPartners.length === 0) {
      // Create a sample partner user
      const partnerResult = await this.db.run(`
        INSERT INTO users (email, first_name, last_name, role, partner_status, google_id) 
        VALUES (?, ?, ?, ?, ?, ?)
      `, ['partner@example.com', 'Sample', 'Partner', 'partner', 'approved', 'partner_google_123']);

      const partnerId = partnerResult.lastID;
      console.log('Created partner with ID:', partnerId);

      // Create a sample coupon for this partner (penguin10off based on first name starting with 'S' -> 'Sample')
      await this.db.run(`
        INSERT INTO coupons (partner_id, code, discount_percentage, active) 
        VALUES (?, ?, ?, ?)
      `, [partnerId, 'penguin10off', 10.00, true]);

      console.log('Sample partner and coupon created');
    } else {
      console.log('Partners already exist, skipping sample data creation');
    }
  }
}

// Run migration if called directly
if (require.main === module) {
  const migration = new CouponMigration();
  migration.run()
    .then(() => {
      console.log('Migration completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration failed:', error);
      process.exit(1);
    });
}

module.exports = CouponMigration;