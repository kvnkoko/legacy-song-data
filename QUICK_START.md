# Quick Start - Fix Database Connection

## Option 1: Docker (Easiest)

If you have Docker installed:

```bash
# Start PostgreSQL in Docker
docker-compose up -d postgres

# Wait a few seconds for it to start, then update your .env:
# DATABASE_URL="postgresql://postgres:postgres@localhost:5432/master_song_data?schema=public"
```

## Option 2: Local PostgreSQL

If you have PostgreSQL installed locally:

1. **Create the database:**
```bash
createdb master_song_data
```

2. **Update your `.env` file:**
```bash
DATABASE_URL="postgresql://YOUR_USERNAME@localhost:5432/master_song_data?schema=public"
```

Replace `YOUR_USERNAME` with your PostgreSQL username (usually your system username).

If your PostgreSQL requires a password:
```bash
DATABASE_URL="postgresql://YOUR_USERNAME:YOUR_PASSWORD@localhost:5432/master_song_data?schema=public"
```

## Option 3: Cloud Database (Free)

### Using Neon (Recommended)

1. Go to https://neon.tech
2. Sign up (free tier available)
3. Create a new project
4. Copy the connection string
5. Update your `.env`:
```bash
DATABASE_URL="your-neon-connection-string-here"
```

### Using Supabase

1. Go to https://supabase.com
2. Sign up (free tier available)
3. Create a new project
4. Go to Settings > Database
5. Copy the connection string
6. Update your `.env`:
```bash
DATABASE_URL="your-supabase-connection-string-here"
```

## After Setting Up Database

Once your `.env` has the correct `DATABASE_URL`, run:

```bash
npm run db:migrate
npm run db:seed
npm run dev
```

## Verify Your .env File

Make sure your `.env` file has at least:

```bash
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/master_song_data?schema=public"
NEXTAUTH_SECRET="generate-with-openssl-rand-base64-32"
NEXTAUTH_URL="http://localhost:3000"
```

Generate a secure NEXTAUTH_SECRET:
```bash
openssl rand -base64 32
```






