const fs = require('fs');
const path = require('path');
const { getDatabase } = require('./index');

// Load environment variables
require('dotenv').config();

class DatabaseMigration {
  constructor() {
    this.db = getDatabase();
    this.appointmentsFile = path.join(__dirname, '..', 'appointments.json');
  }

  async migrate() {
    try {
      console.log('Starting database migration...');
      
      // Connect to database
      await this.db.connect();
      
      // Create schema
      console.log('Creating database schema...');
      await this.db.createSchema();
      
      // Migrate data
      await this.migrateUsers();
      await this.migrateServices();
      await this.migrateAppointments();
      
      console.log('Database migration completed successfully!');
      
    } catch (error) {
      console.error('Migration failed:', error);
      throw error;
    }
  }

  async migrateUsers() {
    console.log('Migrating users...');
    
    // Create default users from the hardcoded users in server.js
    const defaultUsers = [
      {
        username: 'user1',
        password: 'pass1',
        role: 'user',
        first_name: 'User',
        last_name: 'One',
        email: 'user1@lyrabeauty.com'
      },
      {
        username: 'admin',
        password: 'adminpass',
        role: 'admin',
        first_name: 'Admin',
        last_name: 'User',
        email: 'admin@lyrabeauty.com'
      }
    ];

    for (const user of defaultUsers) {
      try {
        // Check if user already exists
        const existingUser = await this.db.get(
          'SELECT id FROM users WHERE username = ?',
          [user.username]
        );

        if (!existingUser) {
          await this.db.run(`
            INSERT INTO users (username, password, role, first_name, last_name, email)
            VALUES (?, ?, ?, ?, ?, ?)
          `, [user.username, user.password, user.role, user.first_name, user.last_name, user.email]);
          
          console.log(`✓ Created user: ${user.username}`);
        } else {
          console.log(`✓ User already exists: ${user.username}`);
        }
      } catch (error) {
        console.error(`Error creating user ${user.username}:`, error);
      }
    }
  }

  async migrateServices() {
    console.log('Migrating services...');
    
    // Service pricing from server.js
    const services = [
      {
        service_key: 'microblading',
        name: 'Microblading',
        description: 'Precision eyebrow enhancement',
        price: 350.00,
        duration_minutes: 120
      },
      {
        service_key: 'microshading',
        name: 'Microshading',
        description: 'Soft powder eyebrow technique',
        price: 300.00,
        duration_minutes: 90
      },
      {
        service_key: 'lipglow',
        name: 'Lip Glow',
        description: 'Natural lip enhancement',
        price: 200.00,
        duration_minutes: 60
      },
      {
        service_key: 'browmapping',
        name: 'Brow Mapping',
        description: 'Professional eyebrow shaping',
        price: 150.00,
        duration_minutes: 45
      }
    ];

    for (const service of services) {
      try {
        // Check if service already exists
        const existingService = await this.db.get(
          'SELECT id FROM services WHERE service_key = ?',
          [service.service_key]
        );

        if (!existingService) {
          await this.db.run(`
            INSERT INTO services (service_key, name, description, price, duration_minutes)
            VALUES (?, ?, ?, ?, ?)
          `, [service.service_key, service.name, service.description, service.price, service.duration_minutes]);
          
          console.log(`✓ Created service: ${service.name}`);
        } else {
          console.log(`✓ Service already exists: ${service.name}`);
        }
      } catch (error) {
        console.error(`Error creating service ${service.name}:`, error);
      }
    }
  }

