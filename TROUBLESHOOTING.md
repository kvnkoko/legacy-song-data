# Troubleshooting Login Issues

## Step-by-Step Fix

### 1. Verify DATABASE_URL Format

Your `.env` file should have:
```bash
DATABASE_URL="postgresql://user:password@host:port/database?sslmode=require"
```

**Common issues:**
- ❌ Has `psql` command: `DATABASE_URL="psql 'postgresql://...'"`
- ❌ Missing quotes: `DATABASE_URL=postgresql://...`
- ❌ Extra quotes: `DATABASE_URL="'postgresql://...'"`
- ✅ Correct: `DATABASE_URL="postgresql://..."`

### 2. Regenerate Prisma Client

```bash
npm run db:generate
```

### 3. Run Database Migrations

```bash
npm run db:migrate
```

If that fails, try:
```bash
npx prisma db push
```

### 4. Seed the Database

```bash
npm run db:seed
```

This creates the admin user with:
- Email: `admin@example.com`
- Password: `admin123`

### 5. Verify the User Exists

Run this in your terminal:
```bash
npx prisma studio
```

Then:
1. Open the browser (usually http://localhost:5555)
2. Click on "User" table
3. Check if `admin@example.com` exists
4. If not, run `npm run db:seed` again

### 6. Test the Connection

Try running:
```bash
node -e "require('dotenv').config(); console.log(process.env.DATABASE_URL?.substring(0, 20))"
```

This should print: `postgresql://` (not `psql` or anything else)

### 7. Check for Hidden Characters

Sometimes copy-paste adds hidden characters. Try:
1. Delete the entire DATABASE_URL line
2. Type it fresh: `DATABASE_URL="`
3. Paste your connection string
4. Close with: `"`

### 8. Restart Dev Server

After fixing `.env`:
```bash
# Stop the server (Ctrl+C)
# Then restart:
npm run dev
```

## Still Not Working?

1. **Check terminal output** when you try to login - look for error messages
2. **Verify Neon database is active** - go to neon.tech console
3. **Try creating user manually** via Prisma Studio
4. **Check NEXTAUTH_SECRET** is set in `.env`

## Quick Test

Run this to see what Prisma sees:
```bash
npx prisma db execute --stdin <<< "SELECT 1"
```

If this works, your connection is fine. The issue is likely:
- User doesn't exist (run `npm run db:seed`)
- Password hash is wrong (run `npm run fix:admin`)






