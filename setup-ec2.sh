#!/bin/bash

# Manual EC2 Setup Script - Run this once on your EC2 instance
# ssh -i lyra-beauty-key.pem ec2-user@50.16.56.23
# Then copy and paste this script

echo "Setting up Lyra Beauty EC2 instance..."

# Update system
sudo yum update -y

# Install Node.js 18
curl -fsSL https://rpm.nodesource.com/setup_18.x | sudo bash -
sudo yum install -y nodejs

# Install PM2 globally
sudo npm install -g pm2

# Install and start Nginx
sudo amazon-linux-extras install nginx1 -y || sudo yum install -y nginx
sudo systemctl start nginx
sudo systemctl enable nginx

# Create application directory
sudo mkdir -p /opt/lyra-beauty
sudo chown ec2-user:ec2-user /opt/lyra-beauty

# Configure Nginx with domain
sudo tee /etc/nginx/conf.d/lyra-beauty.conf > /dev/null << 'EOF'
server {
    listen 80;
    server_name lyrabeautyatx.com www.lyrabeautyatx.com;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Security headers
        proxy_set_header X-Frame-Options DENY;
        proxy_set_header X-Content-Type-Options nosniff;
        proxy_set_header X-XSS-Protection "1; mode=block";
    }
}

# Redirect any other domains to main domain
server {
    listen 80 default_server;
    server_name _;
    return 301 http://lyrabeautyatx.com$request_uri;
}
EOF

# Remove default nginx config if it conflicts
sudo rm -f /etc/nginx/conf.d/default.conf

# Restart nginx
sudo systemctl restart nginx

# Setup PM2 startup script
pm2 startup systemd
sudo env PATH=$PATH:/usr/bin /usr/lib/node_modules/pm2/bin/pm2 startup systemd -u ec2-user --hp /home/ec2-user

echo "✅ EC2 setup completed!"
echo "Now you can use the simplified GitHub Actions deployment."
echo ""
echo "Test the setup by visiting: http://50.16.56.23"
echo ""
echo "Next steps:"
echo "1. Push your code to GitHub"
echo "2. The GitHub Actions will automatically deploy"
