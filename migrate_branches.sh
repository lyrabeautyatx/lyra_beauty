#!/bin/bash

# Branch Migration Script for Lyra Beauty Repository
# This script will help consolidate the dev branch into main and set main as default

echo "🔄 Lyra Beauty Branch Migration Script"
echo "======================================"
echo ""

# Check if we're in the right repository
if [ ! -f "package.json" ] || [ ! -f "server.js" ]; then
    echo "❌ Error: This doesn't appear to be the Lyra Beauty repository"
    echo "   Please run this script from the repository root directory"
    exit 1
fi

echo "📍 Current repository status:"
git remote -v
echo ""

echo "🔍 Current branches:"
git branch -a
echo ""

echo "📊 Checking branch differences..."
echo ""

# Get current branch
CURRENT_BRANCH=$(git branch --show-current)
echo "🌿 Currently on branch: $CURRENT_BRANCH"
echo ""

# Function to check if branch exists
branch_exists() {
    git show-ref --verify --quiet refs/heads/$1
}

# Function to check if remote branch exists
remote_branch_exists() {
    git show-ref --verify --quiet refs/remotes/origin/$1
}

echo "🎯 Migration Plan:"
echo "=================="
echo "1. Ensure we have the latest changes from both branches"
echo "2. Merge/update main with dev content (dev is newer and cleaner)"
echo "3. Set main as default branch (requires GitHub web interface)"
echo "4. Delete dev branch after verification"
echo ""

read -p "🚀 Do you want to proceed with the migration? (y/N): " CONFIRM

if [[ $CONFIRM != [yY] && $CONFIRM != [yY][eE][sS] ]]; then
    echo "❌ Migration cancelled by user"
    exit 0
fi

echo ""
echo "📥 Fetching latest changes..."
git fetch origin --all

echo ""
echo "🔄 Checking out main branch..."
git checkout main

echo ""
echo "📋 Current main branch status:"
git log --oneline -3
echo ""

echo "🔀 Merging dev branch into main..."
echo "   This will update main with the latest streamlined code from dev"
echo ""

# Attempt to merge dev into main
if git merge origin/dev --no-edit; then
    echo "✅ Successfully merged dev into main"
else
    echo "⚠️  Merge conflicts detected. Please resolve conflicts manually:"
    echo "   1. Resolve conflicts in the affected files"
    echo "   2. Run: git add ."
    echo "   3. Run: git commit"
    echo "   4. Run: git push origin main"
    echo "   5. Continue with the rest of the migration"
    exit 1
fi

echo ""
echo "📤 Pushing updated main branch..."
git push origin main

echo ""
echo "✅ Main branch has been updated with dev content!"
echo ""

echo "🔧 Next Steps (Manual Actions Required):"
echo "========================================"
echo ""
echo "1. 🌐 Change Default Branch in GitHub:"
echo "   - Go to: https://github.com/DSauthier/lyra_beauty/settings"
echo "   - Navigate to 'General' → 'Default branch'"
echo "   - Select 'main' from the dropdown"
echo "   - Click 'Update' and confirm"
echo ""

echo "2. 🗑️  Delete dev branch (after verification):"
echo "   - Verify main branch works correctly"
echo "   - Run: git push origin --delete dev"
echo "   - Run: git branch -d dev (delete local branch)"
echo ""

echo "3. 👥 Notify team members to update their local repositories:"
echo "   - git checkout main"
echo "   - git pull origin main"
echo "   - git branch -d dev"
echo ""

echo "4. ✅ Verify deployment still works:"
echo "   - Test GitHub Actions"
echo "   - Confirm application functionality"
echo "   - Check all integrations"
echo ""

echo "📁 Files removed from main (legacy complexity):"
echo "  - AWS-DEPLOYMENT.md, GITHUB-ACTIONS-SETUP.md, MANUAL-DEPLOYMENT.md"
echo "  - deploy-to-aws.ps1, deploy-update.sh, deploy.sh"
echo "  - CloudFormation templates and SSL setup scripts"
echo "  - database/ and tests/ folders"
echo ""

echo "📁 Files added/updated (streamlined version):"
echo "  - DEPLOYMENT.md (simplified guide)"
echo "  - INTEGRATION_GUIDE.md (OAuth + Square)"
echo "  - Updated README.md"
echo "  - Clean project structure"
echo ""

echo "🎉 Migration phase 1 complete!"
echo "   Remember to complete the manual steps above to finish the migration."