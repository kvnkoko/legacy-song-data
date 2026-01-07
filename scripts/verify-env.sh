#!/bin/bash

echo "🔍 Verifying .env file..."
echo ""

# Check if .env exists
if [ ! -f .env ]; then
    echo "❌ .env file not found!"
    exit 1
fi

echo "✅ .env file exists"
echo ""

# Show DATABASE_URL line (mask password)
echo "DATABASE_URL line (password masked):"
grep "^DATABASE_URL=" .env | sed 's/:[^:@]*@/:****@/g' || echo "❌ DATABASE_URL not found in .env"
echo ""

# Check for common issues
DB_LINE=$(grep "^DATABASE_URL=" .env)

if echo "$DB_LINE" | grep -q "psql"; then
    echo "❌ PROBLEM: DATABASE_URL contains 'psql' command"
    echo "   Remove 'psql' from the line"
    echo ""
fi

if echo "$DB_LINE" | grep -q "^DATABASE_URL=postgresql://"; then
    echo "✅ DATABASE_URL starts correctly"
elif echo "$DB_LINE" | grep -q "^DATABASE_URL=\"postgresql://"; then
    echo "✅ DATABASE_URL starts correctly (with quotes)"
else
    echo "❌ PROBLEM: DATABASE_URL doesn't start with postgresql://"
    echo "   First 30 chars: $(echo "$DB_LINE" | cut -c1-30)"
    echo ""
fi

# Check for multiple DATABASE_URL entries
COUNT=$(grep -c "^DATABASE_URL=" .env || echo "0")
if [ "$COUNT" -gt 1 ]; then
    echo "⚠️  WARNING: Multiple DATABASE_URL entries found ($COUNT)"
    echo "   Remove duplicates, keep only one"
    echo ""
fi

echo "---"
echo "To fix:"
echo "1. Open .env file"
echo "2. Find DATABASE_URL line"
echo "3. Make sure it looks like:"
echo '   DATABASE_URL="postgresql://user:password@host/db?sslmode=require"'
echo "4. No 'psql' command"
echo "5. No extra quotes inside"
echo "6. Save and try again"






