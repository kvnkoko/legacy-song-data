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

## ✅ Deploy to Production

**Only when you explicitly approve!**

```bash
git checkout main
git merge draft/my-feature-name
git push origin main
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

## 🛡️ Protection

- Main branch is **protected** - cannot push directly
- All work must be on `draft/*` branches
- Merge to main only when ready for production
