# Vercel Setup Guide

## 🎯 What This Does

Vercel will automatically:
- **Main branch** → Deploys to **Production** (your live site)
- **Draft branches** → Deploys to **Preview URLs** (test before merging)

This means:
- ✅ Test drafts online before merging to main
- ✅ Production stays safe (only main branch deploys there)
- ✅ Each draft gets its own preview URL

## 📋 Setup Steps

### Step 1: Push to GitHub

First, you need your code on GitHub:

```bash
# 1. Create a new repository on GitHub (github.com)
#    - Name it something like "master-song-data"
#    - Don't initialize with README (you already have files)

# 2. Add GitHub as remote (replace YOUR_USERNAME and REPO_NAME)
git remote add origin https://github.com/YOUR_USERNAME/REPO_NAME.git

# 3. Push your code
git checkout main
git push -u origin main

# 4. Push your draft branch too
git checkout draft/initial-setup
git push -u origin draft/initial-setup
```

### Step 2: Connect to Vercel

1. **Go to [vercel.com](https://vercel.com)** and sign up/login
2. **Click "Add New Project"**
3. **Import your GitHub repository**
   - Select your repository from the list
   - Click "Import"

### Step 3: Configure Project Settings

In Vercel project settings:

**Framework Preset:** Next.js (auto-detected)

**Root Directory:** `./` (leave as default)

**Build Command:** `npm run build` (auto-detected)

**Output Directory:** `.next` (auto-detected)

**Install Command:** `npm install` (auto-detected)

### Step 4: Set Environment Variables

In Vercel project settings → Environment Variables, add:

**Required:**
```
DATABASE_URL=your-production-database-url
NEXTAUTH_SECRET=your-secret-key
NEXTAUTH_URL=https://your-app-name.vercel.app
```

**Optional (if using):**
```
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
S3_ENDPOINT=...
S3_REGION=...
S3_ACCESS_KEY_ID=...
S3_SECRET_ACCESS_KEY=...
S3_BUCKET_NAME=...
S3_FORCE_PATH_STYLE=...
S3_PUBLIC_URL=...
```

**Important:** 
- Set these for **Production** environment
- You can also set different values for **Preview** (draft branches) if needed

### Step 5: Configure Branch Deployments

In Vercel project settings → Git:

**Production Branch:** `main` ✅

**Preview Deployments:** Enabled ✅
- This means draft branches will get preview URLs automatically

### Step 6: Deploy!

Click **"Deploy"** and wait for it to build.

## 🚀 How It Works After Setup

### Testing Drafts Online

```bash
# 1. Work on draft branch
git checkout draft/my-feature
# Make changes...

# 2. Push to GitHub
git push origin draft/my-feature

# 3. Vercel automatically creates a preview URL!
# Example: https://master-song-data-git-draft-my-feature.vercel.app
# You'll see this in Vercel dashboard
```

### Deploying to Production

```bash
# 1. Merge draft to main
git checkout main
git merge draft/my-feature

# 2. Push to GitHub
git push origin main

# 3. Vercel automatically deploys to production!
# Your production URL: https://your-app-name.vercel.app
```

## 🔗 Your URLs

After setup, you'll have:

- **Production:** `https://your-app-name.vercel.app`
- **Draft Previews:** `https://your-app-name-git-draft-feature-name.vercel.app`

## 📊 Vercel Dashboard

You can see:
- All deployments (production + previews)
- Which branch triggered each deployment
- Build logs and errors
- Environment variables

## ⚙️ Advanced: Custom Domain

1. Go to Project Settings → Domains
2. Add your custom domain (e.g., `app.yourdomain.com`)
3. Follow DNS setup instructions
4. Update `NEXTAUTH_URL` to your custom domain

## 🛡️ Protection

- **Main branch** = Production (protected by our git hook)
- **Draft branches** = Preview URLs (safe to experiment)
- Each preview is isolated and won't affect production

## 🔧 Troubleshooting

### Build Fails

Check:
- Environment variables are set correctly
- Database URL is accessible from Vercel
- Build logs in Vercel dashboard

### Preview Not Working

- Make sure "Preview Deployments" is enabled
- Check that you pushed the branch to GitHub
- Look at build logs in Vercel

### Database Connection Issues

- Vercel needs to access your database
- Make sure database allows connections from Vercel's IPs
- For Neon/Supabase: Check connection string includes `?sslmode=require`

## 📝 Quick Reference

**Test Draft Locally:**
```bash
git checkout draft/my-feature
npm run dev
# http://localhost:3001
```

**Test Draft Online:**
```bash
git push origin draft/my-feature
# Check Vercel dashboard for preview URL
```

**Deploy to Production:**
```bash
git checkout main
git merge draft/my-feature
git push origin main
# Auto-deploys to production URL
```
