const { getDatabase } = require('../database');
const fs = require('fs');
const path = require('path');

class DataMigration {
  constructor() {
    this.db = getDatabase();
    this.appointmentsFile = path.join(__dirname, '../appointments.json');
  }

  async run() {
    try {
      console.log('🚀 Starting enhanced data migration...');
      
      // Step 1: Connect to database (this will create tables via initializeTables)
      await this.db.connect();
      
      // Step 2: Populate services table with enhanced data
      await this.populateServices();
      
      // Step 3: Migrate appointments data from JSON
      await this.migrateAppointments();
      
      // Step 4: Validate migrated data
      await this.validateMigration();
      
      console.log('✅ Enhanced data migration completed successfully!');
      return true;
    } catch (error) {
      console.error('❌ Migration failed:', error);
      throw error;
    }
  }

  async populateServices() {
    console.log('\n💄 Populating services table with enhanced data...');
    
    // Enhanced service data with duration and descriptions
    const services = [
      {
        service_key: 'microblading',
        name: 'Microblading',
        price: 350.00,
        duration_minutes: 180,
        description: 'Semi-permanent eyebrow technique using fine hair-like strokes'
      },
      {
        service_key: 'microshading',
        name: 'Microshading',
        price: 300.00,
        duration_minutes: 150,
        description: 'Semi-permanent eyebrow technique using powder/ombre effect'
      },
      {
        service_key: 'lipglow',
        name: 'Lip Glow',
        price: 200.00,
        duration_minutes: 120,
        description: 'Semi-permanent lip enhancement for natural color boost'
      },
      {
        service_key: 'browmapping',
        name: 'Brow Mapping',
        price: 150.00,
        duration_minutes: 60,
        description: 'Professional eyebrow shaping and mapping consultation'
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
          // Update existing service with enhanced data
          await this.db.run(`
            UPDATE services 
            SET duration_minutes = ?, description = ?, updated_at = CURRENT_TIMESTAMP
            WHERE service_key = ?
          `, [service.duration_minutes, service.description, service.service_key]);
          console.log(`✓ Updated service "${service.name}" with enhanced data`);
        } else {
          // Insert new service
          const result = await this.db.run(`
            INSERT INTO services (service_key, name, price, duration_minutes, description, active)
            VALUES (?, ?, ?, ?, ?, ?)
          `, [
            service.service_key,
            service.name,
            service.price,
            service.duration_minutes,
            service.description,
            true
          ]);
          console.log(`✓ Created service "${service.name}" (ID: ${result.id}) - $${service.price}`);
        }
      } catch (error) {
        console.error(`Error processing service "${service.name}":`, error);
        throw error;
      }
    }
  }

  async migrateAppointments() {
    console.log('\n📅 Migrating appointments data from JSON...');
    
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
      let skippedCount = 0;
      for (const apt of appointments) {
        try {
          const result = await this.migrateAppointment(apt);
          if (result) {
            migratedCount++;
          } else {
            skippedCount++;
          }
        } catch (error) {
          console.error(`Error migrating appointment ${apt.id}:`, error);
          skippedCount++;
        }
      }

      console.log(`✅ Migration summary: ${migratedCount} migrated, ${skippedCount} skipped`);
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
      const serviceMapping = {
        'haircut': 'microblading', // Legacy mapping
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
        return false; // Skipped
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
      return true; // Migrated
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

      // Test appointment loading logic (compatibility with server.js)
      const sampleAppointment = await this.db.get(`
        SELECT a.*, u.username, s.service_key, s.name as service_name, s.price as service_price
        FROM appointments a
        LEFT JOIN users u ON a.user_id = u.id
        LEFT JOIN services s ON a.service_id = s.id
        LIMIT 1
      `);

      if (sampleAppointment) {
        console.log(`✓ Appointment loading query test passed`);
        console.log(`  Sample: ${sampleAppointment.username} - ${sampleAppointment.service_name}`);
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
      console.log('\n🎉 Enhanced migration completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Migration failed:', error);
      process.exit(1);
    });
}

module.exports = { DataMigration };