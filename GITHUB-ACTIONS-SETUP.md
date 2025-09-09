# GitHub Actions Deployment Setup

## Required GitHub Secrets

To enable automatic deployment, you need to add these secrets to your GitHub repository:

### 1. AWS Credentials
- `AWS_ACCESS_KEY_ID` - Your AWS access key
- `AWS_SECRET_ACCESS_KEY` - Your AWS secret key

### 2. EC2 Connection Details
- `EC2_SSH_KEY` - The contents of your `lyra-beauty-key.pem` file
- `EC2_HOST` - Your EC2 instance IP: `50.16.56.23`

## How to Add Secrets

1. Go to your GitHub repository: https://github.com/DSauthier/lyra_beauty
2. Navigate to **Settings** > **Secrets and variables** > **Actions**
3. Click **New repository secret** for each secret:

### AWS_ACCESS_KEY_ID
```
# Get your access key from AWS CLI profile
aws configure get aws_access_key_id --profile sauthier-solutions
```

### AWS_SECRET_ACCESS_KEY
```
# Get your secret key from AWS CLI profile
aws configure get aws_secret_access_key --profile sauthier-solutions
```

### EC2_SSH_KEY
```
# Copy the entire contents of your private key file
Get-Content lyra-beauty-key.pem | Out-String
```

### EC2_HOST
```
50.16.56.23
```

## Deployment Process

Once secrets are configured:

1. **Push code to main branch**:
   ```bash
   git add .
   git commit -m "Add GitHub Actions deployment"
   git push origin main
   ```

2. **Monitor deployment**:
   - Go to **Actions** tab in your GitHub repository
   - Watch the deployment progress
   - Check logs for any issues

3. **Access your app**:
   - http://50.16.56.23 (after successful deployment)

## Features

- ✅ Automatic deployment on push to main
- ✅ Environment setup (Node.js, PM2, Nginx)
- ✅ Application deployment and restart
- ✅ Nginx reverse proxy configuration
- ✅ PM2 process management
- ✅ Production environment variables

## Manual Deployment Trigger

You can also trigger deployment manually from the Actions tab in GitHub.

## Troubleshooting

If deployment fails:
1. Check the Actions logs in GitHub
2. Verify all secrets are correctly set
3. Ensure EC2 instance is running
4. Check security group allows SSH (port 22)
