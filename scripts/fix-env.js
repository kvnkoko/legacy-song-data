const fs = require('fs')
const path = require('path')
const readline = require('readline')

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
})

function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, resolve)
  })
}

async function main() {
  console.log('🔧 Fixing .env file...\n')
  
  const envPath = path.join(process.cwd(), '.env')
  
  // Read existing .env if it exists
  let envContent = ''
  if (fs.existsSync(envPath)) {
    envContent = fs.readFileSync(envPath, 'utf8')
    console.log('✅ Found existing .env file\n')
  }
  
  // Get DATABASE_URL
  console.log('📝 Please provide your Neon database connection string.')
  console.log('   It should look like: postgresql://user:password@host/database?sslmode=require')
  console.log('   (You can copy it from https://console.neon.tech)\n')
  
  const dbUrl = await question('Paste your DATABASE_URL (or press Enter to keep existing): ')
  
  let cleanDbUrl = dbUrl.trim()
  
  // If empty, try to extract from existing file
  if (!cleanDbUrl && envContent) {
    const match = envContent.match(/^DATABASE_URL=(.+)$/m)
    if (match) {
      cleanDbUrl = match[1].trim().replace(/^["']|["']$/g, '')
      console.log(`\n📋 Found existing: ${cleanDbUrl.substring(0, 50)}...`)
    }
  }
  
  if (!cleanDbUrl) {
    console.log('\n❌ No DATABASE_URL provided')
    process.exit(1)
  }
  
  // Clean up the URL
  cleanDbUrl = cleanDbUrl
    .replace(/^psql\s+/, '') // Remove psql command
    .replace(/^["']+/, '') // Remove leading quotes
    .replace(/["']+$/, '') // Remove trailing quotes
    .trim()
  
  // Validate
  if (!cleanDbUrl.startsWith('postgresql://') && !cleanDbUrl.startsWith('postgres://')) {
    console.log('\n❌ Error: Connection string must start with postgresql:// or postgres://')
    console.log(`   You provided: ${cleanDbUrl.substring(0, 50)}...`)
    process.exit(1)
  }
  
  // Generate NEXTAUTH_SECRET if needed
  let nextAuthSecret = ''
  if (envContent) {
    const secretMatch = envContent.match(/^NEXTAUTH_SECRET=(.+)$/m)
    if (secretMatch) {
      nextAuthSecret = secretMatch[1].trim().replace(/^["']|["']$/g, '')
    }
  }
  
  if (!nextAuthSecret || nextAuthSecret === 'your-secret-key-here') {
    const crypto = require('crypto')
    nextAuthSecret = crypto.randomBytes(32).toString('base64')
    console.log('\n🔐 Generated new NEXTAUTH_SECRET')
  }
  
  // Build new .env content
  const newEnvContent = `# Database
DATABASE_URL="${cleanDbUrl}"

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="${nextAuthSecret}"

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
`
  
  // Backup existing .env
  if (fs.existsSync(envPath)) {
    fs.copyFileSync(envPath, envPath + '.backup')
    console.log('💾 Backed up existing .env to .env.backup')
  }
  
  // Write new .env
  fs.writeFileSync(envPath, newEnvContent)
  
  console.log('\n✅ .env file fixed!')
  console.log(`\n📋 DATABASE_URL: ${cleanDbUrl.substring(0, 60)}...`)
  console.log('\n🚀 Next steps:')
  console.log('   1. npm run db:migrate')
  console.log('   2. npm run db:seed')
  console.log('   3. npm run dev')
  
  rl.close()
}

main().catch(console.error)






