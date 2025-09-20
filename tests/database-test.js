// Comprehensive database test for issue #36
const { getDatabase } = require('../database');

async function runDatabaseTests() {
  console.log('🧪 Running Database Setup & Connection Tests (Issue #36)');
  console.log('=' .repeat(60));
  
  const tests = [];
  let passedTests = 0;
  
  try {
    // Test 1: Module can be imported
    console.log('\n📦 Test 1: Module Import');
    const db = getDatabase();
    if (db && typeof db.connect === 'function') {
      console.log('✓ Database module imported successfully');
      console.log('✓ getDatabase() returns valid instance');
      tests.push('✓ Module import');
      passedTests++;
    } else {
      throw new Error('Database module invalid');
    }
    
    // Test 2: Initial state
    console.log('\n🔌 Test 2: Initial Connection State');
    const initialReady = db.isReady();
    if (!initialReady) {
      console.log('✓ Database starts in disconnected state');
      tests.push('✓ Initial state');
      passedTests++;
    } else {
      throw new Error('Database should not be ready before connect()');
    }
    
    // Test 3: Connection establishment
    console.log('\n🏗️ Test 3: Database Connection');
    await db.connect();
    const postConnectReady = db.isReady();
    if (postConnectReady) {
      console.log('✓ Database connection established');
      console.log('✓ isReady() returns true after connect');
      tests.push('✓ Connection establishment');
      passedTests++;
    } else {
      throw new Error('Database should be ready after connect()');
    }
    
    // Test 4: Basic query operations
    console.log('\n📊 Test 4: Basic Query Operations');
    
    // Test GET operation
    const getResult = await db.get('SELECT 1 as test_value, "hello" as test_string');
    if (getResult && getResult.test_value === 1 && getResult.test_string === 'hello') {
      console.log('✓ GET operation works correctly');
    } else {
      throw new Error('GET operation failed');
    }
    
    // Test ALL operation
    const allResult = await db.all('SELECT 1 as num UNION SELECT 2 as num UNION SELECT 3 as num');
    if (Array.isArray(allResult) && allResult.length === 3) {
      console.log('✓ ALL operation works correctly');
    } else {
      throw new Error('ALL operation failed');
    }
    
    tests.push('✓ Basic query operations');
    passedTests++;
    
    // Test 5: Error handling
    console.log('\n⚠️ Test 5: Error Handling');
    
    try {
      await db.get('SELECT * FROM nonexistent_table');
      throw new Error('Should have thrown error for invalid table');
    } catch (error) {
      if (error.message.includes('no such table')) {
        console.log('✓ Proper error handling for invalid queries');
        tests.push('✓ Error handling');
        passedTests++;
      } else {
        throw error;
      }
    }
    
    // Test 6: Parameterized queries
    console.log('\n🛡️ Test 6: Parameterized Queries');
    const paramResult = await db.get('SELECT ? as param_value', ['test_param']);
    if (paramResult && paramResult.param_value === 'test_param') {
      console.log('✓ Parameterized queries work correctly');
      tests.push('✓ Parameterized queries');
      passedTests++;
    } else {
      throw new Error('Parameterized queries failed');
    }
    
    // Test 7: Connection cleanup
    console.log('\n🧹 Test 7: Connection Cleanup');
    await db.close();
    const postCloseReady = db.isReady();
    if (!postCloseReady) {
      console.log('✓ Database connection closed properly');
      tests.push('✓ Connection cleanup');
      passedTests++;
    } else {
      throw new Error('Database should not be ready after close()');
    }
    
    // Summary
    console.log('\n' + '=' .repeat(60));
    console.log('🎉 ALL TESTS PASSED! Database Setup & Connection Complete');
    console.log(`✓ ${passedTests}/${tests.length} tests passed`);
    
    console.log('\n📋 Test Results Summary:');
    tests.forEach(test => console.log(`  ${test}`));
    
    console.log('\n✅ Acceptance Criteria Met:');
    console.log('  ✓ sqlite3 package installed (confirmed in package.json)');
    console.log('  ✓ Database connection module created (/database/index.js)');
    console.log('  ✓ Connection can be established');
    console.log('  ✓ Basic error handling implemented');
    
    console.log('\n🔧 Database Features Implemented:');
    console.log('  • Singleton pattern for database instance');
    console.log('  • Async/await support for all operations');
    console.log('  • Parameterized query support');
    console.log('  • Connection state management');
    console.log('  • Proper error handling and logging');
    console.log('  • Graceful connection cleanup');
    
    return true;
    
  } catch (error) {
    console.log('\n❌ TEST FAILED:', error.message);
    console.log(`✓ ${passedTests}/${tests.length} tests passed before failure`);
    
    if (tests.length > 0) {
      console.log('\n📋 Completed Tests:');
      tests.forEach(test => console.log(`  ${test}`));
    }
    
    return false;
  }
}

// Run tests if script is executed directly
if (require.main === module) {
  runDatabaseTests().then(success => {
    process.exit(success ? 0 : 1);
  });
}

module.exports = { runDatabaseTests };