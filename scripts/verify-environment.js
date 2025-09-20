#!/usr/bin/env node

/**
 * Environment Verification Script
 * Validates that all required environment variables are properly loaded
 * Used during deployment to ensure production configuration is correct
 */

require('dotenv').config();

const requiredVars = [
  'NODE_ENV',
  'PORT',
  'SESSION_SECRET',
  'JWT_SECRET',
  'GOOGLE_CLIENT_ID',
  'GOOGLE_CLIENT_SECRET'
];

const optionalVars = [
  'SQUARE_ACCESS_TOKEN',
  'SQUARE_APPLICATION_ID', 
  'SQUARE_LOCATION_ID',
  'SQUARE_WEBHOOK_SIGNATURE_KEY',
  'SQUARE_ENVIRONMENT',
  'DATABASE_PATH',
  'AWS_S3_BACKUP_BUCKET'
];

console.log('🔍 Environment Verification');
console.log('============================');

let hasErrors = false;

// Check required variables
console.log('\n📋 Required Variables:');
requiredVars.forEach(varName => {
  const value = process.env[varName];
  if (value) {
    // Mask sensitive values
    const displayValue = varName.includes('SECRET') || varName.includes('CLIENT_SECRET') 
      ? `${value.substring(0, 8)}...`
      : value;
    console.log(`✅ ${varName}: ${displayValue}`);
  } else {
    console.log(`❌ ${varName}: MISSING`);
    hasErrors = true;
  }
});

// Check optional variables
console.log('\n📝 Optional Variables:');
optionalVars.forEach(varName => {
  const value = process.env[varName];
  if (value) {
    const displayValue = varName.includes('TOKEN') || varName.includes('KEY')
      ? `${value.substring(0, 8)}...` 
      : value;
    console.log(`✅ ${varName}: ${displayValue}`);
  } else {
    console.log(`⚠️  ${varName}: Not set`);
  }
});

// Environment-specific checks
console.log('\n🌍 Environment-Specific Checks:');

if (process.env.NODE_ENV === 'production') {
  console.log('✅ Production environment detected');
  
  // Check production-specific requirements
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    console.log('❌ Google OAuth credentials missing in production');
    hasErrors = true;
  }
  
  if (process.env.SQUARE_ENVIRONMENT !== 'production') {
    console.log('⚠️  Square environment should be "production" in production');
  }
} else {
  console.log(`ℹ️  Environment: ${process.env.NODE_ENV || 'development'}`);
}

// Final result
console.log('\n🎯 Verification Result:');
if (hasErrors) {
  console.log('❌ Environment verification FAILED');
  console.log('Please check the missing variables and try again.');
  process.exit(1);
} else {
  console.log('✅ Environment verification PASSED');
  console.log('All required variables are properly configured.');
  process.exit(0);
}