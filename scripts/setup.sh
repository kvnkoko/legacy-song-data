#!/bin/bash

set -e

echo "🚀 Master Song Data - Setup Script"
echo "===================================="
echo ""

# Check if .env exists
if [ ! -f .env ]; then
    echo "📝 Creating .env file from env.example..."
    cp env.example .env
    echo "✅ Created .env file"
else
    echo "✅ .env file already exists"
fi

# Generate NEXTAUTH_SECRET if not set
if ! grep -q "NEXTAUTH_SECRET=" .env || grep -q "your-secret-key-here" .env; then
    echo "🔐 Generating NEXTAUTH_SECRET..."
    SECRET=$(openssl rand -base64 32)
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        sed -i '' "s|NEXTAUTH_SECRET=.*|NEXTAUTH_SECRET=\"$SECRET\"|" .env
    else
        # Linux
        sed -i "s|NEXTAUTH_SECRET=.*|NEXTAUTH_SECRET=\"$SECRET\"|" .env
    fi
    echo "✅ Generated NEXTAUTH_SECRET"
fi

# Check DATABASE_URL
if ! grep -q "DATABASE_URL=" .env || grep -q "user:password" .env; then
    echo ""
    echo "⚠️  DATABASE_URL needs to be configured!"
    echo ""
    echo "Choose an option:"
    echo "1. Use Neon (Free cloud database - Recommended)"
    echo "2. Use local PostgreSQL"
    echo "3. Use Docker PostgreSQL"
    echo ""
    read -p "Enter choice (1-3): " choice
    
    case $choice in
        1)
            echo ""
            echo "📦 Setting up with Neon:"
            echo "1. Go to https://neon.tech and sign up (free)"
            echo "2. Create a new project"
            echo "3. Copy the connection string"
            echo "4. Paste it here:"
            read -p "DATABASE_URL: " db_url
            # Clean up the connection string (remove psql command, quotes, etc.)
            db_url=$(echo "$db_url" | sed "s/^psql[[:space:]]*['\"]*//" | sed "s/['\"]*$//" | sed "s/^['\"]*//" | xargs)
            if [[ "$OSTYPE" == "darwin"* ]]; then
                sed -i '' "s|DATABASE_URL=.*|DATABASE_URL=\"$db_url\"|" .env
            else
                sed -i "s|DATABASE_URL=.*|DATABASE_URL=\"$db_url\"|" .env
            fi
            echo "✅ DATABASE_URL updated"
            ;;
        2)
            echo ""
            echo "📦 Setting up local PostgreSQL..."
            read -p "PostgreSQL username (default: $(whoami)): " pg_user
            pg_user=${pg_user:-$(whoami)}
            read -sp "PostgreSQL password (press enter if none): " pg_pass
            echo ""
            
            # Try to create database
            if [ -z "$pg_pass" ]; then
                createdb master_song_data 2>/dev/null || echo "⚠️  Could not create database. Please run: createdb master_song_data"
                db_url="postgresql://$pg_user@localhost:5432/master_song_data?schema=public"
            else
                createdb master_song_data 2>/dev/null || echo "⚠️  Could not create database. Please run: createdb master_song_data"
                db_url="postgresql://$pg_user:$pg_pass@localhost:5432/master_song_data?schema=public"
            fi
            
            if [[ "$OSTYPE" == "darwin"* ]]; then
                sed -i '' "s|DATABASE_URL=.*|DATABASE_URL=\"$db_url\"|" .env
            else
                sed -i "s|DATABASE_URL=.*|DATABASE_URL=\"$db_url\"|" .env
            fi
            echo "✅ DATABASE_URL updated"
            ;;
        3)
            echo ""
            echo "📦 Setting up Docker PostgreSQL..."
            if ! command -v docker &> /dev/null; then
                echo "❌ Docker is not installed. Please install Docker first."
                exit 1
            fi
            
            echo "Starting PostgreSQL container..."
            docker-compose up -d postgres
            
            echo "Waiting for PostgreSQL to be ready..."
            sleep 5
            
            db_url="postgresql://postgres:postgres@localhost:5432/master_song_data?schema=public"
            if [[ "$OSTYPE" == "darwin"* ]]; then
                sed -i '' "s|DATABASE_URL=.*|DATABASE_URL=\"$db_url\"|" .env
            else
                sed -i "s|DATABASE_URL=.*|DATABASE_URL=\"$db_url\"|" .env
            fi
            echo "✅ DATABASE_URL updated"
            ;;
        *)
            echo "❌ Invalid choice"
            exit 1
            ;;
    esac
fi

echo ""
echo "📦 Installing dependencies..."
npm install

echo ""
echo "🗄️  Setting up database..."
npm run db:generate

echo ""
echo "🔄 Running migrations..."
npm run db:migrate || {
    echo "⚠️  Migration failed. This might be normal if the database is new."
    echo "Trying to push schema instead..."
    npx prisma db push
}

echo ""
echo "🌱 Seeding database..."
npm run db:seed || echo "⚠️  Seed failed (this is okay if users already exist)"

echo ""
echo "✅ Setup complete!"
echo ""
echo "Next steps:"
echo "1. Review your .env file to make sure everything is correct"
echo "2. Run: npm run dev"
echo "3. Open http://localhost:3000"
echo ""
echo "Default login (if seeded):"
echo "  Admin: admin@example.com / admin123"
echo "  A&R: ar@example.com / ar123"
echo ""

