# Master Song Data

Award-level metadata database website for music releases with role-based access control, client-facing submission forms, and comprehensive platform management.

## Features

- 🎵 **Release Management**: Single and Album releases with unlimited tracks
- 👥 **Role-Based Access Control**: Admin, A&R, Data Team, Platform Teams, and Client/Artist roles
- 📝 **Client Submission Forms**: Beautiful multi-step wizard with autosave
- 📊 **Internal Database UI**: Table views, filters, search, and detailed release pages
- 📥 **Markdown Importer**: Import Notion-exported markdown files with conflict detection
- 🎯 **Platform Portals**: Dedicated portals for YouTube, Flow, Ringtunes, International Streaming, Facebook, and TikTok
- 📈 **Analytics Dashboard**: Release rate over time, platform counts, and more
- 📅 **Calendar View**: Legacy Release Date calendar visualization
- 📤 **CSV Export**: Track-level and release-level exports
- 🌐 **i18n Support**: English and Myanmar (Burmese) with display mode toggle
- 🎨 **Beautiful UI**: Modern, responsive design with dark mode and animations

## Tech Stack

- **Frontend**: Next.js 14 (App Router), TypeScript, Tailwind CSS, shadcn/ui, Framer Motion
- **Backend**: Next.js API Routes
- **Database**: PostgreSQL (Prisma ORM)
- **Auth**: NextAuth.js (Credentials + Google OAuth)
- **Storage**: S3-compatible (Cloudflare R2, Backblaze, MinIO)
- **i18n**: next-intl

## Quick Start

### Prerequisites

- Node.js 18+ and npm/yarn
- PostgreSQL database (or use Docker)
- (Optional) S3-compatible storage for file uploads

### Local Development

**🚀 Easiest way - Run the automated setup:**

```bash
npm run setup
```

This interactive script will guide you through everything! See [EASIEST_SETUP.md](./EASIEST_SETUP.md) for details.

**Or manually:**

1. **Clone and install dependencies:**

```bash
npm install
```

2. **Set up environment variables:**

Copy `env.example` to `.env` and fill in your values:

```bash
cp env.example .env
```

Then edit `.env` and update the values (especially `DATABASE_URL` and `NEXTAUTH_SECRET`).

**💡 Recommended: Use Neon (Free cloud database)**
- Go to https://neon.tech and sign up (free tier)
- Create a new project
- Copy the connection string
- Paste it as `DATABASE_URL` in your `.env`

Required variables:
- `DATABASE_URL`: PostgreSQL connection string
- `NEXTAUTH_SECRET`: Random secret for NextAuth (generate with `openssl rand -base64 32`)
- `NEXTAUTH_URL`: Your app URL (e.g., `http://localhost:3000`)

Optional:
- `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` for Google OAuth
- S3 credentials for file uploads

3. **Set up the database:**

```bash
# Generate Prisma client
npm run db:generate

# Run migrations
npm run db:migrate

# (Optional) Seed with sample data
npm run db:seed
```

4. **Run the development server:**

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Docker Setup (Self-Hosted)

1. **Start services:**

```bash
docker-compose up -d
```

This starts:
- PostgreSQL on port 5432
- MinIO (S3-compatible storage) on ports 9000 (API) and 9001 (Console)

2. **Configure MinIO:**

- Access MinIO console at http://localhost:9001
- Login with `minioadmin` / `minioadmin`
- Create a bucket named `master-song-data`
- Update `.env` with MinIO credentials:
  ```
  S3_ENDPOINT=http://localhost:9000
  S3_ACCESS_KEY_ID=minioadmin
  S3_SECRET_ACCESS_KEY=minioadmin
  S3_BUCKET_NAME=master-song-data
  S3_FORCE_PATH_STYLE=true
  ```

3. **Run migrations and start app:**

```bash
npm run db:migrate
npm run dev
```

## Environments

### Local
- Development environment on your machine
- Uses local database and storage

### Staging
- Testing environment with safe sandbox data
- Separate database and storage from production
- Deploy to Vercel with staging environment variables

### Production
- Real data environment
- Deploy to Vercel or self-host
- Never commit directly to main; use feature branches

