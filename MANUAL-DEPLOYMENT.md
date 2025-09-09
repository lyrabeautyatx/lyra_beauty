Deploying Lyra Beauty to AWS EC2 - Manual Steps

Since we're having SSH key format issues with Windows SSH, here's the manual deployment approach:

## Current Instance Details:
- **Instance ID**: i-030a2130bdda17c8e
- **Public IP**: 50.16.56.23
- **Public DNS**: ec2-50-16-56-23.compute-1.amazonaws.com

## Option 1: Use AWS Systems Manager Session Manager (No SSH needed)

1. **Connect via AWS Console**:
   - Go to EC2 Console: https://console.aws.amazon.com/ec2/
   - Select your instance (i-030a2130bdda17c8e)
   - Click "Connect" → "Session Manager" → "Connect"

2. **Once connected, run these commands**:
   ```bash
   # Switch to ec2-user
   sudo su - ec2-user
   
   # Create application directory
   sudo mkdir -p /opt/lyra-beauty
   sudo chown ec2-user:ec2-user /opt/lyra-beauty
   
   # Install git and clone your repository (if you push to GitHub)
   sudo yum install -y git
   cd /opt/lyra-beauty
   
   # Or upload files manually (we'll do this next)
   ```

## Option 2: Manual File Upload via AWS Console

1. **Zip your project files** (exclude node_modules, .git, *.pem):
   - Create a zip file with: server.js, views/, public/, package.json, deploy.sh, ecosystem.config.js

2. **Upload via EC2 User Data** or **copy-paste the files**

Let me create the deployment commands for you to run in the AWS Session Manager...
