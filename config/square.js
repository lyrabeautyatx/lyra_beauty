const { SquareClient, SquareEnvironment } = require('square');

// Square client configuration
const squareConfig = {
  accessToken: process.env.SQUARE_ACCESS_TOKEN,
  environment: process.env.SQUARE_ENVIRONMENT === 'production' ? SquareEnvironment.Production : SquareEnvironment.Sandbox,
  locationId: process.env.SQUARE_LOCATION_ID,
  applicationId: process.env.SQUARE_APPLICATION_ID,
  webhookSignatureKey: process.env.SQUARE_WEBHOOK_SIGNATURE_KEY
};

// Initialize Square client
const client = new SquareClient({
  accessToken: squareConfig.accessToken,
  environment: squareConfig.environment
});

// Get API instances
const paymentsApi = client.paymentsApi;
const locationsApi = client.locationsApi;
const invoicesApi = client.invoicesApi;
const refundsApi = client.refundsApi;

module.exports = {
  client,
  paymentsApi,
  locationsApi,
  invoicesApi,
  refundsApi,
  squareConfig
};