# Quick Workflow Reference Card

## 🚀 Start New Feature

```bash
./scripts/create-draft-branch.sh my-feature-name
```

## 💾 Save Your Work

```bash
git add .
git commit -m "feat: what you changed"
git push origin draft/my-feature-name
```

## 🧪 Test Your Draft

**Locally:**
```bash
npm run dev
# Visit: http://localhost:3001
```

**Online (after pushing to GitHub):**
- Vercel automatically creates preview URL
- Check Vercel dashboard for the link
- Example: `https://your-app-git-draft-my-feature.vercel.app`

## ✅ Deploy to Production

**Only when you explicitly approve!**

```bash
git checkout main
git merge draft/my-feature-name
git push origin main
# Auto-deploys to: https://your-app.vercel.app
```

## 📊 Check Status

```bash
# Current branch
git branch --show-current

# All draft branches
git branch --list 'draft/*'

# Uncommitted changes
git status
```

## 🔄 Reset Draft to Match Production

```bash
git checkout draft/your-branch
git reset --hard main
# Now your draft matches production again!
```

## 🛡️ Protection

- Main branch is **protected** - cannot push directly
- All work must be on `draft/*` branches
- Merge to main only when ready for production
- Draft branches get preview URLs (safe to test online)

## 🌐 Your URLs

- **Draft (Local):** `http://localhost:3001`
- **Draft (Online):** `https://your-app-git-draft-feature.vercel.app` (auto-generated)
- **Production:** `https://your-app.vercel.app`
