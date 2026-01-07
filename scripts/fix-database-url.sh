#!/bin/bash

echo "🔧 Fixing DATABASE_URL in .env file..."

if [ ! -f .env ]; then
    echo "❌ .env file not found!"
    exit 1
fi

# Read current DATABASE_URL
CURRENT_URL=$(grep "^DATABASE_URL=" .env | cut -d '=' -f2- | tr -d '"' | tr -d "'")

echo "Current DATABASE_URL: $CURRENT_URL"

# Remove psql command if present
CLEAN_URL=$(echo "$CURRENT_URL" | sed "s/^psql[[:space:]]*//" | sed "s/^['\"]*//" | sed "s/['\"]*$//" | xargs)

# Check if it starts with postgresql:// or postgres://
if [[ ! "$CLEAN_URL" =~ ^postgresql:// ]] && [[ ! "$CLEAN_URL" =~ ^postgres:// ]]; then
    echo "❌ DATABASE_URL doesn't start with postgresql:// or postgres://"
    echo "Please check your .env file and make sure DATABASE_URL looks like:"
    echo "DATABASE_URL=\"postgresql://user:password@host:port/database?sslmode=require\""
    exit 1
fi

# Update .env file
if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    sed -i '' "s|^DATABASE_URL=.*|DATABASE_URL=\"$CLEAN_URL\"|" .env
else
    # Linux
    sed -i "s|^DATABASE_URL=.*|DATABASE_URL=\"$CLEAN_URL\"|" .env
fi

echo "✅ DATABASE_URL fixed!"
echo "New DATABASE_URL: $CLEAN_URL"
echo ""
echo "Now run: npm run fix:admin"






