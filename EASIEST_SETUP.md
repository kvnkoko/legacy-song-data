# Easiest Setup Guide

## Option 1: Automated Setup (Recommended)

Just run:

```bash
npm run setup
```

The script will guide you through everything!

## Option 2: Manual Setup with Neon (Free Cloud Database)

This is the easiest if you don't want to install PostgreSQL locally.

### Step 1: Get a Free Database

1. Go to https://neon.tech
2. Click "Sign Up" (free, no credit card needed)
3. Click "Create Project"
4. Name it "master-song-data" (or anything you want)
5. Copy the connection string (it looks like: `postgresql://user:password@host/dbname`)

### Step 2: Configure Your App

1. Copy the environment file:
   ```bash
   cp env.example .env
   ```

2. Open `.env` in your editor and:
   - Paste your Neon connection string as `DATABASE_URL`
   - Generate a secret: `openssl rand -base64 32` and paste it as `NEXTAUTH_SECRET`
   - Set `NEXTAUTH_URL="http://localhost:3000"`

3. Install and setup:
   ```bash
   npm install
   npm run db:generate
   npm run db:migrate
   npm run db:seed
   npm run dev
   ```

That's it! Open http://localhost:3000

**Default login:**
- Email: `admin@example.com`
- Password: `admin123`

## Option 3: Docker (If You Have Docker)

```bash
# Start PostgreSQL
docker-compose up -d postgres

# Update .env with:
# DATABASE_URL="postgresql://postgres:postgres@localhost:5432/master_song_data?schema=public"

# Then run setup
npm install
npm run db:generate
npm run db:migrate
npm run db:seed
npm run dev
```

## Troubleshooting

**"User was denied access" error:**
- Your `DATABASE_URL` has wrong credentials
- Use Neon (Option 2) - it's the easiest!

**"Database does not exist" error:**
- For Neon: The database is created automatically
- For local: Run `createdb master_song_data`
- For Docker: It's created automatically

**Can't find .env file:**
- Run: `cp env.example .env`
- Then edit it with your database URL






