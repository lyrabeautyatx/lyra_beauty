#!/bin/bash

# Quick Fix Script for Lyra Beauty 503 Error
# Run this on your EC2 server to attempt common fixes

echo "🔧 Lyra Beauty Quick Fix Script"
echo "==============================="

# Navigate to application directory
cd /opt/lyra-beauty 2>/dev/null || {
    echo "❌ Application directory not found at /opt/lyra-beauty"
    exit 1
}

echo "📁 Working in: $(pwd)"

# 1. Stop and remove existing PM2 process
echo ""
echo "1️⃣ Cleaning up existing PM2 process..."
pm2 stop lyra-beauty 2>/dev/null || echo "No existing process to stop"
pm2 delete lyra-beauty 2>/dev/null || echo "No existing process to delete"

# 2. Verify environment file
echo ""
echo "2️⃣ Checking environment configuration..."
if [ ! -f ".env" ]; then
    echo "❌ .env file missing! Creating from deployment..."
    
    # Recreate .env file with basic configuration
    cat > .env << 'EOF'
NODE_ENV=production
PORT=3000
SESSION_SECRET=lyra_beauty_production_session_secret_ultra_secure_2024
JWT_SECRET=lyra_beauty_production_jwt_secret_ultra_secure_2024
GOOGLE_CLIENT_ID=81434500494-boki5c9giv4nj7c8jes37dhob940m93i.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=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
SQUARE_ACCESS_TOKEN=EAAAl0sZO_ZHkGLPh980DN3D0LiFwLZcI3u61JAMMJZD_-R9DScwMM8D1AFu61z8
SQUARE_APPLICATION_ID=sandbox-sq0idb-jk-22-dTJtSxqqJhkAl70g
SQUARE_LOCATION_ID=LGBD5R9WFWF2S
SQUARE_WEBHOOK_SIGNATURE_KEY=Mk93v-NN2J2etvTa3lQv-g
SQUARE_ENVIRONMENT=sandbox
DATABASE_PATH=./lyra_beauty.db
AWS_S3_BACKUP_BUCKET=lyra-beauty-backups
EOF
    chmod 600 .env
    echo "✅ Created .env file"
else
    echo "✅ .env file exists"
fi

# 3. Ensure required files exist
echo ""
echo "3️⃣ Checking required files..."
required_files=("server.js" "package.json")
for file in "${required_files[@]}"; do
    if [ -f "$file" ]; then
        echo "✅ $file exists"
    else
        echo "❌ $file missing!"
    fi
done

# 4. Install dependencies if needed
echo ""
echo "4️⃣ Checking dependencies..."
if [ ! -d "node_modules" ] || [ ! -f "node_modules/.package-lock.json" ]; then
    echo "📦 Installing dependencies..."
    npm install --production --no-audit
else
    echo "✅ Dependencies appear to be installed"
fi

# 5. Create ecosystem config if missing
echo ""
echo "5️⃣ Checking PM2 ecosystem configuration..."
if [ ! -f "ecosystem.config.js" ]; then
    echo "Creating ecosystem.config.js..."
    cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'lyra-beauty',
    script: 'server.js',
    instances: 1,
    exec_mode: 'fork',
    env: {
      NODE_ENV: 'development',
      PORT: 3000
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true,
    max_memory_restart: '1G',
    restart_delay: 5000,
    watch: false
  }]
};
EOF
    echo "✅ Created ecosystem.config.js"
else
    echo "✅ ecosystem.config.js exists"
fi

# 6. Create logs directory
echo ""
echo "6️⃣ Setting up logs directory..."
mkdir -p logs
echo "✅ Logs directory ready"

# 7. Test the application can start
echo ""
echo "7️⃣ Testing application startup..."
echo "Starting application with PM2..."

# Start with ecosystem config
pm2 start ecosystem.config.js --env production

# Wait a moment for startup
sleep 3

# Check status
echo ""
echo "8️⃣ Checking application status..."
pm2 list
pm2 save

# Test if it's responding
echo ""
echo "9️⃣ Testing local connectivity..."
sleep 2
if curl -s -I http://localhost:3000 >/dev/null 2>&1; then
    echo "✅ Application is responding locally!"
    echo "🌐 Testing response:"
    curl -s -I http://localhost:3000 | head -3
else
    echo "❌ Application not responding. Checking logs..."
    pm2 logs lyra-beauty --lines 10 --nostream
fi

# 10. Check nginx
echo ""
echo "🔟 Checking nginx status..."
if command -v nginx >/dev/null 2>&1; then
    if ! systemctl is-active --quiet nginx; then
        echo "Starting nginx..."
        sudo systemctl start nginx
        sudo systemctl enable nginx
    fi
    
    if systemctl is-active --quiet nginx; then
        echo "✅ Nginx is running"
    else
        echo "❌ Failed to start nginx"
    fi
else
    echo "⚠️  Nginx not installed - you may need to set up a reverse proxy"
fi

echo ""
echo "🎯 Fix Summary:"
echo "==============="
pm2_status=$(pm2 list | grep lyra-beauty | grep -o 'online\|stopped\|errored' | head -1)
if [[ "$pm2_status" == "online" ]]; then
    echo "✅ Application is now running!"
    echo "🌐 Try accessing: https://lyrabeautyatx.com"
    echo "📊 Monitor with: pm2 monit"
    echo "📝 View logs with: pm2 logs lyra-beauty"
else
    echo "❌ Application still not running properly"
    echo "🔍 Check logs: pm2 logs lyra-beauty"
    echo "🔄 Try manual start: pm2 start server.js --name lyra-beauty"
fi