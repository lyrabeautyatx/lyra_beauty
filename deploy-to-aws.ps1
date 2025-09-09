# PowerShell deployment script for Windows
param(
    [Parameter(Mandatory=$true)]
    [string]$InstanceIP
)

$KeyFile = "lyra-beauty-key.pem"

Write-Host "Deploying Lyra Beauty to $InstanceIP..." -ForegroundColor Green

# Create deployment package (excluding unnecessary files)
Write-Host "Creating deployment package..." -ForegroundColor Yellow
$ExcludeList = @("node_modules", "logs", ".git", "*.pem", "*.log")
Compress-Archive -Path "." -DestinationPath "lyra-beauty.zip" -Force

# Copy deployment package to server
Write-Host "Uploading files to server..." -ForegroundColor Yellow
& scp -i $KeyFile lyra-beauty.zip ec2-user@${InstanceIP}:/tmp/

# Deploy on server
Write-Host "Installing application on server..." -ForegroundColor Yellow
$deployScript = @"
cd /opt/lyra-beauty
sudo unzip -o /tmp/lyra-beauty.zip
sudo chown -R ec2-user:ec2-user /opt/lyra-beauty
mkdir -p logs
npm install --production
echo "PORT=3000
NODE_ENV=production
SESSION_SECRET=lyra_beauty_production_secret_$(date +%s)" > .env
pm2 start ecosystem.config.js
pm2 startup
pm2 save
sudo systemctl restart nginx
echo "Deployment complete!"
"@

$deployScript | & ssh -i $KeyFile ec2-user@$InstanceIP

# Cleanup
Remove-Item "lyra-beauty.zip" -Force

Write-Host "Deployment completed successfully!" -ForegroundColor Green
Write-Host "Your app is running at: http://$InstanceIP" -ForegroundColor Cyan
Write-Host "SSH access: ssh -i $KeyFile ec2-user@$InstanceIP" -ForegroundColor Cyan
