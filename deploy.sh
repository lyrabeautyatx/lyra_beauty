#!/bin/bash

# Lyra Beauty Deployment Script for EC2
# This script sets up the Node.js application on Amazon Linux 2

# Update system
sudo yum update -y

# Install Node.js and npm
curl -fsSL https://rpm.nodesource.com/setup_18.x | sudo bash -
sudo yum install -y nodejs

# Install PM2 for process management
sudo npm install -g pm2

# Create application directory
sudo mkdir -p /opt/lyra-beauty
sudo chown ec2-user:ec2-user /opt/lyra-beauty

# Copy application files (this will be done via deployment)
cd /opt/lyra-beauty

# Install dependencies
npm install

# Create environment file (using sandbox for testing)
cat > .env << EOF
PORT=3000
NODE_ENV=production
# Square API Configuration (Sandbox for testing)
SQUARE_ACCESS_TOKEN=EAAAl0sZO_ZHkGLPh980DN3D0LiFwLZcI3u61JAMMJZD_-R9DScwMM8D1AFu61z8
SQUARE_APPLICATION_ID=sandbox-sq0idb-jk-22-dTJtSxqqJhkAl70g
SQUARE_LOCATION_ID=LGBD5R9WFWF2S
SQUARE_WEBHOOK_SIGNATURE_KEY=Mk93v-NN2J2etvTa3lQv-g
SQUARE_ENVIRONMENT=sandbox
# Add other required environment variables
GOOGLE_CLIENT_ID=your_google_client_id_here
GOOGLE_CLIENT_SECRET=your_google_client_secret_here
JWT_SECRET=your_jwt_secret_here
SESSION_SECRET=your_session_secret_here
DATABASE_PATH=./lyra_beauty.db
EOF

# Start application with PM2
pm2 start server.js --name lyra-beauty
pm2 startup
pm2 save

# Install and configure nginx as reverse proxy
sudo amazon-linux-extras install nginx1 -y
sudo systemctl start nginx
sudo systemctl enable nginx

# Configure nginx
sudo tee /etc/nginx/conf.d/lyra-beauty.conf > /dev/null << EOF
server {
    listen 80;
    server_name _;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }
}
EOF

# Restart nginx
sudo systemctl restart nginx

echo "Deployment complete! Application should be running on port 80"
