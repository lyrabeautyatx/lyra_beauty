const { getDatabase } = require('../database');

// Helper function to convert database user to application format
function formatUser(dbUser) {
  if (!dbUser) return null;
  
  return {
    id: dbUser.id.toString(),
    google_id: dbUser.google_id,
    email: dbUser.email,
    first_name: dbUser.first_name,
    last_name: dbUser.last_name,
    display_name: `${dbUser.first_name} ${dbUser.last_name}`,
    role: dbUser.role,
    partner_status: dbUser.partner_status,
    has_used_coupon: Boolean(dbUser.has_used_coupon),
    created_at: dbUser.created_at,
    updated_at: dbUser.updated_at,
    // Legacy fields for backward compatibility
    username: dbUser.username,
    password: dbUser.password
  };
}

async function loadUsers() {
  try {
    const db = getDatabase();
    if (!db.isReady()) {
      await db.connect();
    }
    const users = await db.all('SELECT * FROM users');
    return users.map(formatUser);
  } catch (error) {
    console.error('Error loading users from database:', error);
    return [];
  }
}

async function saveUsers(users) {
  // This function is deprecated with database implementation
  // Individual user operations should use specific functions
  console.warn('saveUsers() is deprecated. Use individual user operations instead.');
}

async function findOrCreateUser(profile) {
  try {
    const db = getDatabase();
    if (!db.isReady()) {
      await db.connect();
    }
    
    // Check if user already exists by Google ID
    let user = await db.get('SELECT * FROM users WHERE google_id = ?', [profile.id]);
    
    if (!user) {
      // Create new user with default customer role
      const result = await db.run(`
        INSERT INTO users (
          google_id, email, first_name, last_name, 
          username, password, role, partner_status, has_used_coupon
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        profile.id,
        profile.emails?.[0]?.value || '',
        profile.name?.givenName || 'User',
        profile.name?.familyName || '',
        `oauth_${profile.id}`, // Generate unique username for OAuth users
        '', // No password for OAuth users
        'customer',
        null,
        false
      ]);
      
      // Get the created user
      user = await db.get('SELECT * FROM users WHERE id = ?', [result.id]);
      console.log(`✓ Created new OAuth user: ${user.email} (${user.google_id})`);
    } else {
      // Update existing user info if needed
      await db.run(`
        UPDATE users 
        SET email = ?, first_name = ?, last_name = ?, updated_at = CURRENT_TIMESTAMP
        WHERE google_id = ?
      `, [
        profile.emails?.[0]?.value || user.email,
        profile.name?.givenName || user.first_name,
        profile.name?.familyName || user.last_name,
        profile.id
      ]);
      
      // Get updated user
      user = await db.get('SELECT * FROM users WHERE google_id = ?', [profile.id]);
      console.log(`✓ Updated existing OAuth user: ${user.email} (${user.google_id})`);
    }
    
    return formatUser(user);
  } catch (error) {
    console.error('Error in findOrCreateUser:', error);
    throw error;
  }
}

async function getUserByGoogleId(googleId) {
  try {
    const db = getDatabase();
    if (!db.isReady()) {
      await db.connect();
    }
    const user = await db.get('SELECT * FROM users WHERE google_id = ?', [googleId]);
    return formatUser(user);
  } catch (error) {
    console.error('Error getting user by Google ID:', error);
    return null;
  }
}

async function getUserById(userId) {
  try {
    const db = getDatabase();
    if (!db.isReady()) {
      await db.connect();
    }
    const user = await db.get('SELECT * FROM users WHERE id = ?', [userId]);
    return formatUser(user);
  } catch (error) {
    console.error('Error getting user by ID:', error);
    return null;
  }
}

async function updateUserRole(userId, role) {
  try {
    const db = getDatabase();
    if (!db.isReady()) {
      await db.connect();
    }
    
    await db.run(`
      UPDATE users 
      SET role = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [role, userId]);
    
    const user = await db.get('SELECT * FROM users WHERE id = ?', [userId]);
    return formatUser(user);
  } catch (error) {
    console.error('Error updating user role:', error);
    return null;
  }
}

function getUserPermissions(user) {
  const rolePermissions = {
    customer: [
      'book_appointments',
      'view_own_appointments',
      'pay_for_services',
      'use_coupons'
    ],
    partner: [
      'view_referral_dashboard',
      'see_commission_earnings',
      'manage_coupon_performance'
    ],
    admin: [
      'full_system_access',
      'user_management',
      'partner_approval',
      'system_configuration',
      'book_appointments',
      'view_own_appointments',
      'pay_for_services',
      'use_coupons',
      'view_referral_dashboard',
      'see_commission_earnings',
      'manage_coupon_performance'
    ]
  };
  
  return rolePermissions[user.role] || [];
}

// Initialize with a default admin user if no users exist
async function initializeUsers() {
  try {
    const db = getDatabase();
    if (!db.isReady()) {
      await db.connect();
    }
    
    const userCount = await db.get('SELECT COUNT(*) as count FROM users');
    if (userCount.count === 0) {
      console.log('No users found, database migration should handle user creation');
      // Note: Database migration will create default users
      // OAuth users will be created when they first log in
    } else {
      console.log(`Found ${userCount.count} users in database`);
    }
  } catch (error) {
    console.error('Error initializing users:', error);
  }
}

module.exports = {
  findOrCreateUser,
  getUserByGoogleId,
  getUserById,
  updateUserRole,
  getUserPermissions,
  loadUsers,
  saveUsers,
  initializeUsers
};