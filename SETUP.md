# Setup Guide

## Quick Start (One Command Setup)

After cloning the repository:

```bash
# Install dependencies
npm install

# Copy environment file
cp env.example .env

# Edit .env with your database URL and secrets
# Then run:
npm run db:generate && npm run db:migrate && npm run db:seed && npm run dev
```

## Detailed Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Environment Variables

Create a `.env` file in the root directory:

```bash
cp env.example .env
```

Edit `.env` and set:

**Required:**
- `DATABASE_URL`: PostgreSQL connection string
  - Local: `postgresql://user:password@localhost:5432/master_song_data`
  - Neon: Get from Neon dashboard
  - Supabase: Get from Supabase dashboard
- `NEXTAUTH_SECRET`: Generate with `openssl rand -base64 32`
- `NEXTAUTH_URL`: Your app URL (e.g., `http://localhost:3000`)

**Optional (for Google OAuth):**
- `GOOGLE_CLIENT_ID`: From Google Cloud Console
- `GOOGLE_CLIENT_SECRET`: From Google Cloud Console

**Optional (for file uploads):**
- `S3_ENDPOINT`: S3-compatible endpoint
- `S3_REGION`: Region (default: `us-east-1`)
- `S3_ACCESS_KEY_ID`: Access key
- `S3_SECRET_ACCESS_KEY`: Secret key
- `S3_BUCKET_NAME`: Bucket name
- `S3_FORCE_PATH_STYLE`: `true` for MinIO, `false` for AWS/Cloudflare R2
- `S3_PUBLIC_URL`: Public URL for uploaded files

### 3. Database Setup

**Option A: Local PostgreSQL**

```bash
# Install PostgreSQL locally, then:
createdb master_song_data
```

**Option B: Docker (Recommended for local dev)**

```bash
docker-compose up -d postgres
```

**Option C: Cloud (Neon/Supabase)**

1. Create account on Neon or Supabase
2. Create a new database
3. Copy the connection string to `.env`

### 4. Run Migrations

```bash
# Generate Prisma client
npm run db:generate

# Create database tables
npm run db:migrate

# (Optional) Seed with sample users
npm run db:seed
```

### 5. Start Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### 6. Default Login Credentials

After running `npm run db:seed`:

- **Admin**: `admin@example.com` / `admin123`
- **A&R**: `ar@example.com` / `ar123`
- **YouTube Team**: `youtube@example.com` / `platform123`

## Docker Setup (Full Stack)

### Start All Services

```bash
docker-compose up -d
```

This starts:
- PostgreSQL on port 5432
- MinIO (S3 storage) on ports 9000 (API) and 9001 (Console)

### Configure MinIO

1. Open http://localhost:9001
2. Login: `minioadmin` / `minioadmin`
3. Create bucket: `master-song-data`
4. Update `.env`:
   ```
   S3_ENDPOINT=http://localhost:9000
   S3_ACCESS_KEY_ID=minioadmin
   S3_SECRET_ACCESS_KEY=minioadmin
   S3_BUCKET_NAME=master-song-data
   S3_FORCE_PATH_STYLE=true
   ```

### Run Migrations

```bash
npm run db:migrate
```

## Staging Environment

### Vercel Deployment

1. Push code to GitHub
2. Import to Vercel
3. Set environment variables in Vercel dashboard
4. Deploy

### Database (Staging)

Use Neon or Supabase free tier:
- Create separate database for staging
- Update `DATABASE_URL` in Vercel

### Storage (Staging)

Use Cloudflare R2 free tier:
- Create bucket
- Get credentials
- Update S3 env vars in Vercel

## Production Environment

### Deployment Checklist

- [ ] Database: Production PostgreSQL (Neon/Supabase paid tier or self-hosted)
- [ ] Storage: Production S3-compatible storage (Cloudflare R2, Backblaze, or self-hosted MinIO)
- [ ] Environment variables: All set in production
- [ ] Domain: Configured and SSL enabled
- [ ] Backups: Database backup strategy in place
- [ ] Monitoring: Error tracking and logging configured

### Self-Hosted Production

1. **Build the app:**
   ```bash
   npm run build
   ```

2. **Start production server:**
   ```bash
   npm start
   ```

3. **Or use PM2:**
   ```bash
   npm install -g pm2
   pm2 start npm --name "master-song-data" -- start
   ```

## Troubleshooting

### Database Connection Failed

- Verify PostgreSQL is running
- Check `DATABASE_URL` format
- Ensure database exists
- Check firewall/network settings

### NextAuth Errors

- Verify `NEXTAUTH_SECRET` is set
- Check `NEXTAUTH_URL` matches your domain
- Clear browser cookies

### File Upload Fails

- Verify S3 credentials
- Check bucket exists
- Verify bucket permissions
- Check `S3_FORCE_PATH_STYLE` for MinIO

### Build Errors

- Clear `.next` folder: `rm -rf .next`
- Clear node_modules: `rm -rf node_modules && npm install`
- Regenerate Prisma client: `npm run db:generate`

## Next Steps

1. Create your first admin user (or use seeded one)
2. Configure field permissions in Admin panel
3. Import your Notion markdown files
4. Set up platform teams and assign roles
5. Configure S3 storage for file uploads

