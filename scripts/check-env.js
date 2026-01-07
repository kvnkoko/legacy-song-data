// Simple script to check .env file format
const fs = require('fs')
const path = require('path')

const envPath = path.join(process.cwd(), '.env')

if (!fs.existsSync(envPath)) {
  console.log('❌ .env file not found!')
  process.exit(1)
}

const envContent = fs.readFileSync(envPath, 'utf8')
const dbUrlLine = envContent.split('\n').find(line => line.startsWith('DATABASE_URL'))

if (!dbUrlLine) {
  console.log('❌ DATABASE_URL not found in .env file')
  process.exit(1)
}

console.log('Current DATABASE_URL line:')
console.log(dbUrlLine)
console.log('')

// Extract the value
const match = dbUrlLine.match(/DATABASE_URL=(.+)/)
if (match) {
  let value = match[1].trim()
  
  // Remove outer quotes
  if ((value.startsWith('"') && value.endsWith('"')) || 
      (value.startsWith("'") && value.endsWith("'"))) {
    value = value.slice(1, -1)
  }
  
  console.log('Extracted value:')
  console.log(value)
  console.log('')
  
  // Check if it starts correctly
  if (value.startsWith('postgresql://') || value.startsWith('postgres://')) {
    console.log('✅ DATABASE_URL format looks correct!')
    console.log('The issue might be with the connection itself.')
  } else if (value.includes('psql')) {
    console.log('❌ PROBLEM: DATABASE_URL contains "psql" command')
    console.log('')
    console.log('Fix: Remove "psql" and quotes. It should be:')
    console.log('DATABASE_URL="postgresql://user:password@host/dbname?sslmode=require"')
  } else {
    console.log('❌ PROBLEM: DATABASE_URL does not start with postgresql:// or postgres://')
    console.log('')
    console.log('It should start with: postgresql://')
  }
}






