#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🔍 Checking setup...\n');

// Check for .env file
const envPath = path.join(process.cwd(), '.env');
const envExamplePath = path.join(process.cwd(), 'env.example');

if (!fs.existsSync(envPath)) {
  console.log('❌ .env file not found!');
  if (fs.existsSync(envExamplePath)) {
    console.log('✅ env.example found - you can copy it: cp env.example .env');
  }
  console.log('');
} else {
  console.log('✅ .env file exists');
  
  // Check for critical env vars
  const envContent = fs.readFileSync(envPath, 'utf8');
  const required = [
    'DATABASE_URL',
    'NEXTAUTH_SECRET',
    'NEXTAUTH_URL'
  ];
  
  const missing = required.filter(key => !envContent.includes(`${key}=`));
  if (missing.length > 0) {
    console.log(`⚠️  Missing environment variables: ${missing.join(', ')}`);
  } else {
    console.log('✅ Required environment variables found');
  }
  console.log('');
}

// Check for node_modules
if (!fs.existsSync(path.join(process.cwd(), 'node_modules'))) {
  console.log('❌ node_modules not found! Run: npm install');
} else {
  console.log('✅ node_modules exists');
}

// Check for Prisma client
const prismaClientPath = path.join(process.cwd(), 'node_modules', '.prisma', 'client');
if (!fs.existsSync(prismaClientPath)) {
  console.log('⚠️  Prisma client not generated! Run: npx prisma generate');
} else {
  console.log('✅ Prisma client generated');
}

console.log('\n📋 Next steps:');
console.log('1. Make sure .env file exists with DATABASE_URL, NEXTAUTH_SECRET, NEXTAUTH_URL');
console.log('2. Run: npx prisma generate');
console.log('3. Run: npx prisma db push (or migrate)');
console.log('4. Run: npm run dev');
console.log('\n');