## Deployment

### Vercel (Recommended for Staging/Prod)

1. **Push to GitHub**

2. **Import to Vercel:**
   - Connect your GitHub repository
   - Set environment variables
   - Deploy

3. **Database:**
   - Use Neon (free tier) or Supabase (free tier) for PostgreSQL
   - Update `DATABASE_URL` in Vercel environment variables

4. **Storage:**
   - Use Cloudflare R2 (free tier) or Backblaze B2
   - Configure S3 environment variables

### Self-Hosted

1. **Build the application:**

```bash
npm run build
```

2. **Start production server:**

```bash
npm start
```

3. **Use Docker Compose for full stack:**

```bash
docker-compose -f docker-compose.prod.yml up -d
```

## Adding a New Metadata Field

To add a new field end-to-end:

1. **Update Prisma schema** (`prisma/schema.prisma`):
   ```prisma
   model Release {
     // ... existing fields
     newField String?
   }
   ```

2. **Create and run migration:**
   ```bash
   npm run db:migrate
   ```

3. **Update TypeScript types:**
   ```bash
   npm run db:generate
   ```

4. **Add to UI:**
   - Update submission form (`app/submit/page.tsx`)
   - Update release detail page (`app/releases/[id]/page.tsx`)
   - Update markdown importer if needed (`lib/markdown-importer.ts`)

5. **Configure permissions** (Admin UI):
   - Set field visibility and edit permissions per role
   - Mark as required/optional for forms

6. **Update CSV export** (`app/api/export/csv/route.ts`):
   - Add field to export columns

## Importing Markdown Files

1. **Export from Notion:**
   - Export your database as Markdown
   - Each release should be a separate markdown file

2. **Import in the app:**
   - Navigate to `/import`
   - Upload one or more `.md` files
   - Review the preview for conflicts
   - Click "Import"

3. **Markdown Format:**
   The importer expects key-value pairs like:
   ```
   Artist Name: John Doe
   Legal Name: John Smith
   Single/Album?: Album
   Album/Single Name: My Album
   Artist's Chosen Date: 2024-01-15
   Legacy Release Date: 2024-01-20
   Song 1 Name: Song One
   Song 1 Composer: Composer Name
   Flow Request: Yes
   Flow: Uploaded
   ```

## Roles and Permissions

### Admin/Manager
- Full access to all features
- Can configure field permissions
- Can manage users and roles

### A&R
- Can view and edit all release data
- Can assign releases to themselves
- Can request platform uploads

### Data Team
- Can view and edit all data
- Can import markdown files
- Can export CSV

### Platform Teams
- Can view releases requested for their platform
- Can approve/reject/update upload status
- YouTube team can select channels

### Client/Artist
- Can only access submission forms
- Can view their submission status
- Cannot see internal database

## Field-Level Permissions

Configure which roles can view/edit specific fields:

1. Navigate to `/admin/permissions`
2. Select entity type (Release, Track, PlatformRequest)
3. Configure per role:
   - View permission
   - Edit permission
   - Required/Optional for forms

## CSV Export

Two export modes:

1. **Track-level**: One row per song (repeats release-level fields)
   - Access: `/api/export/csv?mode=track`

2. **Release-level**: One row per release (songs as JSON column)
   - Access: `/api/export/csv?mode=release`

Both support filters via query parameters.

## CSV Import

A Notion-style CSV import wizard allows you to import complex music catalog CSVs with multiple songs per submission row.

### Access

Navigate to `/import-csv` to access the import wizard.

### How CSV Import Works

1. **Upload**: Drag and drop or select a CSV file
2. **Preview**: Review the first 20-50 rows of your CSV
3. **Mapping**: Map CSV columns to target fields:
   - **Submission fields**: Submission ID, Legal Name, Dates, Platform requests, etc.
   - **Song fields**: Song Name, Artist Name, Composer, Genre, etc.
   - Auto-detection suggests mappings based on column names
   - Song patterns (Song 1 Name, Song 2 Name, etc.) are automatically detected
4. **Import**: Process the CSV and create/update records
5. **Results**: View import statistics and download error reports

