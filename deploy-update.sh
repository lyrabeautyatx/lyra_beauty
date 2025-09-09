#!/bin/bash

# Quick deployment script for updating the application
# Run this on your local machine to deploy updates to EC2

INSTANCE_IP=$1
KEY_FILE="lyra-beauty-key.pem"

if [ -z "$INSTANCE_IP" ]; then
    echo "Usage: ./deploy-update.sh <INSTANCE_IP>"
    echo "Example: ./deploy-update.sh 54.123.45.67"
    exit 1
fi

echo "Deploying to $INSTANCE_IP..."

# Create deployment package (excluding node_modules and logs)
echo "Creating deployment package..."
tar --exclude='node_modules' --exclude='logs' --exclude='.git' --exclude='*.pem' -czf lyra-beauty.tar.gz .

# Copy to server
echo "Uploading files..."
scp -i $KEY_FILE lyra-beauty.tar.gz ec2-user@$INSTANCE_IP:/tmp/

# Deploy on server
echo "Deploying on server..."
ssh -i $KEY_FILE ec2-user@$INSTANCE_IP << 'EOF'
cd /opt/lyra-beauty
sudo tar -xzf /tmp/lyra-beauty.tar.gz
sudo chown -R ec2-user:ec2-user /opt/lyra-beauty
npm install --production
pm2 restart lyra-beauty
echo "Deployment complete!"
EOF

# Cleanup
rm lyra-beauty.tar.gz

echo "Update deployed successfully to $INSTANCE_IP!"
echo "Your app should be running at: http://$INSTANCE_IP"