  async migrateAppointments() {
    console.log('Migrating appointments...');
    
    // Load existing appointments from JSON file
    let appointments = [];
    try {
      if (fs.existsSync(this.appointmentsFile)) {
        const data = fs.readFileSync(this.appointmentsFile, 'utf8');
        appointments = JSON.parse(data);
        console.log(`Found ${appointments.length} appointments to migrate`);
      } else {
        console.log('No existing appointments file found');
        return;
      }
    } catch (error) {
      console.error('Error reading appointments file:', error);
      return;
    }

    for (const appointment of appointments) {
      try {
        // Find user by username
        const user = await this.db.get(
          'SELECT id FROM users WHERE username = ?',
          [appointment.username]
        );

        if (!user) {
          console.log(`⚠ User not found for appointment ${appointment.id}: ${appointment.username}`);
          continue;
        }

        // Find service by service key (if available) or by name matching
        let service = null;
        if (appointment.service) {
          service = await this.db.get(
            'SELECT id FROM services WHERE service_key = ?',
            [appointment.service]
          );
          
          // Fallback: try to match by similar name
          if (!service && appointment.serviceInfo && appointment.serviceInfo.name) {
            service = await this.db.get(
              'SELECT id FROM services WHERE LOWER(name) LIKE ?',
              [`%${appointment.serviceInfo.name.toLowerCase()}%`]
            );
          }
        }

        if (!service) {
          console.log(`⚠ Service not found for appointment ${appointment.id}: ${appointment.service}`);
          // Create a default service entry
          const defaultServiceResult = await this.db.run(`
            INSERT INTO services (service_key, name, description, price, duration_minutes)
            VALUES (?, ?, ?, ?, ?)
          `, [
            appointment.service || 'unknown',
            appointment.serviceInfo?.name || appointment.service || 'Unknown Service',
            'Migrated from legacy data',
            appointment.serviceInfo?.price ? appointment.serviceInfo.price / 100 : 0,
            60
          ]);
          service = { id: defaultServiceResult.id };
          console.log(`✓ Created service for migration: ${appointment.serviceInfo?.name || appointment.service}`);
        }

        // Check if appointment already exists
        const existingAppointment = await this.db.get(
          'SELECT id FROM appointments WHERE user_id = ? AND date = ? AND time = ?',
          [user.id, appointment.date, appointment.time]
        );

        if (!existingAppointment) {
          await this.db.run(`
            INSERT INTO appointments (
              user_id, service_id, date, time, status, payment_id, paid_amount
            ) VALUES (?, ?, ?, ?, ?, ?, ?)
          `, [
            user.id,
            service.id,
            appointment.date,
            appointment.time,
            appointment.status || 'confirmed',
            appointment.paymentId,
            appointment.paidAmount
          ]);
          
          console.log(`✓ Migrated appointment: ${appointment.date} ${appointment.time} for ${appointment.username}`);
        } else {
          console.log(`✓ Appointment already exists: ${appointment.date} ${appointment.time} for ${appointment.username}`);
        }
      } catch (error) {
        console.error(`Error migrating appointment ${appointment.id}:`, error);
      }
    }
  }

  async backup() {
    console.log('Creating backup of current data...');
    
    if (fs.existsSync(this.appointmentsFile)) {
      const backupPath = path.join(__dirname, '..', `appointments.json.backup.${Date.now()}`);
      fs.copyFileSync(this.appointmentsFile, backupPath);
      console.log(`✓ Backup created: ${backupPath}`);
    }
  }

  async validateMigration() {
    console.log('Validating migration...');
    
    const userCount = await this.db.get('SELECT COUNT(*) as count FROM users');
    const serviceCount = await this.db.get('SELECT COUNT(*) as count FROM services');
    const appointmentCount = await this.db.get('SELECT COUNT(*) as count FROM appointments');
    
    console.log(`✓ Migrated ${userCount.count} users`);
    console.log(`✓ Migrated ${serviceCount.count} services`);
    console.log(`✓ Migrated ${appointmentCount.count} appointments`);
  }
}

// Run migration if called directly
async function runMigration() {
  const migration = new DatabaseMigration();
  
  try {
    await migration.backup();
    await migration.migrate();
    await migration.validateMigration();
    console.log('\n🎉 Migration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  }
}

// Export for use in other modules
module.exports = DatabaseMigration;

// Run migration if this file is executed directly
if (require.main === module) {
  runMigration();
}