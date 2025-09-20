# Development Workflow Instructions

**IMPORTANT:** Follow these steps exactly to prevent conflicts and ensure clean integration:

## 🔄 Before Starting Work:

1. **Pull latest changes:**
   ```bash
   git checkout main
   git pull origin main
   ```

2. **Create feature branch:**
   ```bash
   git checkout -b issue-[NUMBER]-[description]
   # Example: git checkout -b issue-2-database-migration
   ```

## 💻 During Development:

- Work on your feature branch
- Commit changes regularly with descriptive messages
- Reference the issue in commits: `feat: implement feature (closes #[NUMBER])`

## 🚀 When Ready to Submit:

1. **Push to feature branch:**
   ```bash
   git push origin issue-[NUMBER]-[description]
   ```

2. **Create Pull Request:**
   ```bash
   gh pr create --title "Your Feature Title" --body "Resolves #[NUMBER]" --reviewer copilot-pull-request-reviewer
   ```

3. **Set Copilot as reviewer** (done automatically with command above)

4. **Check for conflicts:**
   - If GitHub shows conflicts, resolve them locally:
   ```bash
   git checkout main
   git pull origin main
   git checkout issue-[NUMBER]-[description]
   git merge main
   # Resolve conflicts if any
   git push origin issue-[NUMBER]-[description]
   ```

5. **Wait for Copilot review** and address any feedback

6. **Merge when approved** and conflicts are resolved

## ⚠️ Important Notes:

- **Never work directly on `main` branch**
- **Always pull latest `main` before creating branch**
- **Resolve conflicts before requesting review**
- **Use descriptive commit messages**
- **Reference issue number in PR title and description**
- **Wait for Copilot approval before merging**

## 🤖 Copilot Integration:

When you create a PR with `--reviewer copilot-pull-request-reviewer`, Copilot will:
- Review your code for best practices
- Check for potential conflicts
- Suggest improvements
- Approve when ready for merge