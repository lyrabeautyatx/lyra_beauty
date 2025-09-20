const sqlite3 = require('sqlite3').verbose();
const path = require('path');

class Database {
  constructor() {
    this.db = null;
    this.isConnected = false;
    this.dbPath = path.join(__dirname, 'lyra_beauty.db');
  }

  async connect() {
    return new Promise((resolve, reject) => {
      this.db = new sqlite3.Database(this.dbPath, (err) => {
        if (err) {
          console.error('Error connecting to database:', err);
          reject(err);
        } else {
          this.isConnected = true;
          console.log('Connected to SQLite database');
          resolve();
        }
      });
    });
  }

  isReady() {
    return this.isConnected && this.db;
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

  async close() {
    return new Promise((resolve, reject) => {
      if (this.db) {
        this.db.close((err) => {
          if (err) {
            reject(err);
          } else {
            this.isConnected = false;
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
let databaseInstance = null;

function getDatabase() {
  if (!databaseInstance) {
    databaseInstance = new Database();
  }
  return databaseInstance;
}

module.exports = { getDatabase };