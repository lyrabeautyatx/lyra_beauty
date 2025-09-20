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
      const dbPath = process.env.DATABASE_PATH || ':memory:';
      
      this.db = new sqlite3.Database(dbPath, (err) => {
        if (err) {
          console.error('Error opening database:', err);
          reject(err);
        } else {
          console.log('Connected to SQLite database:', dbPath);
          this.ready = true;
          this.initializeTables().then(resolve).catch(reject);
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
          // Create default admin user for testing
          this.createDefaultUsers().then(resolve).catch(reject);
        }
      });
    });
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
            VALUES ('admin', 'adminpass', 'admin@lyrabeauty.com', 'Admin', 'User', 'admin')
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