# GitHub Secrets Setup Guide

## 🔐 Required GitHub Repository Secrets

### How to Add Secrets:
1. Go to your repository: https://github.com/DSauthier/lyra_beauty
2. Click **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. Add each secret below:

### 🔑 Secrets to Add:

#### Google OAuth
```
Name: GOOGLE_CLIENT_ID
Value: 81434500494-boki5c9giv4nj7c8jes37dhob940m93i.apps.googleusercontent.com

Name: GOOGLE_CLIENT_SECRET  
Value: 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
```

#### Square API (Sandbox - for development/testing)
```
Name: SQUARE_ACCESS_TOKEN_DEV
Value: EAAAl0sZO_ZHkGLPh980DN3D0LiFwLZcI3u61JAMMJZD_-R9DScwMM8D1AFu61z8

Name: SQUARE_APPLICATION_ID_DEV
Value: sandbox-sq0idb-jk-22-dTJtSxqqJhkAl70g

Name: SQUARE_LOCATION_ID_DEV
Value: LGBD5R9WFWF2S

Name: SQUARE_WEBHOOK_SIGNATURE_KEY_DEV
Value: Mk93v-NN2J2etvTa3lQv-g
```

#### Square API (Production - get these from Square Dashboard Production tab)
```
Name: SQUARE_ACCESS_TOKEN_PROD
Value: YOUR_PRODUCTION_SQUARE_ACCESS_TOKEN

Name: SQUARE_APPLICATION_ID_PROD
Value: YOUR_PRODUCTION_SQUARE_APPLICATION_ID

Name: SQUARE_LOCATION_ID_PROD
Value: YOUR_PRODUCTION_SQUARE_LOCATION_ID

Name: SQUARE_WEBHOOK_SIGNATURE_KEY_PROD
Value: YOUR_PRODUCTION_SQUARE_WEBHOOK_SIGNATURE_KEY
```

#### Security Secrets
```
Name: JWT_SECRET_PROD
Value: lyra_beauty_production_jwt_secret_ultra_secure_2024

Name: SESSION_SECRET_PROD
Value: lyra_beauty_production_session_secret_ultra_secure_2024
```

#### AWS Credentials (for EC2 deployment)
```
Name: AWS_EC2_HOST
Value: your-ec2-instance-ip-or-domain

Name: AWS_EC2_USER
Value: ubuntu

Name: AWS_EC2_KEY
Value: [contents of your .pem file]
```

## 🚀 GitHub Actions Deployment Workflow

This will automatically deploy to your EC2 instance when you push to main:

```yaml
# .github/workflows/deploy.yml
name: Deploy to Production

on:
  push:
    branches: [ main ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Deploy to EC2
      uses: appleboy/ssh-action@v0.1.5
      with:
        host: ${{ secrets.AWS_EC2_HOST }}
        username: ${{ secrets.AWS_EC2_USER }}
        key: ${{ secrets.AWS_EC2_KEY }}
        script: |
          cd /home/ubuntu/lyra_beauty
          git pull origin main
          npm install --production
          
          # Create production .env
          cat > .env << EOF
          NODE_ENV=production
          PORT=3000
          GOOGLE_CLIENT_ID=${{ secrets.GOOGLE_CLIENT_ID }}
          GOOGLE_CLIENT_SECRET=${{ secrets.GOOGLE_CLIENT_SECRET }}
          SQUARE_ACCESS_TOKEN=${{ secrets.SQUARE_ACCESS_TOKEN_PROD }}
          SQUARE_APPLICATION_ID=${{ secrets.SQUARE_APPLICATION_ID_PROD }}
          SQUARE_LOCATION_ID=${{ secrets.SQUARE_LOCATION_ID_PROD }}
          SQUARE_WEBHOOK_SIGNATURE_KEY=${{ secrets.SQUARE_WEBHOOK_SIGNATURE_KEY_PROD }}
          SQUARE_ENVIRONMENT=production
          JWT_SECRET=${{ secrets.JWT_SECRET_PROD }}
          SESSION_SECRET=${{ secrets.SESSION_SECRET_PROD }}
          DATABASE_PATH=/home/ubuntu/lyra_beauty/lyra_beauty.db
          EOF
          
          chmod 600 .env
          pm2 restart lyra-beauty || pm2 start ecosystem.config.js --env production
```

## ✅ Security Benefits:
- ✅ Credentials never stored in repository
- ✅ Different secrets for development/production
- ✅ Automatic secure deployment
- ✅ Proper file permissions on server
- ✅ Environment-specific configuration