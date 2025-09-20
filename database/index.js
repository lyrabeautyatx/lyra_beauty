const { getDatabase } = require('../database');
const { createDatabaseSchema } = require('./schema');
const { DataMigration } = require('./migrate');

module.exports = {
  getDatabase,
  createDatabaseSchema,
  DataMigration
};