#!/bin/bash

# Server Diagnostic Script for Lyra Beauty
# Run this on your EC2 server to diagnose the 503 error

echo "🔍 Lyra Beauty Server Diagnostics"
echo "================================="

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Not in application directory. Trying /opt/lyra-beauty..."
    cd /opt/lyra-beauty 2>/dev/null || {
        echo "❌ Application directory not found!"
        echo "Please run this script from /opt/lyra-beauty"
        exit 1
    }
fi

echo "📁 Current directory: $(pwd)"

# 1. Check PM2 status
echo ""
echo "1️⃣ PM2 Application Status:"
echo "-------------------------"
pm2 list
echo ""
pm2 show lyra-beauty 2>/dev/null || echo "⚠️  PM2 process 'lyra-beauty' not found"

# 2. Check if application is listening on port
echo ""
echo "2️⃣ Port Status:"
echo "---------------"
echo "Checking if application is listening on port 3000..."
if netstat -tlnp 2>/dev/null | grep -q ":3000 "; then
    echo "✅ Something is listening on port 3000:"
    netstat -tlnp 2>/dev/null | grep ":3000 "
else
    echo "❌ Nothing is listening on port 3000"
fi

# 3. Check recent PM2 logs
echo ""
echo "3️⃣ Recent Application Logs:"
echo "---------------------------"
pm2 logs lyra-beauty --lines 20 --nostream 2>/dev/null || echo "⚠️  No PM2 logs available"

# 4. Check environment file
echo ""
echo "4️⃣ Environment Configuration:"
echo "-----------------------------"
if [ -f ".env" ]; then
    echo "✅ .env file exists"
    echo "Environment variables configured:"
    echo "  - NODE_ENV: $(grep NODE_ENV .env | cut -d'=' -f2)"
    echo "  - PORT: $(grep PORT .env | cut -d'=' -f2)"
    echo "  - SQUARE_ENVIRONMENT: $(grep SQUARE_ENVIRONMENT .env | cut -d'=' -f2)"
    echo "  - Google OAuth configured: $(grep -q GOOGLE_CLIENT_ID .env && echo 'Yes' || echo 'No')"
else
    echo "❌ .env file not found!"
fi

# 5. Check Node.js and npm versions
echo ""
echo "5️⃣ System Information:"
echo "----------------------"
echo "Node.js version: $(node --version)"
echo "NPM version: $(npm --version)"
echo "PM2 version: $(pm2 --version)"

# 6. Check if main server file exists
echo ""
echo "6️⃣ Application Files:"
echo "---------------------"
if [ -f "server.js" ]; then
    echo "✅ server.js exists"
else
    echo "❌ server.js not found!"
fi

if [ -f "ecosystem.config.js" ]; then
    echo "✅ ecosystem.config.js exists"
else
    echo "❌ ecosystem.config.js not found!"
fi

# 7. Check nginx status
echo ""
echo "7️⃣ Nginx Status:"
echo "----------------"
if command -v nginx >/dev/null 2>&1; then
    if systemctl is-active --quiet nginx; then
        echo "✅ Nginx is running"
        
        # Check nginx configuration
        if [ -f "/etc/nginx/conf.d/lyra-beauty.conf" ]; then
            echo "✅ Lyra Beauty nginx config exists"
        else
            echo "⚠️  Lyra Beauty nginx config not found"
        fi
    else
        echo "❌ Nginx is not running"
    fi
else
    echo "⚠️  Nginx is not installed"
fi

# 8. Test local application connectivity
echo ""
echo "8️⃣ Local Connectivity Test:"
echo "---------------------------"
echo "Testing localhost:3000..."
if curl -s -I http://localhost:3000 >/dev/null 2>&1; then
    echo "✅ Application responds locally"
    curl -s -I http://localhost:3000 | head -1
else
    echo "❌ Application not responding locally"
fi

# 9. Suggested actions
echo ""
echo "🔧 Suggested Actions:"
echo "--------------------"

pm2_status=$(pm2 list | grep lyra-beauty | awk '{print $10}' | tr -d '│')
if [[ "$pm2_status" != "online" ]]; then
    echo "1. Restart the application: pm2 restart lyra-beauty"
    echo "2. If that fails, try: pm2 start ecosystem.config.js"
fi

if ! netstat -tlnp 2>/dev/null | grep -q ":3000 "; then
    echo "3. Check if the application is binding to the correct port"
    echo "4. Verify environment variables are loaded correctly"
fi

if ! systemctl is-active --quiet nginx 2>/dev/null; then
    echo "5. Start nginx: sudo systemctl start nginx"
fi

echo ""
echo "📝 For detailed logs, run: pm2 logs lyra-beauty"
echo "🔄 To restart application: pm2 restart lyra-beauty"
echo "🆘 If still having issues, check: pm2 monit"