const sqlite3 = require('sqlite3').verbose();
const path = require('path');

let db = null;

class Database {
  constructor() {
    this.db = null;
    this.isConnected = false;
  }

  async connect() {
    if (this.isConnected && this.db) {
      return this.db;
    }

    try {
      const dbPath = process.env.DATABASE_PATH || path.join(__dirname, 'lyra_beauty.db');
      
      this.db = new sqlite3.Database(dbPath, (err) => {
        if (err) {
          console.error('Error opening database:', err);
          throw err;
        }
        console.log('Connected to SQLite database');
      });
      
      this.isConnected = true;
      
      // Enable foreign keys
      await this.run('PRAGMA foreign_keys = ON');
      
      // Initialize tables
      await this.initializeTables();
      
      return this.db;
    } catch (error) {
      console.error('Database connection failed:', error);
      throw error;
    }
  }

  isReady() {
    return this.isConnected && this.db;
  }

  // Promisify database operations
  run(sql, params = []) {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not connected'));
        return;
      }
      
      this.db.run(sql, params, function(err) {
        if (err) {
          console.error('Database run error:', err);
          reject(err);
        } else {
          resolve({ id: this.lastID, changes: this.changes });
        }
      });
    });
  }

  get(sql, params = []) {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not connected'));
        return;
      }
      
      this.db.get(sql, params, (err, row) => {
        if (err) {
          console.error('Database get error:', err);
          reject(err);
        } else {
          resolve(row);
        }
      });
    });
  }

  all(sql, params = []) {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not connected'));
        return;
      }
      
      this.db.all(sql, params, (err, rows) => {
        if (err) {
          console.error('Database all error:', err);
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  }

  async close() {
    if (this.db) {
      return new Promise((resolve, reject) => {
        this.db.close((err) => {
          if (err) {
            console.error('Error closing database:', err);
            reject(err);
          } else {
            console.log('Database connection closed');
            this.isConnected = false;
            resolve();
          }
        });
      });
    }
  }

  // Initialize basic tables if they don't exist
  async initializeTables() {
    try {
      // Users table
      await this.run(`
        CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          google_id TEXT UNIQUE,
          email TEXT UNIQUE,
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
      `);

      // Services table
      await this.run(`
        CREATE TABLE IF NOT EXISTS services (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          service_key TEXT UNIQUE NOT NULL,
          name TEXT NOT NULL,
          price DECIMAL(10,2) NOT NULL,
          duration_minutes INTEGER DEFAULT 120,
          active BOOLEAN DEFAULT 1,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Appointments table
      await this.run(`
        CREATE TABLE IF NOT EXISTS appointments (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER,
          service_id INTEGER,
          date TEXT NOT NULL,
          time TEXT NOT NULL,
          status TEXT DEFAULT 'pending',
          payment_id TEXT,
          paid_amount INTEGER DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users (id),
          FOREIGN KEY (service_id) REFERENCES services (id)
        )
      `);

      // Payments table for webhook tracking
      await this.run(`
        CREATE TABLE IF NOT EXISTS payments (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          square_payment_id TEXT UNIQUE,
          appointment_id INTEGER,
          amount INTEGER NOT NULL,
          type TEXT NOT NULL,
          status TEXT DEFAULT 'pending',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (appointment_id) REFERENCES appointments (id)
        )
      `);

      // Insert default services if they don't exist
      const serviceCount = await this.get('SELECT COUNT(*) as count FROM services');
      if (serviceCount.count === 0) {
        const services = [
          { key: 'microblading', name: 'Microblading', price: 350.00 },
          { key: 'microshading', name: 'Microshading', price: 300.00 },
          { key: 'lipglow', name: 'Lip Glow', price: 200.00 },
          { key: 'browmapping', name: 'Brow Mapping', price: 150.00 }
        ];

        for (const service of services) {
          await this.run(`
            INSERT INTO services (service_key, name, price) 
            VALUES (?, ?, ?)
          `, [service.key, service.name, service.price]);
        }
        console.log('Default services created');
      }

      // Insert default admin user if no users exist
      const userCount = await this.get('SELECT COUNT(*) as count FROM users');
      if (userCount.count === 0) {
        await this.run(`
          INSERT INTO users (username, password, role, first_name, last_name, email) 
          VALUES ('admin', 'adminpass', 'admin', 'Admin', 'User', 'admin@lyrabeauty.com')
        `);
        await this.run(`
          INSERT INTO users (username, password, role, first_name, last_name, email) 
          VALUES ('user1', 'pass1', 'customer', 'Test', 'User', 'user@lyrabeauty.com')
        `);
        console.log('Default users created');
      }

      console.log('Database tables initialized successfully');
    } catch (error) {
      console.error('Error initializing database tables:', error);
      throw error;
    }
  }
}

// Singleton instance
let instance = null;

function getDatabase() {
  if (!instance) {
    instance = new Database();
  }
  return instance;
}

module.exports = { getDatabase, Database };