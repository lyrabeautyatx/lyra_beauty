const sqlite3 = require('sqlite3').verbose();
const path = require('path');

class Database {
  constructor(dbPath = path.join(__dirname, '..', 'lyra_beauty.db')) {
    this.dbPath = dbPath;
    this.db = null;
    this.ready = false;
  }

  async connect() {
    return new Promise((resolve, reject) => {
      this.db = new sqlite3.Database(this.dbPath, (err) => {
        if (err) {
          console.error('Database connection failed:', err.message);
          this.ready = false;
          reject(err);
        } else {
          console.log('Database connected successfully to:', this.dbPath);
          this.ready = true;
          resolve();
        }
      });
    });
  }

  isReady() {
    return this.ready && this.db !== null;
  }

  async get(sql, params = []) {
    if (!this.isReady()) {
      throw new Error('Database not connected');
    }

    return new Promise((resolve, reject) => {
      this.db.get(sql, params, (err, row) => {
        if (err) {
          console.error('Database GET error:', err.message);
          reject(err);
        } else {
          resolve(row);
        }
      });
    });
  }

  async all(sql, params = []) {
    if (!this.isReady()) {
      throw new Error('Database not connected');
    }

    return new Promise((resolve, reject) => {
      this.db.all(sql, params, (err, rows) => {
        if (err) {
          console.error('Database ALL error:', err.message);
          reject(err);
        } else {
          resolve(rows || []);
        }
      });
    });
  }

  async run(sql, params = []) {
    if (!this.isReady()) {
      throw new Error('Database not connected');
    }

    return new Promise((resolve, reject) => {
      this.db.run(sql, params, function(err) {
        if (err) {
          console.error('Database RUN error:', err.message);
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

  async close() {
    if (this.db) {
      return new Promise((resolve) => {
        this.db.close((err) => {
          if (err) {
            console.error('Error closing database:', err.message);
          } else {
            console.log('Database connection closed');
          }
          this.ready = false;
          this.db = null;
          resolve();
        });
      });
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

module.exports = {
  getDatabase,
  Database
};