const sqlite3 = require('sqlite3').verbose();
const path = require('path');

class Database {
  constructor() {
    this.db = null;
    this.ready = false;
  }

  async connect() {
    return new Promise((resolve, reject) => {
      const dbPath = path.join(__dirname, 'lyra_beauty.db');
      
      this.db = new sqlite3.Database(dbPath, (err) => {
        if (err) {
          console.error('Error opening database:', err);
          reject(err);
        } else {
          console.log('Connected to SQLite database');
          this.ready = true;
          this.initializeSchema().then(resolve).catch(reject);
        }
      });
    });
  }

  async initializeSchema() {
    return new Promise((resolve, reject) => {
      // Create users table if it doesn't exist
      const createUsersTable = `
        CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          google_id TEXT UNIQUE,
          email TEXT NOT NULL,
          first_name TEXT NOT NULL,
          last_name TEXT NOT NULL,
          username TEXT UNIQUE,
          password TEXT,
          role TEXT DEFAULT 'customer',
          partner_status TEXT,
          has_used_coupon BOOLEAN DEFAULT FALSE,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `;

      this.db.run(createUsersTable, (err) => {
        if (err) {
          console.error('Error creating users table:', err);
          reject(err);
        } else {
          console.log('Users table ready');
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
            console.log('Database connection closed');
            this.ready = false;
            resolve();
          }
        });
      } else {
        resolve();
      }
    });
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

module.exports = { getDatabase };