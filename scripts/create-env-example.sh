#!/bin/bash

echo "📝 Creating a clean .env file template..."
echo ""

# Read current .env to preserve other variables
if [ -f .env ]; then
    echo "Backing up current .env to .env.backup"
    cp .env .env.backup
fi

# Get DATABASE_URL from user
echo "Please paste your Neon connection string:"
echo "(It should start with postgresql://)"
read -r DB_URL

# Clean it up
CLEAN_DB_URL=$(echo "$DB_URL" | sed "s/^psql[[:space:]]*//" | sed "s/^['\"]*//" | sed "s/['\"]*$//" | xargs)

# Verify it starts correctly
if [[ ! "$CLEAN_DB_URL" =~ ^postgresql:// ]]; then
    echo "❌ Error: Connection string must start with postgresql://"
    echo "You provided: ${CLEAN_DB_URL:0:30}..."
    exit 1
fi

# Generate NEXTAUTH_SECRET
SECRET=$(openssl rand -base64 32 2>/dev/null || echo "change-this-secret-key-$(date +%s)")

# Create .env file
cat > .env << EOF
# Database
DATABASE_URL="$CLEAN_DB_URL"

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="$SECRET"

# Google OAuth (optional)
GOOGLE_CLIENT_ID=""
GOOGLE_CLIENT_SECRET=""

# S3-Compatible Storage (optional)
S3_ENDPOINT=""
S3_REGION="us-east-1"
S3_ACCESS_KEY_ID=""
S3_SECRET_ACCESS_KEY=""
S3_BUCKET_NAME="master-song-data"
S3_FORCE_PATH_STYLE="false"
S3_PUBLIC_URL=""

# Environment
NODE_ENV="development"
EOF

echo ""
echo "✅ .env file created!"
echo ""
echo "DATABASE_URL: ${CLEAN_DB_URL:0:50}..."
echo "NEXTAUTH_SECRET: Generated"
echo ""
echo "Now run: npm run db:migrate"






