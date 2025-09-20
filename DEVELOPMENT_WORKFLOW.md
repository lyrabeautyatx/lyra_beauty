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

### � **CRITICAL: Stay Current with Main** (Prevents Conflicts)

**If working on long-running feature (>1 day), sync with main daily:**
```bash
git checkout main
git pull origin main
git checkout issue-[NUMBER]-[description]
git merge main
# Resolve any conflicts immediately
git push origin issue-[NUMBER]-[description]
```

## 🚀 When Ready to Submit:

1. **FIRST: Sync with latest main** (prevents conflicts at PR time):
   ```bash
   git checkout main
   git pull origin main
   git checkout issue-[NUMBER]-[description]
   git merge main
   # Resolve conflicts if any
   ```

2. **Push to feature branch:**
   ```bash
   git push origin issue-[NUMBER]-[description]
   ```

3. **Create Pull Request:**
   ```bash
   gh pr create --title "Your Feature Title" --body "Resolves #[NUMBER]" --reviewer copilot-pull-request-reviewer
   ```

4. **Set Copilot as reviewer** (done automatically with command above)

5. **Wait for Copilot review** and address any feedback

6. **Merge when approved** and conflicts are resolved

## ⚠️ Important Notes:

- **Never work directly on `main` branch**
- **Always pull latest `main` before creating branch**
- **Sync with main daily for long-running features**
- **Resolve conflicts BEFORE creating PR (not after)**
- **Use descriptive commit messages**
- **Reference issue number in PR title and description**
- **Wait for Copilot approval before merging**

## 🚨 **Handling Concurrent Development:**

### **When Multiple Issues Are Active:**

1. **Coordinate timing** - Finish smaller issues first
2. **Sync frequently** - Merge main into your branch daily
3. **Monitor main branch** - Watch for new merges affecting your work
4. **Communicate** - Comment on issues if you depend on another issue

### **If You Get Conflicts During PR:**

1. **Don't panic** - Copilot can help resolve them
2. **Pull latest main and merge locally:**
   ```bash
   git checkout main
   git pull origin main
   git checkout your-branch
   git merge main
   ```
3. **Ask Copilot for help**: "Help me resolve this merge conflict"
4. **Test thoroughly** after resolving conflicts
5. **Push resolved conflicts** and request re-review

## 🤖 **Copilot Conflict Resolution:**

**Copilot can help with:**
- ✅ Suggesting which changes to keep
- ✅ Explaining what each side of conflict does  
- ✅ Rewriting code to combine both changes
- ✅ Identifying potential issues in resolution

**Ask Copilot:**
- "Help resolve this merge conflict"
- "Which version should I keep?"
- "How can I combine these changes?"
- "What does this conflict mean?"

## 🤖 Copilot Integration:

When you create a PR with `--reviewer copilot-pull-request-reviewer`, Copilot will:
- Review your code for best practices
- Check for potential conflicts
- Suggest improvements
- Approve when ready for merge