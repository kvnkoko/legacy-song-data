# Vercel Deployment Troubleshooting

## Error: "Couldn't find any 'pages' or 'app' directory"

This error means Vercel can't find your Next.js app directory. Here's how to fix it:

### Solution 1: Check Root Directory Setting

1. Go to your Vercel project dashboard
2. Click **Settings** → **General**
3. Scroll to **Root Directory**
4. Make sure it's set to **`./`** (project root) or **leave it empty**
5. **DO NOT** set it to a subdirectory

### Solution 2: Verify Files Are on GitHub

Check that your files are actually on GitHub:
- Visit: `https://github.com/kvnkoko/legacy-song-data`
- Verify you can see:
  - `app/` directory
  - `package.json`
  - `next.config.mjs`

### Solution 3: Check Vercel Project Settings

In Vercel project settings:

**Framework Preset:** Next.js

**Root Directory:** `./` (or empty)

**Build Command:** `npm run build` (or leave default)

**Output Directory:** `.next` (or leave default)

**Install Command:** `npm install` (or leave default)

### Solution 4: Force Redeploy

1. Go to Vercel dashboard
2. Click on your project
3. Go to **Deployments** tab
4. Click the **"..."** menu on the latest deployment
5. Click **"Redeploy"**

### Solution 5: Check Branch

Make sure Vercel is deploying from the correct branch:
- Go to **Settings** → **Git**
- **Production Branch:** Should be `main`
- Verify Vercel is connected to the right repository

### Solution 6: Manual Verification

If still not working, verify the repository structure:

```bash
# Check what Vercel sees
git ls-tree -r HEAD --name-only | head -20

# Should show:
# app/
# package.json
# next.config.mjs
# etc.
```

### Common Issues

**Issue:** Root Directory is set to a subdirectory
- **Fix:** Set Root Directory to `./` or empty

**Issue:** Wrong branch selected
- **Fix:** Make sure Production Branch is `main`

**Issue:** Files not pushed to GitHub
- **Fix:** Run `git push origin main`

**Issue:** Vercel cache
- **Fix:** Clear cache and redeploy

## Still Not Working?

1. **Delete and re-import the project in Vercel**
   - This resets all settings
   - Make sure Root Directory is `./`

2. **Check Vercel build logs**
   - Look for any path-related errors
   - Verify it's checking the right directory

3. **Verify package.json exists**
   - Vercel needs `package.json` in the root
   - Check it's not in a subdirectory
