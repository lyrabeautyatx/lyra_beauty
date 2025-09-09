# Lyra Beauty AWS Deployment Guide

This guide will help you deploy the Lyra Beauty app to AWS EC2 free tier for the lowest cost.

## Option 1: Quick Deploy with CloudFormation (Recommended)

1. **Create EC2 Key Pair** (if you don't have one):
   ```powershell
   aws ec2 create-key-pair --key-name lyra-beauty-key --query 'KeyMaterial' --output text --profile sauthier-solutions > lyra-beauty-key.pem
   ```

2. **Deploy Infrastructure**:
   ```powershell
   aws cloudformation create-stack --stack-name lyra-beauty-stack --template-body file://cloudformation-template.json --parameters ParameterKey=KeyName,ParameterValue=lyra-beauty-key --region us-east-1 --profile sauthier-solutions
   ```

3. **Wait for deployment to complete** (5-10 minutes):
   ```powershell
   aws cloudformation wait stack-create-complete --stack-name lyra-beauty-stack --region us-east-1 --profile sauthier-solutions
   ```

4. **Get the instance details**:
   ```powershell
   aws cloudformation describe-stacks --stack-name lyra-beauty-stack --query 'Stacks[0].Outputs' --region us-east-1 --profile sauthier-solutions
   ```

## Option 2: Manual EC2 Deployment

### Step 1: Launch EC2 Instance
```powershell
# Create security group
aws ec2 create-security-group --group-name lyra-beauty-sg --description "Lyra Beauty Security Group" --region us-east-1 --profile sauthier-solutions

# Add rules to security group
aws ec2 authorize-security-group-ingress --group-name lyra-beauty-sg --protocol tcp --port 80 --cidr 0.0.0.0/0 --region us-east-1 --profile sauthier-solutions
aws ec2 authorize-security-group-ingress --group-name lyra-beauty-sg --protocol tcp --port 22 --cidr 0.0.0.0/0 --region us-east-1 --profile sauthier-solutions

# Launch instance (Amazon Linux 2, t2.micro - free tier)
aws ec2 run-instances --image-id ami-0c02fb55956c7d316 --count 1 --instance-type t2.micro --key-name lyra-beauty-key --security-groups lyra-beauty-sg --region us-east-1 --profile sauthier-solutions
```

### Step 2: Deploy Application

1. **SSH into your instance**:
   ```powershell
   ssh -i lyra-beauty-key.pem ec2-user@YOUR_INSTANCE_PUBLIC_IP
   ```

2. **Copy your application** (run on your local machine):
   ```powershell
   scp -i lyra-beauty-key.pem -r . ec2-user@YOUR_INSTANCE_PUBLIC_IP:/opt/lyra-beauty/
   ```

3. **Run deployment script** (on the EC2 instance):
   ```bash
   cd /opt/lyra-beauty
   chmod +x deploy.sh
   ./deploy.sh
   ```

## Cost Optimization

### Free Tier Benefits (12 months):
- **EC2 t2.micro**: 750 hours/month (1 instance running 24/7)
- **EBS Storage**: 30 GB General Purpose SSD
- **Data Transfer**: 15 GB out per month

### Monthly Costs After Free Tier:
- **t2.micro**: ~$8.50/month
- **30 GB EBS**: ~$3.00/month
- **Total**: ~$11.50/month

### Cost Optimization Tips:
1. Use **t2.micro** only (free tier eligible)
2. Stop instance when not in use for testing
3. Use **Amazon Linux 2** (no licensing fees)
4. Monitor data transfer usage

## Production Checklist

- [ ] Update session secret in production
- [ ] Configure HTTPS with Let's Encrypt
- [ ] Set up CloudWatch monitoring
- [ ] Configure automated backups
- [ ] Update Square credentials for production
- [ ] Set up domain name (Route 53)
- [ ] Configure log rotation

## Monitoring & Maintenance

### Check application status:
```bash
pm2 status
pm2 logs lyra-beauty
```

### Update application:
```bash
cd /opt/lyra-beauty
git pull origin main
npm install
pm2 restart lyra-beauty
```

### Monitor system resources:
```bash
htop
df -h
free -m
```
