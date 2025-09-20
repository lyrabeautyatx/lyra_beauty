const fs = require('fs');
const path = require('path');
const { getDatabase } = require('../database');
const { createDatabaseSchema } = require('./schema');

class DataMigration {
  constructor() {
    this.db = getDatabase();
    this.appointmentsFile = path.join(__dirname, '../appointments.json');
  }

  async run() {
    try {
      console.log('🚀 Starting data migration...');
      
      // Step 1: Create database schema
      await this.createSchema();
      
      // Step 2: Create default admin user
      await this.createDefaultAdmin();
      
      // Step 3: Populate services table
      await this.populateServices();
      
      // Step 4: Migrate appointments data
      await this.migrateAppointments();
      
      // Step 5: Validate migrated data
      await this.validateMigration();
      
      console.log('✅ Data migration completed successfully!');
      return true;
    } catch (error) {
      console.error('❌ Migration failed:', error);
      throw error;
    }
  }

  async createSchema() {
    console.log('\n📊 Creating database schema...');
    await createDatabaseSchema();
  }

  async createDefaultAdmin() {
    console.log('\n👤 Creating default admin user...');
    
    try {
      // Check if admin user already exists
      const existingAdmin = await this.db.get(
        'SELECT * FROM users WHERE role = ? OR username = ?',
        ['admin', 'admin']
      );
      
      if (existingAdmin) {
        console.log('✓ Default admin user already exists');
        return;
      }

      // Create default admin user
      const result = await this.db.run(`
        INSERT INTO users (
          first_name, last_name, username, password, 
          email, role, partner_status, has_used_coupon
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        'Admin',
        'User',
        'admin',
        'admin123', // Default password - should be changed in production
        'admin@lyrabeautyatx.com',
        'admin',
        null,
        false
      ]);

      console.log(`✓ Default admin user created with ID: ${result.id}`);
      console.log('⚠️  Default password is "admin123" - please change in production!');
    } catch (error) {
      console.error('Error creating default admin user:', error);
      throw error;
    }
  }

  async populateServices() {
    console.log('\n💄 Populating services table...');
    
    // Service pricing from business requirements
    const services = [
      {
        service_key: 'microblading',
        name: 'Microblading',
        price: 350.00,
        duration_minutes: 120
      },
      {
        service_key: 'microshading',
        name: 'Microshading',
        price: 300.00,
        duration_minutes: 90
      },
      {
        service_key: 'lipglow',
        name: 'Lip Glow',
        price: 200.00,
        duration_minutes: 60
      },
      {
        service_key: 'browmapping',
        name: 'Brow Mapping',
        price: 150.00,
        duration_minutes: 45
      }
    ];

    for (const service of services) {
      try {
        // Check if service already exists
        const existing = await this.db.get(
          'SELECT * FROM services WHERE service_key = ?',
          [service.service_key]
        );

        if (existing) {
          console.log(`✓ Service "${service.name}" already exists`);
          continue;
        }

        // Insert new service
        const result = await this.db.run(`
          INSERT INTO services (service_key, name, price, duration_minutes, active)
          VALUES (?, ?, ?, ?, ?)
        `, [
          service.service_key,
          service.name,
          service.price,
          service.duration_minutes,
          true
        ]);

        console.log(`✓ Created service "${service.name}" (ID: ${result.id}) - $${service.price}`);
      } catch (error) {
        console.error(`Error creating service "${service.name}":`, error);
        throw error;
      }
    }
  }

  async migrateAppointments() {
    console.log('\n📅 Migrating appointments data...');
    
    try {
      // Check if appointments.json exists
      if (!fs.existsSync(this.appointmentsFile)) {
        console.log('ℹ️  No appointments.json file found - skipping appointment migration');
        return;
      }

      // Load existing appointments
      const appointmentsData = fs.readFileSync(this.appointmentsFile, 'utf8');
      const appointments = JSON.parse(appointmentsData);

      if (!appointments || appointments.length === 0) {
        console.log('ℹ️  No appointments to migrate');
        return;
      }

      console.log(`Found ${appointments.length} appointments to migrate`);

      // Create legacy users for existing appointments
      const legacyUsers = new Set();
      appointments.forEach(apt => {
        if (apt.username) {
          legacyUsers.add(apt.username);
        }
      });

      // Create users for legacy appointments
      for (const username of legacyUsers) {
        await this.createLegacyUser(username);
      }

      // Migrate each appointment
      let migratedCount = 0;
      for (const apt of appointments) {
        try {
          await this.migrateAppointment(apt);
          migratedCount++;
        } catch (error) {
          console.error(`Error migrating appointment ${apt.id}:`, error);
          // Continue with other appointments
        }
      }

      console.log(`✅ Successfully migrated ${migratedCount}/${appointments.length} appointments`);
    } catch (error) {
      console.error('Error migrating appointments:', error);
      throw error;
    }
  }

  async createLegacyUser(username) {
    try {
      // Check if user already exists
      const existing = await this.db.get(
        'SELECT * FROM users WHERE username = ?',
        [username]
      );

      if (existing) {
        return existing.id;
      }

      // Create legacy user
      const result = await this.db.run(`
        INSERT INTO users (
          first_name, last_name, username, password, 
          email, role, partner_status, has_used_coupon
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        'Legacy',
        'User',
        username,
        '', // No password for legacy users
        `${username}@legacy.local`,
        'customer',
        null,
        false
      ]);

      console.log(`✓ Created legacy user: ${username} (ID: ${result.id})`);
      return result.id;
    } catch (error) {
      console.error(`Error creating legacy user ${username}:`, error);
      throw error;
    }
  }

