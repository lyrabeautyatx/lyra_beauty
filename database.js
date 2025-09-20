const sqlite3 = require('sqlite3').verbose();
const path = require('path');

class Database {
  constructor() {
    this.db = null;
    this.dbPath = path.join(__dirname, 'lyra_beauty.db');
    this.ready = false;
  }

  async connect() {
    return new Promise((resolve, reject) => {
      this.db = new sqlite3.Database(this.dbPath, (err) => {
        if (err) {
          console.error('Error opening database:', err);
          reject(err);
        } else {
          console.log('Connected to SQLite database');
          this.ready = true;
          this.initializeTables()
            .then(() => resolve())
            .catch(reject);
        }
      });
    });
  }

  async initializeTables() {
    return new Promise((resolve, reject) => {
      // Create users table with basic schema
      const createUsersTable = `
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
      `;

      this.db.run(createUsersTable, (err) => {
        if (err) {
          console.error('Error creating users table:', err);
          reject(err);
        } else {
          console.log('Users table initialized');
          // Insert default admin user if not exists
          this.createDefaultUsers()
            .then(() => resolve())
            .catch(reject);
        }
      });
    });
  }

  async createDefaultUsers() {
    return new Promise((resolve, reject) => {
      // Check if admin user exists
      this.db.get('SELECT id FROM users WHERE role = "admin"', (err, row) => {
        if (err) {
          console.error('Error checking for admin user:', err);
          reject(err);
          return;
        }

        if (!row) {
          // Create default admin user
          const insertAdmin = `
            INSERT INTO users (username, password, email, first_name, last_name, role)
            VALUES ('admin', 'adminpass', 'admin@lyrabeauty.com', 'Admin', 'User', 'admin')
          `;
          
          this.db.run(insertAdmin, (err) => {
            if (err) {
              console.error('Error creating admin user:', err);
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

  async get(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.get(sql, params, (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row);
        }
      });
    });
  }

  async all(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.all(sql, params, (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  }

  async run(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.run(sql, params, function(err) {
        if (err) {
          reject(err);
        } else {
          resolve({ 
            id: this.lastID, 
            changes: this.changes 
          });
        }
      });
    });
  }

  close() {
    if (this.db) {
      this.db.close();
      this.ready = false;
    }
  }
}

// Singleton instance
let dbInstance = null;

function getDatabase() {
  if (!dbInstance) {
    dbInstance = new Database();
  }
  return dbInstance;
}

module.exports = { getDatabase };