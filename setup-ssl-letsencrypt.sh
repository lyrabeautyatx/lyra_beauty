#!/bin/bash

# SSL Certificate Setup Script using Let's Encrypt
# Run this on your EC2 instance after the app is deployed

echo "🔒 Setting up SSL certificate for lyrabeautyatx.com..."

# Install Certbot and nginx plugin
sudo yum update -y
sudo yum install -y python3-pip
sudo pip3 install certbot certbot-nginx

# Stop nginx temporarily
sudo systemctl stop nginx

# Get SSL certificate from Let's Encrypt
sudo certbot certonly --standalone -d lyrabeautyatx.com -d www.lyrabeautyatx.com --non-interactive --agree-tos --email your-email@example.com

# Update Nginx configuration with SSL
sudo tee /etc/nginx/conf.d/lyra-beauty.conf > /dev/null << 'EOF'
# Redirect HTTP to HTTPS
server {
    listen 80;
    server_name lyrabeautyatx.com www.lyrabeautyatx.com;
    return 301 https://$server_name$request_uri;
}

# HTTPS server
server {
    listen 443 ssl http2;
    server_name lyrabeautyatx.com www.lyrabeautyatx.com;
    
    # SSL configuration
    ssl_certificate /etc/letsencrypt/live/lyrabeautyatx.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/lyrabeautyatx.com/privkey.pem;
    
    # SSL settings
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;
    
    # Security headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options DENY always;
    add_header X-Content-Type-Options nosniff always;
    add_header X-XSS-Protection "1; mode=block" always;
    
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
    }
}
EOF

# Test nginx configuration
sudo nginx -t

# Start nginx
sudo systemctl start nginx
sudo systemctl enable nginx

# Setup automatic certificate renewal
echo "0 12 * * * /usr/local/bin/certbot renew --quiet && systemctl reload nginx" | sudo crontab -

echo "✅ SSL certificate setup completed!"
echo "🔒 Your site is now available at: https://lyrabeautyatx.com"

# Test the certificate
echo "Testing certificate..."
sudo certbot certificates
