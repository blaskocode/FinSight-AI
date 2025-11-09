// Find users with specific numbers of persona assignments
// Usage: node scripts/find-users-by-persona-count.js

const path = require('path');
const sqlite3 = require(path.join(__dirname, '..', 'backend', 'node_modules', 'sqlite3')).verbose();

const DB_PATH = path.join(__dirname, '..', 'backend', 'finsight.db');

const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) {
    console.error('Error opening database:', err);
    process.exit(1);
  }
});

function all(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
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

async function findUsersByPersonaCount(count) {
  // Find users with exactly the specified number of persona assignments
  const users = await all(`
    SELECT 
      u.user_id,
      u.name,
      u.email,
      COUNT(p.persona_id) as persona_count,
      GROUP_CONCAT(p.persona_type || ' (' || strftime('%Y-%m-%d', p.assigned_at) || ')', ' | ') as personas
    FROM users u
    INNER JOIN personas p ON u.user_id = p.user_id
    GROUP BY u.user_id, u.name, u.email
    HAVING COUNT(p.persona_id) = ?
    ORDER BY MAX(p.assigned_at) DESC
    LIMIT 5
  `, [count]);
  
  return users;
}

async function getUserPersonaDetails(userId) {
  // Get all persona assignments for a specific user with details
  const personas = await all(`
    SELECT 
      persona_id,
      persona_type,
      assigned_at,
      window_days,
      signals,
      secondary_personas
    FROM personas
    WHERE user_id = ?
    ORDER BY assigned_at ASC
  `, [userId]);
  
  return personas;
}

async function main() {
  console.log('\n🔍 Finding users by persona count...\n');
  console.log('='.repeat(80));
  
  try {
    // Find user with 1 persona
    console.log('\n1️⃣  USER WITH ONE PERSONA:');
    console.log('-'.repeat(80));
    const onePersonaUsers = await findUsersByPersonaCount(1);
    if (onePersonaUsers.length > 0) {
      const user = onePersonaUsers[0];
      console.log(`   User ID: ${user.user_id}`);
      console.log(`   Name: ${user.name}`);
      console.log(`   Email: ${user.email}`);
      console.log(`   Persona Count: ${user.persona_count}`);
      console.log(`   Personas: ${user.personas}`);
      
      const details = await getUserPersonaDetails(user.user_id);
      console.log(`\n   Persona Details:`);
      details.forEach((p, idx) => {
        console.log(`     ${idx + 1}. ${p.persona_type} (assigned: ${p.assigned_at})`);
        if (p.secondary_personas) {
          const secondary = JSON.parse(p.secondary_personas);
          if (secondary && secondary.length > 0) {
            console.log(`        Secondary: ${secondary.join(', ')}`);
          }
        }
      });
    } else {
      console.log('   ❌ No users found with exactly 1 persona');
    }
    
    // Find user with 2 personas
    console.log('\n\n2️⃣  USER WITH TWO PERSONAS:');
    console.log('-'.repeat(80));
    const twoPersonaUsers = await findUsersByPersonaCount(2);
    if (twoPersonaUsers.length > 0) {
      const user = twoPersonaUsers[0];
      console.log(`   User ID: ${user.user_id}`);
      console.log(`   Name: ${user.name}`);
      console.log(`   Email: ${user.email}`);
      console.log(`   Persona Count: ${user.persona_count}`);
      console.log(`   Personas: ${user.personas}`);
      
      const details = await getUserPersonaDetails(user.user_id);
      console.log(`\n   Persona Details:`);
      details.forEach((p, idx) => {
        console.log(`     ${idx + 1}. ${p.persona_type} (assigned: ${p.assigned_at})`);
        if (p.secondary_personas) {
          const secondary = JSON.parse(p.secondary_personas);
          if (secondary && secondary.length > 0) {
            console.log(`        Secondary: ${secondary.join(', ')}`);
          }
        }
      });
    } else {
      console.log('   ❌ No users found with exactly 2 personas');
    }
    
    // Find user with 3 personas
    console.log('\n\n3️⃣  USER WITH THREE PERSONAS:');
    console.log('-'.repeat(80));
    const threePersonaUsers = await findUsersByPersonaCount(3);
    if (threePersonaUsers.length > 0) {
      const user = threePersonaUsers[0];
      console.log(`   User ID: ${user.user_id}`);
      console.log(`   Name: ${user.name}`);
      console.log(`   Email: ${user.email}`);
      console.log(`   Persona Count: ${user.persona_count}`);
      console.log(`   Personas: ${user.personas}`);
      
      const details = await getUserPersonaDetails(user.user_id);
      console.log(`\n   Persona Details:`);
      details.forEach((p, idx) => {
        console.log(`     ${idx + 1}. ${p.persona_type} (assigned: ${p.assigned_at})`);
        if (p.secondary_personas) {
          const secondary = JSON.parse(p.secondary_personas);
          if (secondary && secondary.length > 0) {
            console.log(`        Secondary: ${secondary.join(', ')}`);
          }
        }
      });
    } else {
      console.log('   ❌ No users found with exactly 3 personas');
    }
    
    // Summary
    console.log('\n' + '='.repeat(80));
    console.log('\n📊 Summary:');
    console.log(`   Users with 1 persona: ${onePersonaUsers.length > 0 ? '✅ Found' : '❌ None'}`);
    console.log(`   Users with 2 personas: ${twoPersonaUsers.length > 0 ? '✅ Found' : '❌ None'}`);
    console.log(`   Users with 3 personas: ${threePersonaUsers.length > 0 ? '✅ Found' : '❌ None'}`);
    
    if (onePersonaUsers.length > 0 || twoPersonaUsers.length > 0 || threePersonaUsers.length > 0) {
      console.log('\n💡 To test these users:');
      console.log('   1. Copy a user_id from above');
      console.log('   2. Go to http://localhost:3000');
      console.log('   3. Enter the user_id in the consent form');
      console.log('   4. Check consent and submit');
      console.log('   5. View persona history in the dashboard\n');
    }
    
  } catch (error) {
    console.error('\n❌ Error:', error);
  } finally {
    db.close();
  }
}

main();

