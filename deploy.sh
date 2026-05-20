#!/bin/bash

# ============================================================================
# DEPLOYMENT SCRIPT - Force Sync Local to Server
# ============================================================================

set -e  # Exit on error

echo "🚀 Starting deployment..."

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Configuration
SERVER_USER="gekanet"
SERVER_HOST="your-server-ip"  # Change this!
SERVER_PATH="/var/www/magnific-kling"
PM2_APP_NAME="magnific-kling"

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if server details are configured
if [ "$SERVER_HOST" = "your-server-ip" ]; then
    print_error "Please configure SERVER_HOST in deploy.sh"
    exit 1
fi

# Step 1: Commit local changes
print_status "Checking for local changes..."
if [[ -n $(git status -s) ]]; then
    print_status "Found uncommitted changes. Committing..."
    git add .
    git commit -m "deploy: Auto-commit before deployment $(date '+%Y-%m-%d %H:%M:%S')"
    print_success "Changes committed"
else
    print_status "No local changes to commit"
fi

# Step 2: Push to git
print_status "Pushing to git repository..."
git push origin master
print_success "Pushed to git"

# Step 3: Deploy to server
print_status "Deploying to server..."

ssh ${SERVER_USER}@${SERVER_HOST} << 'ENDSSH'
    set -e
    
    echo "📦 Navigating to project directory..."
    cd /var/www/magnific-kling
    
    echo "🔄 Fetching latest changes..."
    git fetch origin
    
    echo "🔨 Force reset to match origin/master..."
    git reset --hard origin/master
    
    echo "🧹 Cleaning untracked files..."
    git clean -fd
    
    echo "📋 Verifying files..."
    ls -la public/
    
    echo "🔄 Restarting PM2..."
    pm2 restart magnific-kling
    
    echo "✅ Deployment complete!"
ENDSSH

print_success "Deployment completed successfully!"

# Step 4: Verify deployment
print_status "Verifying deployment..."
sleep 3

# Test the endpoint
if curl -s https://magnific.he3x.my.id | grep -q "AI Motion Video Generator"; then
    print_success "Server is responding correctly!"
else
    print_error "Server verification failed!"
    exit 1
fi

print_success "🎉 Deployment successful! Server is now in sync with local."