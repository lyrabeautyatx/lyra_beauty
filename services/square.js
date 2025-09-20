const { SquareClient, SquareEnvironment } = require('square');
const crypto = require('crypto');

// Load environment variables
require('dotenv').config();

// Initialize Square client based on environment
const environment = process.env.SQUARE_ENVIRONMENT === 'production' 
  ? SquareEnvironment.Production 
  : SquareEnvironment.Sandbox;

const squareClient = new SquareClient({
  accessToken: process.env.SQUARE_ACCESS_TOKEN,
  environment: environment
});

// Get API instances
const paymentsApi = squareClient.payments;
const ordersApi = squareClient.orders;
const invoicesApi = squareClient.invoices;
const locationsApi = squareClient.locations;

/**
 * Test Square API connection
 * @returns {Promise<Object>} Connection test results
 */
async function testConnection() {
  try {
    console.log('🔄 Testing Square API connection...');
    
    // Test by getting locations
    const response = await locationsApi.list();
    
    if (response.result.locations && response.result.locations.length > 0) {
      const location = response.result.locations[0];
      console.log('✅ Square API connection successful!');
      console.log(`📍 Connected to location: ${location.name} (${location.id})`);
      console.log(`🌍 Environment: ${environment}`);
      
      return {
        success: true,
        environment: environment,
        location: {
          id: location.id,
          name: location.name,
          status: location.status
        }
      };
    } else {
      console.log('⚠️ No locations found - check your Square account setup');
      return {
        success: false,
        error: 'No locations found'
      };
    }
  } catch (error) {
    console.error('❌ Square API connection failed:', error.message);
    
    // Check if it's a credential issue (expected with dummy credentials)
    if (error.message.includes('fetch failed') || error.message.includes('Unauthorized') || error.message.includes('401')) {
      return {
        success: false,
        error: 'Invalid credentials (expected with example values)',
        needsCredentials: true
      };
    }
    
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Verify Square webhook signature
 * @param {string} body - Raw request body
 * @param {string} signature - X-Square-Signature header
 * @returns {boolean} True if signature is valid
 */
function verifyWebhookSignature(body, signature) {
  if (!process.env.SQUARE_WEBHOOK_SIGNATURE_KEY) {
    console.warn('⚠️ SQUARE_WEBHOOK_SIGNATURE_KEY not set - webhook verification disabled');
    return true; // Allow webhooks if signature key not configured (for development)
  }
  
  try {
    const hmac = crypto.createHmac('sha256', process.env.SQUARE_WEBHOOK_SIGNATURE_KEY);
    hmac.update(body);
    const expectedSignature = hmac.digest('base64');
    
    return signature === expectedSignature;
  } catch (error) {
    console.error('Signature verification error:', error);
    return false;
  }
}

/**
 * Get Square configuration for frontend
 * @returns {Object} Configuration object for Square Web Payments SDK
 */
function getSquareConfig() {
  return {
    applicationId: process.env.SQUARE_APPLICATION_ID,
    locationId: process.env.SQUARE_LOCATION_ID,
    environment: environment === SquareEnvironment.Production ? 'production' : 'sandbox'
  };
}

module.exports = {
  squareClient,
  paymentsApi,
  ordersApi,
  invoicesApi,
  locationsApi,
  testConnection,
  verifyWebhookSignature,
  getSquareConfig,
  environment
};