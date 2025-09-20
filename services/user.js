const fs = require('fs');
const path = require('path');

const usersFile = path.join(__dirname, '..', 'users.json');

function loadUsers() {
  try {
    if (fs.existsSync(usersFile)) {
      const data = fs.readFileSync(usersFile, 'utf8');
      return JSON.parse(data);
    }
    return [];
  } catch (error) {
    console.error('Error loading users:', error);
    return [];
  }
}

function saveUsers(users) {
  try {
    fs.writeFileSync(usersFile, JSON.stringify(users, null, 2));
  } catch (error) {
    console.error('Error saving users:', error);
  }
}

function findOrCreateUser(profile) {
  const users = loadUsers();
  
  // Check if user already exists by Google ID
  let user = users.find(u => u.google_id === profile.id);
  
  if (!user) {
    // Create new user with default customer role
    user = {
      id: Date.now().toString(),
      google_id: profile.id,
      email: profile.emails?.[0]?.value || '',
      first_name: profile.name?.givenName || '',
      last_name: profile.name?.familyName || '',
      display_name: profile.displayName || '',
      role: 'customer',
      partner_status: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    users.push(user);
    saveUsers(users);
  } else {
    // Update existing user info if needed
    user.email = profile.emails?.[0]?.value || user.email;
    user.first_name = profile.name?.givenName || user.first_name;
    user.last_name = profile.name?.familyName || user.last_name;
    user.display_name = profile.displayName || user.display_name;
    user.updated_at = new Date().toISOString();
    
    saveUsers(users);
  }
  
  return user;
}

function getUserByGoogleId(googleId) {
  const users = loadUsers();
  return users.find(u => u.google_id === googleId);
}

function getUserById(userId) {
  const users = loadUsers();
  return users.find(u => u.id === userId);
}

function updateUserRole(userId, role) {
  const users = loadUsers();
  const userIndex = users.findIndex(u => u.id === userId);
  
  if (userIndex !== -1) {
    users[userIndex].role = role;
    users[userIndex].updated_at = new Date().toISOString();
    saveUsers(users);
    return users[userIndex];
  }
  
  return null;
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
function initializeUsers() {
  const users = loadUsers();
  if (users.length === 0) {
    console.log('No users found, creating default admin user entry...');
    // Note: This admin user will need to log in via Google OAuth first
    // and then be manually promoted to admin role
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