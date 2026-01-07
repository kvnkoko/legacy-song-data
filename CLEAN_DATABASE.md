# Database Cleanup Instructions

This guide will help you:
1. Test your database connection
2. Ensure the `User.preferences` column exists
3. Clean the database while preserving your admin user

## Step 1: Test Database Connection

First, make sure your database connection is working:

```bash
npx tsx scripts/test-connection.ts
```

If this fails, check your `.env` file and ensure `DATABASE_URL` is set correctly. It should look like:
```
DATABASE_URL="postgresql://user:password@host:port/database?sslmode=require"
```

## Step 2: Ensure Preferences Column Exists

Run this to add the `User.preferences` column if it doesn't exist:

```bash
npx tsx scripts/add-preferences-column.ts
```

## Step 3: Clean Database (Preserve Admin)

**⚠️ WARNING: This will delete ALL data except your admin user!**

Run the cleanup script:

```bash
npx tsx scripts/clean-database-preserve-admin.ts
```

This script will:
- ✅ Preserve your admin user (`admin@example.com`)
- ✅ Preserve admin's employee record (if they have one)
- ❌ Delete all releases, tracks, artists
- ❌ Delete all other users
- ❌ Delete all employees (except admin's)
- ❌ Delete all related data (comments, audit logs, platform requests, etc.)

## Step 4: Verify Everything Works

After cleanup, test the connection again:

```bash
npx tsx scripts/test-connection.ts
```

You should see:
- ✅ Database connection successful
- ✅ Admin user exists

## Alternative: Run Everything at Once

If you want to run setup and cleanup together:

```bash
npx tsx scripts/setup-and-clean.ts
```

This will:
1. Test the connection
2. Ensure preferences column exists
3. Clean the database

## Troubleshooting

### Database Connection Issues

If you get "Can't reach database server":
1. Check your Neon database is active in the Neon console
2. Verify your `DATABASE_URL` in `.env` file
3. Make sure there are no extra quotes or spaces in the connection string
4. Try regenerating your connection string from Neon

### Preferences Column Errors

If you get errors about the preferences column:
1. Run: `npx tsx scripts/add-preferences-column.ts`
2. If that fails, run: `npx prisma db push`
3. Then regenerate Prisma client: `npm run db:generate`

### Admin User Not Found

If the admin user is missing after cleanup:
1. Run: `npm run db:seed`
2. This will create the admin user with:
   - Email: `admin@example.com`
   - Password: `admin123`

## What Gets Preserved

The cleanup script preserves:
- ✅ Admin user (`admin@example.com`)
- ✅ Admin's employee record (if exists)
- ✅ System tables (FieldPermission, FormField, Department, SavedView - optional)

## What Gets Deleted

The cleanup script deletes:
- ❌ All releases
- ❌ All tracks
- ❌ All artists
- ❌ All other users (except admin)
- ❌ All other employees (except admin's)
- ❌ All platform requests
- ❌ All comments
- ❌ All audit logs
- ❌ All import sessions
- ❌ All platform channels


