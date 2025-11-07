// List all users in the database with their personas
// Usage: node scripts/list-users.js
// Note: Run from project root, requires backend/node_modules

const path = require('path');
const sqlite3 = require(path.join(__dirname, '..', 'backend', 'node_modules', 'sqlite3')).verbose();

const DB_PATH = path.join(__dirname, '..', 'backend', 'finsight.db');

const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) {
    console.error('Error opening database:', err);
    process.exit(1);
  }
});

console.log('\n📋 Available Users in Database\n');
console.log('='.repeat(80));

db.all(`
  SELECT 
    u.user_id,
    u.name,
    u.email,
    p.persona_type,
    c.status as consent_status
  FROM users u
  LEFT JOIN personas p ON u.user_id = p.user_id 
    AND p.assigned_at = (SELECT MAX(assigned_at) FROM personas WHERE user_id = u.user_id)
  LEFT JOIN consents c ON u.user_id = c.user_id 
    AND c.status = 'active'
  ORDER BY u.created_at DESC
  LIMIT 50
`, [], (err, rows) => {
  if (err) {
    console.error('Error querying database:', err);
    db.close();
    process.exit(1);
  }

  if (rows.length === 0) {
    console.log('No users found in database.');
    console.log('\n💡 To generate users, run: cd data-gen && node index.js\n');
    db.close();
    return;
  }

  // Group by persona
  const byPersona = {};
  rows.forEach(row => {
    const persona = row.persona_type || 'No Persona';
    if (!byPersona[persona]) {
      byPersona[persona] = [];
    }
    byPersona[persona].push(row);
  });

  // Display grouped by persona
  Object.keys(byPersona).forEach(persona => {
    console.log(`\n${persona.toUpperCase().replace(/_/g, ' ')} (${byPersona[persona].length} users):`);
    console.log('-'.repeat(80));
    
    byPersona[persona].slice(0, 10).forEach((user, idx) => {
      const consent = user.consent_status === 'active' ? '✅' : '❌';
      console.log(`  ${idx + 1}. ${user.name.padEnd(25)} | ${user.user_id.padEnd(35)} | ${consent}`);
    });
    
    if (byPersona[persona].length > 10) {
      console.log(`  ... and ${byPersona[persona].length - 10} more`);
    }
  });

  console.log('\n' + '='.repeat(80));
  console.log(`\n📊 Total users shown: ${rows.length}`);
  console.log('\n💡 To use a user:');
  console.log('   1. Copy a user_id from above');
  console.log('   2. Go to http://localhost:3000');
  console.log('   3. Enter the user_id in the consent form');
  console.log('   4. Check consent and submit\n');

  // Show first 5 user IDs for quick testing
  console.log('🚀 Quick Test User IDs (first 5):');
  rows.slice(0, 5).forEach((user, idx) => {
    console.log(`   ${idx + 1}. ${user.user_id} (${user.name})`);
  });
  console.log('');

  db.close();
});

