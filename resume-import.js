// Script to resume a stuck import session
// Usage: node resume-import.js <sessionId>

const sessionId = process.argv[2];

if (!sessionId) {
  console.error('Usage: node resume-import.js <sessionId>');
  console.error('Example: node resume-import.js cmjn2fry...');
  process.exit(1);
}

console.log(`Attempting to resume import session: ${sessionId}`);

// Note: This would need to be called via the API endpoint
// The actual resume should be done through the API: POST /api/import/csv/force-resume
// with body: { sessionId: "cmjn2fry..." }

console.log('\nTo resume this import, use the API endpoint:');
console.log('POST /api/import/csv/force-resume');
console.log('Body: { "sessionId": "' + sessionId + '" }');
console.log('\nOr use curl:');
console.log('curl -X POST http://localhost:3000/api/import/csv/force-resume \\');
console.log('  -H "Content-Type: application/json" \\');
console.log('  -d \'{"sessionId":"' + sessionId + '"}\'');
