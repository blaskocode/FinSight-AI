// Assign personas to all users and list them by persona type
// Usage: node scripts/assign-personas-and-list.js

const path = require('path');
const sqlite3 = require(path.join(__dirname, '..', 'backend', 'node_modules', 'sqlite3')).verbose();
const { assignPersona, storePersonaAssignment } = require(path.join(__dirname, '..', 'backend', 'personas', 'assignPersona.js'));

const DB_PATH = path.join(__dirname, '..', 'backend', 'finsight.db');

const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) {
    console.error('Error opening database:', err);
    process.exit(1);
  }
});

// Helper to run SQL queries
function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function(err) {
      if (err) reject(err);
      else resolve(this);
    });
  });
}

function get(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

function all(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

async function assignPersonasToAllUsers() {
  console.log('\n🔄 Assigning personas to all users...\n');
  
  // Get all users
  const users = await all('SELECT user_id, name, email FROM users ORDER BY created_at DESC');
  
  console.log(`Found ${users.length} users. Assigning personas...\n`);
  
  const results = {
    high_utilization: [],
    variable_income: [],
    subscription_heavy: [],
    savings_builder: [],
    lifestyle_creep: [],
    no_persona: []
  };
  
  for (let i = 0; i < users.length; i++) {
    const user = users[i];
    
    try {
      // Check if user already has a persona
      const existingPersona = await get(
        'SELECT persona_type FROM personas WHERE user_id = ? ORDER BY assigned_at DESC LIMIT 1',
        [user.user_id]
      );
      
      if (existingPersona) {
        // User already has a persona, just categorize them
        const personaType = existingPersona.persona_type;
        if (results[personaType]) {
          results[personaType].push(user);
        } else {
          results.no_persona.push(user);
        }
        
        if ((i + 1) % 20 === 0 || i === users.length - 1) {
          process.stdout.write(`\r  Processed ${i + 1}/${users.length} users...`);
        }
        continue;
      }
      
      // Assign persona
      const assignment = await assignPersona(user.user_id);
      
      if (assignment) {
        const secondaryPersonaTypes = assignment.secondary.map(p => p.personaType);
        await storePersonaAssignment(user.user_id, assignment.primary, secondaryPersonaTypes);
        
        const personaType = assignment.primary.personaType;
        if (results[personaType]) {
          results[personaType].push(user);
        } else {
          results.no_persona.push(user);
        }
      } else {
        results.no_persona.push(user);
      }
      
      if ((i + 1) % 20 === 0 || i === users.length - 1) {
        process.stdout.write(`\r  Processed ${i + 1}/${users.length} users...`);
      }
    } catch (error) {
      console.error(`\nError processing user ${user.user_id}:`, error.message);
      results.no_persona.push(user);
    }
  }
  
  console.log('\n\n✅ Persona assignment complete!\n');
  return results;
}

function formatPersonaType(type) {
  return type
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

async function displayResults(results) {
  console.log('='.repeat(80));
  console.log('📊 USERS BY PERSONA TYPE\n');
  
  const personaTypes = [
    'high_utilization',
    'variable_income',
    'subscription_heavy',
    'savings_builder',
    'lifestyle_creep',
    'no_persona'
  ];
  
  for (const personaType of personaTypes) {
    const users = results[personaType] || [];
    if (users.length === 0) continue;
    
    const displayName = personaType === 'no_persona' 
      ? 'NO PERSONA ASSIGNED' 
      : formatPersonaType(personaType);
    
    console.log(`${displayName} (${users.length} users):`);
    console.log('-'.repeat(80));
    
    // Show first 10 users
    users.slice(0, 10).forEach((user, idx) => {
      console.log(`  ${(idx + 1).toString().padStart(2)}. ${user.name.padEnd(25)} | ${user.user_id}`);
    });
    
    if (users.length > 10) {
      console.log(`  ... and ${users.length - 10} more`);
    }
    
    console.log('');
  }
  
  console.log('='.repeat(80));
  console.log('\n🚀 QUICK TEST USER IDs BY PERSONA:\n');
  
  // Show one user from each persona type for quick testing
  const quickTestUsers = [];
  for (const personaType of personaTypes) {
    if (personaType === 'no_persona') continue;
    const users = results[personaType] || [];
    if (users.length > 0) {
      quickTestUsers.push({
        persona: formatPersonaType(personaType),
        user: users[0]
      });
    }
  }
  
  quickTestUsers.forEach((item, idx) => {
    console.log(`${idx + 1}. ${item.persona}:`);
    console.log(`   User ID: ${item.user.user_id}`);
    console.log(`   Name: ${item.user.name}`);
    console.log('');
  });
  
  if (results.no_persona.length > 0) {
    console.log(`\n⚠️  ${results.no_persona.length} users could not be assigned a persona`);
    console.log('   (Their financial data may not match any persona criteria)');
  }
  
  console.log('\n💡 To test a user:');
  console.log('   1. Copy a user_id from above');
  console.log('   2. Go to http://localhost:3000');
  console.log('   3. Enter the user_id in the consent form');
  console.log('   4. Check consent and submit\n');
}

async function main() {
  try {
    const results = await assignPersonasToAllUsers();
    await displayResults(results);
  } catch (error) {
    console.error('\n❌ Error:', error);
    process.exit(1);
  } finally {
    db.close();
  }
}

main();

