# Branch Migration Guide: Making Main the Default Branch

## Current Situation
- **Dev branch** (`de233753`) is currently the default branch and contains the latest, streamlined codebase
- **Main branch** (`ee82c1ce`) contains older deployment complexity with deprecated files
- **Goal**: Make main the default branch and delete dev branch

## Analysis of Branch Differences

### Dev Branch (Current Default - Latest)
- Streamlined deployment with single `DEPLOYMENT.md`
- Modern OAuth + Square integration documented in `INTEGRATION_GUIDE.md`
- Clean file structure without legacy deployment scripts
- Latest features and improvements

### Main Branch (Target Default - Outdated)
- Multiple deployment files: `AWS-DEPLOYMENT.md`, `GITHUB-ACTIONS-SETUP.md`, `MANUAL-DEPLOYMENT.md`
- Legacy deployment scripts: `deploy-to-aws.ps1`, `deploy-update.sh`, `deploy.sh`
- CloudFormation templates and Route53 configurations
- Additional folders: `database/`, `tests/`
- Older codebase that was streamlined in dev

## Required Actions

### Step 1: Update Main Branch with Dev Content

The main branch needs to be updated to match the dev branch content. Choose one of these approaches:

#### Option A: Fast-forward merge (Recommended if main has no unique commits)
```bash
git checkout main
git merge dev --ff-only
git push origin main
```

#### Option B: Hard reset main to dev (Use if main diverged significantly)
```bash
git checkout main
git reset --hard dev
git push origin main --force
```

#### Option C: Manual merge (Safest for review)
```bash
git checkout main
git merge dev
# Resolve any conflicts manually
git push origin main
```

### Step 2: Change Default Branch in GitHub

1. Go to repository Settings: https://github.com/DSauthier/lyra_beauty/settings
2. Navigate to "General" → "Default branch"
3. Click the branch selector and choose "main"
4. Click "Update" and confirm the change

### Step 3: Delete Dev Branch

**After verifying main branch has all content:**

```bash
# Delete local dev branch
git branch -d dev

# Delete remote dev branch
git push origin --delete dev
```

### Step 4: Update GitHub Actions and Documentation

Update any references to the dev branch in:
- `.github/workflows/` files (if they reference dev)
- Documentation files that mention branch structure
- Any deployment scripts that might reference dev branch

## Files That Will Be Removed from Main

When updating main with dev content, these legacy files will be removed:
- `AWS-DEPLOYMENT.md`
- `GITHUB-ACTIONS-SETUP.md` 
- `MANUAL-DEPLOYMENT.md`
- `PAYMENT_IMPLEMENTATION.md`
- `deploy-to-aws.ps1`
- `deploy-update.sh`
- `deploy.sh`
- `cloudformation-template.json`
- `route53-records.json`
- `setup-commands.json`
- `setup-ssl-letsencrypt.sh`
- `setup-ssl.sh`
- `ssl-validation-records.json`
- `database/` folder
- `tests/` folder

## Files That Will Be Added/Updated

The streamlined version includes:
- `DEPLOYMENT.md` (simplified deployment guide)
- `INTEGRATION_GUIDE.md` (OAuth + Square integration)
- Updated `README.md` with current setup instructions
- Clean project structure focused on core functionality

## Verification Steps

After the migration:

1. **Check branch status:**
   ```bash
   git branch -r
   git log --oneline -5
   ```

2. **Verify deployment still works:**
   - Test GitHub Actions deployment
   - Confirm application starts correctly
   - Verify all integrations function

3. **Update local repositories:**
   All team members should update their local repositories:
   ```bash
   git checkout main
   git pull origin main
   git branch -d dev  # Delete local dev branch
   ```

## Rollback Plan

If issues arise, the dev branch can be restored:
```bash
git checkout -b dev de233753e039fefb235a948b9f7a326c8ae8a920
git push origin dev
# Then reset main if needed and restore dev as default
```

## Important Notes

- **Backup first**: Ensure you have backups or can access both branch states
- **Team coordination**: Notify all team members before making the change
- **CI/CD impact**: GitHub Actions and deployments reference the default branch
- **External integrations**: Any external services pointing to dev branch need updates

## Current Branch State Summary

```
Dev Branch (de233753):  [NEWER - STREAMLINED]
├── DEPLOYMENT.md
├── INTEGRATION_GUIDE.md
├── server.js (10,287 bytes)
├── Clean OAuth + Square integration
└── Simplified deployment workflow

Main Branch (ee82c1c):  [OLDER - COMPLEX]
├── Multiple deployment files
├── Legacy scripts and configurations
├── server.js (12,361 bytes)
├── CloudFormation templates
└── Additional complexity
```

**Recommendation**: Proceed with Option B (hard reset) to ensure main gets the clean, streamlined codebase from dev.