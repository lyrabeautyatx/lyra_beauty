#!/bin/bash

# SSL Certificate Setup Script - Run this after the basic setup is working
# This will add HTTPS support to your domain

echo "Setting up SSL certificate for lyrabeautyatx.com..."

# Install Certbot
sudo yum install -y python3-pip
sudo pip3 install certbot certbot-nginx

# Get SSL certificate from Let's Encrypt
sudo certbot --nginx -d lyrabeautyatx.com -d www.lyrabeautyatx.com --non-interactive --agree-tos --email your-email@example.com

# Test renewal
sudo certbot renew --dry-run

# Add cron job for auto-renewal
echo "0 12 * * * /usr/local/bin/certbot renew --quiet" | sudo crontab -

echo "✅ SSL certificate setup completed!"
echo "🔒 Your site is now available at: https://lyrabeautyatx.com"
