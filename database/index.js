const { getDatabase } = require('../database');
const { DataMigration } = require('./migrate');

module.exports = {
  getDatabase,
  DataMigration
};