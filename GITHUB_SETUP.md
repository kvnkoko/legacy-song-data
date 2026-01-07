# GitHub Repository Setup

Before setting up Vercel, you need to push your code to GitHub.

## Quick Setup

### Step 1: Create GitHub Repository

1. Go to [github.com](https://github.com) and sign in
2. Click the **"+"** icon → **"New repository"**
3. Name it: `master-song-data` (or whatever you prefer)
4. **Don't** check "Initialize with README" (you already have files)
5. Click **"Create repository"**

### Step 2: Connect Local Repository to GitHub

```bash
# 1. Make sure you're in your project directory
cd "/Users/kevinkoko/master song data"

# 2. Add GitHub as remote (replace YOUR_USERNAME with your GitHub username)
git remote add origin https://github.com/YOUR_USERNAME/master-song-data.git

# 3. Check current branch
git branch --show-current
# Should be: draft/initial-setup

# 4. First, push main branch
git checkout main
git push -u origin main

# 5. Push your draft branch too
git checkout draft/initial-setup
git push -u origin draft/initial-setup
```

### Step 3: Verify

Go to your GitHub repository page. You should see:
- All your files
- Two branches: `main` and `draft/initial-setup`

## 🔐 Authentication

If GitHub asks for authentication:

**Option 1: Personal Access Token (Recommended)**
1. Go to GitHub Settings → Developer settings → Personal access tokens
2. Generate new token with `repo` permissions
3. Use token as password when pushing

**Option 2: SSH (More Secure)**
```bash
# Generate SSH key (if you don't have one)
ssh-keygen -t ed25519 -C "your_email@example.com"

# Add to GitHub: Settings → SSH and GPG keys → New SSH key
# Copy public key: cat ~/.ssh/id_ed25519.pub

# Use SSH URL instead:
git remote set-url origin git@github.com:YOUR_USERNAME/master-song-data.git
```

## ✅ Next Steps

Once GitHub is set up:
1. Follow `VERCEL_SETUP.md` to connect Vercel
2. Vercel will automatically deploy from GitHub

## 🔄 Future Workflow

After setup, your workflow is:

```bash
# 1. Create draft branch
./scripts/create-draft-branch.sh my-feature

# 2. Make changes, commit
git add .
git commit -m "feat: my changes"
git push origin draft/my-feature

# 3. Vercel auto-creates preview URL
# Check Vercel dashboard

# 4. When ready, merge to main
git checkout main
git merge draft/my-feature
git push origin main

# 5. Vercel auto-deploys to production
```
