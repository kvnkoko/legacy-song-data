# Vercel Environment Variables Checklist

## Critical: Check These in Vercel Dashboard

Your app is deployed but showing 500 errors. This is almost certainly due to missing or incorrect environment variables.

### Step 1: Go to Vercel Dashboard
1. Open your Vercel project
2. Click **Settings** → **Environment Variables**

### Step 2: Verify These Required Variables

**✅ DATABASE_URL** (REQUIRED)
- Must be your production PostgreSQL connection string
- Format: `postgresql://user:password@host:port/database?sslmode=require`
- Check: Does it start with `postgresql://`?
- Check: Is the database accessible from Vercel's servers?

**✅ NEXTAUTH_SECRET** (REQUIRED)
- Must be a random secret string (32+ characters)
- Generate with: `openssl rand -base64 32`
- Check: Is it set and not empty?

**✅ NEXTAUTH_URL** (REQUIRED)
- Must match your Vercel deployment URL
- Format: `https://your-app-name.vercel.app` (or your custom domain)
- Check: Does it match your actual Vercel URL?
- Check: Does it start with `https://`?

### Step 3: Optional Variables (if using)

**GOOGLE_CLIENT_ID** (if using Google OAuth)
- From Google Cloud Console

**GOOGLE_CLIENT_SECRET** (if using Google OAuth)
- From Google Cloud Console

**S3_*** variables (if using file uploads)
- S3_ENDPOINT
- S3_REGION
- S3_ACCESS_KEY_ID
- S3_SECRET_ACCESS_KEY
- S3_BUCKET_NAME
- S3_FORCE_PATH_STYLE
- S3_PUBLIC_URL

### Step 4: After Setting Variables

1. **Redeploy** your application:
   - Go to **Deployments** tab
   - Click **"..."** on latest deployment
   - Click **"Redeploy"**
   - Make sure **"Use existing Build Cache"** is **UNCHECKED**

2. **Wait for deployment** to complete

3. **Test** your app again

## Common Issues

### "500 Error on /api/auth/session"
- **Cause**: Missing `DATABASE_URL` or database not accessible
- **Fix**: Set `DATABASE_URL` in Vercel environment variables

### "NextAuth CLIENT_FETCH_ERROR"
- **Cause**: Missing `NEXTAUTH_SECRET` or `NEXTAUTH_URL` mismatch
- **Fix**: Set both variables correctly

### "Database connection failed"
- **Cause**: Database doesn't allow connections from Vercel IPs
- **Fix**: Check database firewall settings (Neon/Supabase usually allow all by default)

## Quick Test

After setting variables and redeploying, check:
1. Can you access the homepage? (Should redirect to signin)
2. Can you see the signin page?
3. Can you log in? (If you have users in database)

## Still Not Working?

Check Vercel **Function Logs**:
1. Go to **Deployments** → Latest deployment
2. Click **"Functions"** tab
3. Look for error messages in the logs
4. Share the error messages for further debugging
