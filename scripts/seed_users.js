// Script to insert test users: user1 (customer), partner1 (partner), admin1 (admin)
// Usage: node scripts/seed_users.js

const path = require('path');
const { getDatabase } = require('../database');

(async () => {
  const db = getDatabase();
  await db.connect();

  // Helper to insert user if not exists
  async function upsertUser({ email, first_name, last_name, username, password, role, partner_status }) {
    const existing = await db.get('SELECT * FROM users WHERE username = ?', [username]);
    if (existing) {
      console.log(`User '${username}' already exists.`);
      return;
    }
    await db.run(
      `INSERT INTO users (email, first_name, last_name, username, password, role${role === 'partner' ? ', partner_status' : ''}) VALUES (?, ?, ?, ?, ?, ?${role === 'partner' ? ', ?' : ''})`,
      [
        email,
        first_name,
        last_name,
        username,
        password,
        role,
        ...(role === 'partner' ? [partner_status] : [])
      ]
    );
    console.log(`Inserted user '${username}' as ${role}`);
  }

  // Insert users
  await upsertUser({
    email: 'user1@example.com',
    first_name: 'User',
    last_name: 'One',
    username: 'user1',
    password: 'pass1',
    role: 'customer'
  });
  await upsertUser({
    email: 'partner1@example.com',
    first_name: 'Partner',
    last_name: 'One',
    username: 'partner1',
    password: 'pass1',
    role: 'partner',
    partner_status: 'approved'
  });
  await upsertUser({
    email: 'admin1@example.com',
    first_name: 'Admin',
    last_name: 'One',
    username: 'admin1',
    password: 'pass1',
    role: 'admin'
  });

  await db.close();
  console.log('Done.');
})();
