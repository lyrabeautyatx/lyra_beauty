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
    
    // Create default admin user for Google OAuth
    // This user will need to log in via Google OAuth first, then can be promoted to admin
    const defaultUsers = [
      {
        email: 'admin@lyrabeauty.com',
        first_name: 'Admin',
        last_name: 'User',
        role: 'admin'
      }
    ];

    for (const user of defaultUsers) {
      try {
        // Check if user already exists by email
        const existingUser = await this.db.get(
          'SELECT id FROM users WHERE email = ?',
          [user.email]
        );

        if (!existingUser) {
          await this.db.run(`
            INSERT INTO users (email, first_name, last_name, role)
            VALUES (?, ?, ?, ?)
          `, [user.email, user.first_name, user.last_name, user.role]);
          
          console.log(`✓ Created user: ${user.email}`);
        } else {
          console.log(`✓ User already exists: ${user.email}`);
        }
      } catch (error) {
        console.error(`Error creating user ${user.email}:`, error);
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
        // For legacy appointments with username, create a user if one doesn't exist
        let user = null;
        if (appointment.username) {
          // Create a temporary email for legacy users
          const tempEmail = `${appointment.username}@lyrabeauty.com`;
          
          // Check if user exists by email
          user = await this.db.get(
            'SELECT id FROM users WHERE email = ?',
            [tempEmail]
          );
          
          // Create user if doesn't exist
          if (!user) {
            await this.db.run(`
              INSERT INTO users (email, first_name, last_name, role)
              VALUES (?, ?, ?, ?)
            `, [tempEmail, appointment.username, 'User', 'customer']);
            
            user = await this.db.get(
              'SELECT id FROM users WHERE email = ?',
              [tempEmail]
            );
            console.log(`✓ Created legacy user: ${tempEmail}`);
          }
        }

        if (!user) {
          console.log(`⚠ Could not create/find user for appointment ${appointment.id}`);
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