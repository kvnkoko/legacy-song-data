# Deployment Workflow & Branch Protection

## 🛡️ Branch Protection Strategy

This project uses a **branch protection system** to prevent accidental commits to production.

### Branch Structure

- **`main`**: Production-ready code only. **PROTECTED** - cannot push directly.
  - Deploys to: **Production URL** (e.g., `https://your-app.vercel.app`)
- **`draft/*`**: All new features and changes (e.g., `draft/new-feature`, `draft/bugfix-xyz`)
  - Test locally: `http://localhost:3001`
  - Test online: **Preview URL** (e.g., `https://your-app-git-draft-feature.vercel.app`)
  - Safe to experiment - won't affect production

## 📋 Daily Workflow

### Starting New Work

**Always start from a draft branch:**

```bash
# Option 1: Use the helper script (recommended)
./scripts/create-draft-branch.sh my-feature-name

# Option 2: Manual
git checkout -b draft/my-feature-name
```

### Making Changes

```bash
# 1. Make your changes to files

# 2. Stage changes
git add .

# 3. Commit
git commit -m "feat: description of your changes"

# 4. Push to draft branch (safe, won't affect production)
git push origin draft/my-feature-name

# 5. (Optional) Test online - Vercel creates preview URL automatically
# Check Vercel dashboard for preview URL
```

### Deploying to Production

**Only when you explicitly approve:**

```bash
# 1. Make sure all changes are committed
git status

# 2. Switch to main
git checkout main

# 3. Pull latest changes (if working with remote)
git pull origin main

# 4. Merge your draft branch
git merge draft/my-feature-name

# 5. Push to main (pre-push hook will allow this after merge)
git push origin main

# 6. Vercel automatically deploys to production!
# Your production URL: https://your-app.vercel.app
```

## 🔒 Protection Mechanisms

### 1. Pre-Push Hook

A git hook prevents direct pushes to `main`. If you try to push directly to main, you'll get an error message with instructions.

**Location:** `.git/hooks/pre-push`

**To reinstall if needed:**
```bash
chmod +x scripts/pre-push-hook.sh
cp scripts/pre-push-hook.sh .git/hooks/pre-push
```

### 2. Helper Scripts

- **`scripts/create-draft-branch.sh`**: Creates a new draft branch safely
- **`scripts/pre-push-hook.sh`**: Protection hook source

## 🚨 Important Rules

- ✅ **Always** create draft branches for new work
- ✅ **Always** commit to draft branches first
- ✅ **Only** merge to main when explicitly ready for production
- ❌ **Never** commit directly to main
- ❌ **Never** push directly to main (will be blocked)

## 📝 Quick Reference

### Check current branch
```bash
git branch --show-current
```

### List all draft branches
```bash
git branch --list 'draft/*'
```

### Switch to a draft branch
```bash
git checkout draft/branch-name
```

### Create new draft branch
```bash
./scripts/create-draft-branch.sh feature-name
```

## 🤖 For AI Assistants

When making code changes:
1. Check current branch: `git branch --show-current`
2. If on `main`, create a draft branch first
3. Make all changes on draft branch
4. Only merge to `main` when user explicitly says:
   - "deploy to production"
   - "merge to main"
   - "push to production"
   - "ready for production"
   - "merge [branch] to main"

## 🌐 Vercel Deployment

This project is configured for Vercel deployment:

- **Main branch** → Auto-deploys to **Production**
- **Draft branches** → Auto-deploy to **Preview URLs** (test online before merging)

See `VERCEL_SETUP.md` for complete setup instructions.

### Quick Vercel Workflow

**Test Draft Online:**
```bash
git push origin draft/my-feature
# Vercel creates preview URL automatically
# Check Vercel dashboard: https://vercel.com/dashboard
```

**Deploy to Production:**
```bash
git checkout main
git merge draft/my-feature
git push origin main
# Auto-deploys to production URL
```

## 🔧 Troubleshooting

### "I'm stuck on main branch"

```bash
# Create and switch to draft branch
./scripts/create-draft-branch.sh current-work
```

### "Pre-push hook not working"

```bash
# Reinstall the hook
chmod +x scripts/pre-push-hook.sh
cp scripts/pre-push-hook.sh .git/hooks/pre-push
chmod +x .git/hooks/pre-push
```

### "I need to merge but hook is blocking"

The hook only blocks **direct pushes** to main. If you've merged locally, the push will work. The hook checks if you're trying to push commits that weren't merged from another branch.