  async migrateAppointment(appointment) {
    try {
      // Get user ID
      const user = await this.db.get(
        'SELECT id FROM users WHERE username = ?',
        [appointment.username]
      );

      if (!user) {
        throw new Error(`User not found: ${appointment.username}`);
      }

      // Map legacy service names to service keys
      // Legacy mapping: In some legacy data exports, the service "haircut" was mistakenly used to refer to "microblading"
      // appointments due to a previous data entry error in the old system. To ensure these appointments are migrated
      // correctly, we map "haircut" to "microblading" here. Remove this mapping only if you are certain that no legacy
      // data uses "haircut" to mean "microblading".
      const serviceMapping = {
        'haircut': 'microblading',
        'microblading': 'microblading',
        'microshading': 'microshading',
        'lipglow': 'lipglow',
        'browmapping': 'browmapping'
      };

      const serviceKey = serviceMapping[appointment.service] || appointment.service;

      // Get service ID
      const service = await this.db.get(
        'SELECT id FROM services WHERE service_key = ?',
        [serviceKey]
      );

      if (!service) {
        throw new Error(`Service not found: ${serviceKey}`);
      }

      // Check if appointment already exists (avoid duplicates)
      const existing = await this.db.get(
        'SELECT id FROM appointments WHERE user_id = ? AND service_id = ? AND date = ? AND time = ?',
        [user.id, service.id, appointment.date, appointment.time]
      );

      if (existing) {
        console.log(`✓ Appointment already exists: ${appointment.username} on ${appointment.date} at ${appointment.time}`);
        return;
      }

      // Insert appointment
      const result = await this.db.run(`
        INSERT INTO appointments (
          user_id, service_id, date, time, status, payment_id, paid_amount
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [
        user.id,
        service.id,
        appointment.date,
        appointment.time,
        appointment.status || 'confirmed',
        appointment.paymentId || null,
        appointment.paidAmount || null
      ]);

      console.log(`✓ Migrated appointment: ${appointment.username} - ${serviceKey} on ${appointment.date} at ${appointment.time}`);
    } catch (error) {
      console.error(`Error migrating appointment:`, error);
      throw error;
    }
  }

  async validateMigration() {
    console.log('\n🔍 Validating migrated data...');
    
    try {
      // Count records in each table
      const userCount = await this.db.get('SELECT COUNT(*) as count FROM users');
      const serviceCount = await this.db.get('SELECT COUNT(*) as count FROM services');
      const appointmentCount = await this.db.get('SELECT COUNT(*) as count FROM appointments');

      console.log(`✓ Users: ${userCount.count}`);
      console.log(`✓ Services: ${serviceCount.count}`);
      console.log(`✓ Appointments: ${appointmentCount.count}`);

      // Validate relationships
      const orphanedAppointments = await this.db.all(`
        SELECT a.id 
        FROM appointments a 
        LEFT JOIN users u ON a.user_id = u.id 
        LEFT JOIN services s ON a.service_id = s.id 
        WHERE u.id IS NULL OR s.id IS NULL
      `);

      if (orphanedAppointments.length > 0) {
        console.warn(`⚠️  Found ${orphanedAppointments.length} orphaned appointments`);
      } else {
        console.log('✓ All appointments have valid user and service references');
      }

      // Check admin user exists
      const adminUser = await this.db.get('SELECT * FROM users WHERE role = ?', ['admin']);
      if (adminUser) {
        console.log(`✓ Admin user exists: ${adminUser.username}`);
      } else {
        console.warn('⚠️  No admin user found');
      }

      console.log('✅ Data validation completed');
    } catch (error) {
      console.error('Error validating migration:', error);
      throw error;
    }
  }
}

// Run migration if called directly
if (require.main === module) {
  const migration = new DataMigration();
  migration.run()
    .then(() => {
      console.log('\n🎉 Migration completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Migration failed:', error);
      process.exit(1);
    });
}

module.exports = { DataMigration };