# GitHub Actions Deployment Workflow

## Overview

This repository uses a single, optimized GitHub Actions workflow for automated deployment to production EC2.

## Workflow: `deploy.yml`

**Trigger:** Automatically runs on every push to `main` branch, or can be manually triggered.

**Process:**
1. **Code Checkout** - Pulls latest code from main branch
2. **Environment Setup** - Configures Node.js 18 with npm cache
3. **Dependency Installation** - Installs dependencies locally for validation
4. **Deployment** - Deploys to EC2 server via SSH

## Deployment Steps

The workflow performs the following on the target server:

1. **Pull Code**: Creates deployment package and uploads to `/opt/lyra-beauty`
2. **Install Dependencies**: Runs `npm install --only=production`
3. **Configure Environment**: Sets up production environment variables
4. **Start Application**: Uses PM2 with `ecosystem.config.js` configuration
5. **Verify**: Confirms application is running and accessible

## Required Secrets

Configure these in GitHub repository settings → Secrets and variables → Actions:

- `EC2_SSH_KEY` - Private SSH key for EC2 access
- `EC2_HOST` - EC2 instance IP address

## Features

✅ **Automated deployment** on push to main  
✅ **Zero-downtime deployment** with PM2 process management  
✅ **Backup creation** before each deployment  
✅ **Environment configuration** for production  
✅ **Deployment verification** with health checks  
✅ **Cleanup routines** to maintain server hygiene  

## File Structure

```
.github/
  workflows/
    deploy.yml          # Single production deployment workflow
```

## Manual Deployment

To trigger deployment manually:
1. Go to **Actions** tab in GitHub repository
2. Select **Deploy to Production** workflow
3. Click **Run workflow** → **Run workflow**

## Monitoring

After deployment, the application is available at:
- Primary: http://lyrabeautyatx.com
- Direct IP: http://[EC2_HOST]

Monitor application status:
```bash
pm2 status
pm2 logs lyra-beauty
```

## Troubleshooting

If deployment fails:
1. Check Actions logs in GitHub
2. Verify SSH connectivity: `ssh ec2-user@[EC2_HOST]`
3. Check PM2 status: `pm2 list`
4. Review application logs: `pm2 logs lyra-beauty`

## Previous Workflows Removed

The following redundant workflows were removed during optimization:
- `simple-deploy.yml` - Basic deployment (superseded)
- `deploy-ssm.yml` - SSM-based deployment (disabled)
- `deploy.yml` - Complex deployment (disabled)
- `test-ssh.yml` - SSH testing only (not needed)

## Migration Notes

This optimized workflow consolidates the best practices from previous deployment methods while maintaining:
- Reliability from `deploy-simple.yml`
- Error handling and logging
- PM2 ecosystem configuration
- Production environment setup