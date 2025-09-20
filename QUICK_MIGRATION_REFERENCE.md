# Quick Reference: Branch Migration Commands

## TL;DR - Essential Commands for Repository Owner

```bash
# 1. Update main with dev content
git checkout main
git reset --hard origin/dev
git push origin main --force

# 2. Change default branch in GitHub UI
# Go to Settings → General → Default branch → Select "main"

# 3. Delete dev branch (after verification)
git push origin --delete dev
git branch -d dev
```

## Why This Approach?

- **Dev branch is newer and cleaner** (Sept 20, 2025 - streamlined deployment)
- **Main branch is older and complex** (Sept 20, 2025 - but with legacy files)
- **Hard reset ensures clean state** without merge complexity

## Files Being Replaced

### Removed (Legacy Complexity):
- `AWS-DEPLOYMENT.md`
- `GITHUB-ACTIONS-SETUP.md` 
- `MANUAL-DEPLOYMENT.md`
- `PAYMENT_IMPLEMENTATION.md`
- Multiple deploy scripts (`deploy-to-aws.ps1`, `deploy-update.sh`, etc.)
- CloudFormation and SSL setup files
- `database/` and `tests/` folders

### Added/Updated (Streamlined):
- `DEPLOYMENT.md` (single, clear deployment guide)
- `INTEGRATION_GUIDE.md` (OAuth + Square integration)
- Updated `README.md`
- Clean project structure

## Post-Migration Checklist

- [ ] Main branch is default in GitHub settings
- [ ] Dev branch deleted (local and remote)
- [ ] GitHub Actions still work
- [ ] Application deploys successfully
- [ ] Team notified to update local repos
- [ ] All integrations functioning

## Emergency Rollback

If something goes wrong:
```bash
# Restore dev branch
git checkout -b dev de233753e039fefb235a948b9f7a326c8ae8a920
git push origin dev
# Then change default branch back to dev in GitHub UI
```