### CSV Structure

The importer handles CSVs where:
- Each row represents one submission
- Each row can contain up to 20 songs (Song 1 Name, Song 2 Name, etc.)
- Submission-level fields are stored once per row
- Song-level fields are repeated for each song (Song N Artist Name, Song N Composer, etc.)

### Critical Rules

**Never creates empty song records**: A song is only created if `Song N Name` is non-empty. If a row has:
- Song 1 Name: "Track One" ✓
- Song 2 Name: "Track Two" ✓
- Song 3 Name: (empty) ✗
- Song 4-20 Name: (empty) ✗

Then exactly 2 song records are created (no placeholders, no null rows).

### Database Behavior

- **Submissions**: Stored as `Release` records with:
  - `submissionId`: Stable ID from CSV for upsert operations
  - `rawRow`: JSON field storing original CSV row for audit/debug
  - All submission-level fields mapped to Release properties

- **Songs**: Stored as `Track` records with:
  - Linked to parent Release via `releaseId`
  - All song fields (title, artistName, composer, genre, etc.)
  - `trackNumber`: Index from CSV (1-20)

### Supported Fields

**Submission Fields:**
- IDs: Submission ID, Respondent ID
- Dates: Submitted At, Created Time, Released Date, Legacy Release Date, LARS Released Date, Artist's Chosen Date
- Legal: Legal Name, Signature, Royalty Receive Method
- Release: Single/Album?, Album ID, Payment Remarks, Notes
- Platforms: FB, Flow, TikTok, YouTube, Intl' Streaming, Ringtunes, VUClip (with Request variants)
- Ops: Filezilla, Upload Status, Fully Uploaded, Permit Status, Copyright Status
- Rollups: All Bands, All Composers, All Record Labels, All Studios

**Song Fields (repeated for Song 1-20):**
- Song N Name (required for song creation)
- Song N Artist Name
- Song N Band Name
- Song N Composer Name
- Song N Record Label Name
- Song N Studio Name
- Song N Genre (Song 1-15 only)
- Song N Song Produce (Archived)
- Song 9 Performer Name (one-off field)

### Date Parsing

The importer handles various date formats:
- "April 1, 2023 5:56 PM"
- "January 31, 2001"
- "MM/DD/YYYY"
- "YYYY-MM-DD"
- ISO format dates

### Upsert Behavior

- Uses `Submission ID` as the stable identifier
- If a submission with the same ID exists, it updates the existing record
- If not, creates a new submission
- On update, existing tracks are deleted and recreated from CSV data

## Platform Portals

Each platform team has a dedicated portal:

- `/platforms/youtube` - YouTube Team
- `/platforms/flow` - Flow Team
- `/platforms/ringtunes` - Ringtunes Team
- `/platforms/international-streaming` - International Streaming Team
- `/platforms/facebook` - Facebook Team
- `/platforms/tiktok` - TikTok Team

Features:
- View all requests for the platform
- Approve/reject requests
- Update upload status and links
- YouTube: Select channel for uploads

## Development Workflow

1. **Create a feature branch:**
   ```bash
   git checkout -b feature/my-feature
   ```

2. **Make changes and commit:**
   ```bash
   git add .
   git commit -m "Add feature X"
   ```

3. **Push and create Pull Request:**
   - PR automatically deploys to staging
   - Test in staging environment
   - Get approval, then merge to main
   - Main branch deploys to production

## Database Migrations

```bash
# Create a new migration
npm run db:migrate

# Apply migrations (production)
npm run db:push

# View database in Prisma Studio
npm run db:studio
```

## Troubleshooting

### Database Connection Issues
- Verify `DATABASE_URL` is correct
- Check PostgreSQL is running
- Ensure database exists

### Authentication Issues
- Verify `NEXTAUTH_SECRET` is set
- Check `NEXTAUTH_URL` matches your app URL
- Clear browser cookies if needed

### File Upload Issues
- Verify S3 credentials are correct
- Check bucket exists and is accessible
- Verify `S3_FORCE_PATH_STYLE` for MinIO

## License

Private - All rights reserved

## Support

For issues or questions, contact the development team.

