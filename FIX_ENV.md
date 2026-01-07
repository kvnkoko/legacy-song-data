# Quick Fix for DATABASE_URL Error

## Run this command:

```bash
npm run fix:env
```

This will:
1. ✅ Ask you to paste your Neon connection string
2. ✅ Clean it up (remove `psql`, extra quotes, etc.)
3. ✅ Write it correctly to `.env`
4. ✅ Generate a secure `NEXTAUTH_SECRET`
5. ✅ Backup your existing `.env` file

## After running the fix:

```bash
# 1. Set up database
npm run db:migrate

# 2. Create admin user
npm run db:seed

# 3. Start the app
npm run dev
```

## Login credentials:
- Email: `admin@example.com`
- Password: `admin123`

---

## Manual Alternative

If the script doesn't work, manually edit `.env`:

1. Open `.env` in a text editor
2. Find `DATABASE_URL` line
3. Replace it with:
   ```bash
   DATABASE_URL="postgresql://your-actual-connection-string-here"
   ```
4. Make sure:
   - No `psql` command
   - Starts with `postgresql://`
   - Wrapped in double quotes `"`
   - No extra quotes inside






