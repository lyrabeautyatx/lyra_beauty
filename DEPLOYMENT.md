# GitHub Actions Deployment Setup

## Overview

This repository uses GitHub Actions for automated deployment to AWS EC2. The deployment process automatically triggers when code is pushed to the main branch.

## Required GitHub Secrets

To enable automatic deployment, add these secrets to your GitHub repository:

### EC2 Connection Details
- `EC2_SSH_KEY` - The complete contents of your EC2 SSH private key file (e.g., lyra-beauty-key.pem)
- `EC2_HOST` - Your EC2 instance public IP address

## How to Add Secrets

1. Go to your GitHub repository: https://github.com/DSauthier/lyra_beauty
2. Navigate to **Settings** > **Secrets and variables** > **Actions**
3. Click **New repository secret** for each secret:

### EC2_SSH_KEY
Copy the entire contents of your private key file, including the header and footer:
```
-----BEGIN RSA PRIVATE KEY-----
[your key content here]
-----END RSA PRIVATE KEY-----
```

### EC2_HOST
Your EC2 instance public IP address (e.g., `18.214.100.40`)

## Deployment Process

The deployment automatically happens when you:

1. **Push code to main branch**:
   ```bash
   git add .
   git commit -m "Your commit message"
   git push origin main
   ```

2. **Monitor deployment**:
   - Go to **Actions** tab in your GitHub repository
   - Watch the deployment progress
   - Check logs for any issues

3. **Manual trigger**:
   - You can also trigger deployment manually from the Actions tab
   - Go to Actions > Deploy to AWS EC2 > Run workflow

## What the Deployment Does

1. **Checks out code** from the main branch
2. **Sets up Node.js 18** environment
3. **Installs dependencies** with `npm ci`
4. **Runs tests** (if any are defined)
5. **Creates deployment package** excluding unnecessary files
6. **Deploys to EC2** via SSH:
   - Backs up current version
   - Extracts new code
   - Installs production dependencies
   - Updates environment configuration
   - Restarts application with PM2

## Prerequisites on EC2

Your EC2 instance should have the following pre-installed:
- Node.js 18
- PM2 (Process Manager)
- Nginx (as reverse proxy)
- Application directory at `/opt/lyra-beauty`

Use the `setup-ec2.sh` script to prepare your EC2 instance.

## Troubleshooting

If deployment fails:

1. **Check Actions logs** in the GitHub Actions tab
2. **Verify secrets** are correctly set (especially SSH key format)
3. **Ensure EC2 instance is running** and accessible
4. **Check security group** allows SSH access (port 22)
5. **Verify SSH key permissions** on the EC2 instance

### Common Issues

- **SSH connection failed**: Check if the SSH key is complete and correctly formatted
- **Permission denied**: Ensure the key corresponds to the EC2 instance
- **Host unreachable**: Verify the EC2_HOST IP address is correct and the instance is running
