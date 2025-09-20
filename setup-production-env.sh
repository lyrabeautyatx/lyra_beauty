#!/bin/bash

# Secure Production Deployment Script
# This script sets up environment variables securely on your EC2 instance

echo "🔒 Setting up secure environment variables for Lyra Beauty..."

# Create secure .env file for production
cat > /home/ubuntu/lyra_beauty/.env << EOF
# Production Environment Configuration
NODE_ENV=production
PORT=3000

# Google OAuth Configuration
GOOGLE_CLIENT_ID=81434500494-boki5c9giv4nj7c8jes37dhob940m93i.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=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

# Square API Configuration (PRODUCTION)
# TODO: Replace with your PRODUCTION Square credentials
SQUARE_ACCESS_TOKEN=YOUR_PRODUCTION_SQUARE_ACCESS_TOKEN
SQUARE_APPLICATION_ID=YOUR_PRODUCTION_SQUARE_APPLICATION_ID
SQUARE_LOCATION_ID=YOUR_PRODUCTION_SQUARE_LOCATION_ID
SQUARE_WEBHOOK_SIGNATURE_KEY=YOUR_PRODUCTION_SQUARE_WEBHOOK_SIGNATURE_KEY
SQUARE_ENVIRONMENT=production

# Security Secrets
JWT_SECRET=lyra_beauty_production_jwt_secret_$(openssl rand -hex 32)
SESSION_SECRET=lyra_beauty_production_session_secret_$(openssl rand -hex 32)

# Database Configuration
DATABASE_PATH=/home/ubuntu/lyra_beauty/database/lyra_beauty.db

# AWS Configuration (if using S3 backups)
AWS_S3_BACKUP_BUCKET=lyra-beauty-backups
AWS_REGION=us-east-1
EOF

# Set secure permissions on .env file
chmod 600 /home/ubuntu/lyra_beauty/.env
chown ubuntu:ubuntu /home/ubuntu/lyra_beauty/.env

echo "✅ Environment variables configured securely"
echo "📝 Don't forget to update Square PRODUCTION credentials in .env"
echo "🔒 .env file permissions set to 600 (owner read/write only)"