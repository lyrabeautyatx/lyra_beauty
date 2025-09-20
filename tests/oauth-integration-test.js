const { getDatabase } = require('../database');
const userService = require('../services/user');

// Test Google OAuth integration with user registration
async function testGoogleOAuthIntegration() {
  console.log('🧪 Testing Google OAuth Integration...');
  
  try {
    // Initialize database
    const db = getDatabase();
    await db.connect();
    
    // Clear any existing test data
    await db.run('DELETE FROM users WHERE google_id LIKE ?', ['test_%']);
    console.log('✓ Test data cleared');
    
    // Test different OAuth scenarios
    const testProfiles = [
      {
        name: 'Complete Profile',
        profile: {
          id: 'test_google_complete_123',
          emails: [{ value: 'complete@test.com' }],
          name: {
            givenName: 'John',
            familyName: 'Doe'
          }
        }
      },
      {
        name: 'Minimal Profile',
        profile: {
          id: 'test_google_minimal_456',
          emails: [{ value: 'minimal@test.com' }],
          name: {
            givenName: 'Jane'
            // No family name
          }
        }
      },
      {
        name: 'No Email Profile',
        profile: {
          id: 'test_google_noemail_789',
          // No emails array
          name: {
            givenName: 'Bob',
            familyName: 'Smith'
          }
        }
      }
    ];
    
    const createdUsers = [];
    
    // Test each profile scenario
    for (const testCase of testProfiles) {
      console.log(`\n📝 Testing: ${testCase.name}`);
      
      const user = await userService.findOrCreateUser(testCase.profile);
      
      if (user && user.id) {
        console.log('✓ User created successfully');
        console.log(`  - ID: ${user.id}`);
        console.log(`  - Email: ${user.email}`);
        console.log(`  - Name: ${user.display_name}`);
        console.log(`  - Role: ${user.role}`);
        
        // Verify role is customer
        if (user.role !== 'customer') {
          throw new Error(`Expected role 'customer', got '${user.role}'`);
        }
        
        createdUsers.push(user);
      } else {
        throw new Error(`Failed to create user for ${testCase.name}`);
      }
    }
    
    // Test duplicate handling for each user
    console.log('\n👥 Testing duplicate user handling...');
    for (let i = 0; i < testProfiles.length; i++) {
      const testCase = testProfiles[i];
      const originalUser = createdUsers[i];
      
      console.log(`\n  Testing duplicate for: ${testCase.name}`);
      
      const duplicateUser = await userService.findOrCreateUser(testCase.profile);
      
      if (duplicateUser.id !== originalUser.id) {
        throw new Error(`Duplicate handling failed for ${testCase.name} - created new user instead of returning existing`);
      }
      
      console.log('  ✓ Returned existing user correctly');
    }
    
    // Test user data persistence
    console.log('\n💾 Testing data persistence...');
    for (const user of createdUsers) {
      const retrievedUser = await userService.getUserById(user.id);
      
      if (!retrievedUser || retrievedUser.id !== user.id) {
        throw new Error(`Failed to retrieve user with ID ${user.id}`);
      }
      
      console.log(`  ✓ User ${user.id} persisted correctly`);
    }
    
    // Test permissions for created users
    console.log('\n🔒 Testing permissions for all users...');
    for (const user of createdUsers) {
      const permissions = userService.getUserPermissions(user);
      
      if (!permissions.canBook || permissions.isAdmin || permissions.canPartner) {
        throw new Error(`Incorrect permissions for customer user ${user.id}`);
      }
      
      console.log(`  ✓ User ${user.id} has correct customer permissions`);
    }
    
    // Verify final user count
    const allUsers = await userService.loadUsers();
    const testUsers = allUsers.filter(u => u.google_id && u.google_id.startsWith('test_'));
    
    if (testUsers.length !== testProfiles.length) {
      throw new Error(`Expected ${testProfiles.length} test users, found ${testUsers.length}`);
    }
    
    console.log('\n🎉 Google OAuth Integration tests completed successfully!');
    console.log('\n📋 Summary:');
    console.log(`✅ Created ${createdUsers.length} users from different OAuth profiles`);
    console.log('✅ All users assigned default customer role');
    console.log('✅ Duplicate user handling works for all scenarios');
    console.log('✅ User data persisted correctly in database');
    console.log('✅ All users have correct permissions');
    
    // Clean up test data
    await db.run('DELETE FROM users WHERE google_id LIKE ?', ['test_%']);
    console.log('✓ Test data cleaned up');
    
    await db.close();
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

// Run the test if this file is executed directly
if (require.main === module) {
  testGoogleOAuthIntegration();
}

module.exports = { testGoogleOAuthIntegration };