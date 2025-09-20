const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

class Database {
  constructor() {
    this.db = null;
    this.ready = false;
  }

  async connect() {
    return new Promise((resolve, reject) => {
      // Create database directory if it doesn't exist
      const dbDir = path.dirname(process.env.DATABASE_PATH || './database/lyra_beauty.db');
      if (!fs.existsSync(dbDir)) {
        fs.mkdirSync(dbDir, { recursive: true });
      }

      // Use in-memory database for development/testing if DATABASE_PATH not set
      const dbPath = process.env.DATABASE_PATH || path.join(__dirname, 'lyra_beauty.db');
      
      this.db = new sqlite3.Database(dbPath, (err) => {
        if (err) {
          console.error('Error opening database:', err);
          reject(err);
        } else {
          console.log('Connected to SQLite database:', dbPath);
          this.ready = true;
          // Enable foreign keys
          this.run('PRAGMA foreign_keys = ON').then(() => {
            this.initializeTables().then(resolve).catch(reject);
          }).catch(reject);
        }
      });
    });
  }

  async initializeTables() {
    return new Promise((resolve, reject) => {
      // Create users table
      const createUsersTable = `
        CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          google_id TEXT UNIQUE,
          email TEXT,
          first_name TEXT,
          last_name TEXT,
          username TEXT UNIQUE,
          password TEXT,
          role TEXT DEFAULT 'customer',
          partner_status TEXT,
          has_used_coupon BOOLEAN DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `;

      this.db.run(createUsersTable, (err) => {
        if (err) {
          console.error('Error creating users table:', err);
          reject(err);
        } else {
          console.log('Users table initialized');
          // Create additional tables needed for migration compatibility
          this.createAdditionalTables().then(() => {
            this.createDefaultUsers().then(resolve).catch(reject);
          }).catch(reject);
        }
      });
    });
  }

  async createAdditionalTables() {
    const tables = [
      // Services table
      `CREATE TABLE IF NOT EXISTS services (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        service_key TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        price DECIMAL(10,2) NOT NULL,
        duration_minutes INTEGER DEFAULT 60,
        description TEXT,
        active BOOLEAN DEFAULT TRUE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,
      
      // Appointments table
      `CREATE TABLE IF NOT EXISTS appointments (
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
      )`,
      
      // Payments table for webhook tracking
      `CREATE TABLE IF NOT EXISTS payments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        square_payment_id TEXT UNIQUE,
        appointment_id INTEGER,
        amount INTEGER NOT NULL,
        type TEXT NOT NULL,
        status TEXT DEFAULT 'pending',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (appointment_id) REFERENCES appointments (id)
      )`,
      
      // Coupons table
      `CREATE TABLE IF NOT EXISTS coupons (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        partner_id INTEGER NOT NULL,
        code TEXT UNIQUE NOT NULL,
        discount_percentage INTEGER NOT NULL DEFAULT 10,
        active BOOLEAN DEFAULT TRUE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (partner_id) REFERENCES users(id)
      )`,
      
      // Coupon usage table
      `CREATE TABLE IF NOT EXISTS coupon_usage (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        coupon_id INTEGER NOT NULL,
        customer_id INTEGER NOT NULL,
        appointment_id INTEGER NOT NULL,
        used_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (coupon_id) REFERENCES coupons(id),
        FOREIGN KEY (customer_id) REFERENCES users(id),
        FOREIGN KEY (appointment_id) REFERENCES appointments(id),
        UNIQUE(coupon_id, customer_id)
      )`,
      
      // Partner commissions table
      `CREATE TABLE IF NOT EXISTS partner_commissions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        partner_id INTEGER NOT NULL,
        appointment_id INTEGER NOT NULL,
        commission_amount DECIMAL(10,2) NOT NULL,
        status TEXT DEFAULT 'pending',
        paid_at DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (partner_id) REFERENCES users(id),
        FOREIGN KEY (appointment_id) REFERENCES appointments(id)
      )`
    ];

    for (const tableSQL of tables) {
      await new Promise((resolve, reject) => {
        this.db.run(tableSQL, (err) => {
          if (err) {
            console.error('Error creating table:', err);
            reject(err);
          } else {
            resolve();
          }
        });
      });
    }

    // Create indexes for performance
    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)',
      'CREATE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id)',
      'CREATE INDEX IF NOT EXISTS idx_users_username ON users(username)',
      'CREATE INDEX IF NOT EXISTS idx_appointments_user_id ON appointments(user_id)',
      'CREATE INDEX IF NOT EXISTS idx_appointments_date ON appointments(date)',
      'CREATE INDEX IF NOT EXISTS idx_services_key ON services(service_key)',
      'CREATE INDEX IF NOT EXISTS idx_coupons_code ON coupons(code)'
    ];

    for (const indexSQL of indexes) {
      await new Promise((resolve, reject) => {
        this.db.run(indexSQL, (err) => {
          if (err) {
            console.error('Error creating index:', err);
            reject(err);
          } else {
            resolve();
          }
        });
      });
    }
  }

  async createDefaultUsers() {
    return new Promise((resolve, reject) => {
      // Check if any users exist
      this.db.get('SELECT COUNT(*) as count FROM users', (err, row) => {
        if (err) {
          reject(err);
          return;
        }

        if (row.count === 0) {
          // Create default admin user
          const insertAdmin = `
            INSERT INTO users (username, password, email, first_name, last_name, role)
            VALUES ('admin', 'admin123', 'admin@lyrabeautyatx.com', 'Admin', 'User', 'admin')
          `;
          
          this.db.run(insertAdmin, (err) => {
            if (err) {
              console.error('Error creating default admin:', err);
              reject(err);
            } else {
              console.log('Default admin user created');
              resolve();
            }
          });
        } else {
          resolve();
        }
      });
    });
  }

  isReady() {
    return this.ready;
  }

  async get(query, params = []) {
    return new Promise((resolve, reject) => {
      this.db.get(query, params, (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row);
        }
      });
    });
  }

  async all(query, params = []) {
    return new Promise((resolve, reject) => {
      this.db.all(query, params, (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  }

  async run(query, params = []) {
    return new Promise((resolve, reject) => {
      this.db.run(query, params, function(err) {
        if (err) {
          reject(err);
        } else {
          resolve({ id: this.lastID, changes: this.changes });
        }
      });
    });
  }

  async close() {
    return new Promise((resolve, reject) => {
      if (this.db) {
        this.db.close((err) => {
          if (err) {
            reject(err);
          } else {
            this.ready = false;
            console.log('Database connection closed');
            resolve();
          }
        });
      } else {
        resolve();
      }
    });
  }
}

let dbInstance = null;

function getDatabase() {
  if (!dbInstance) {
    dbInstance = new Database();
  }
  return dbInstance;
}

module.exports = { getDatabase };