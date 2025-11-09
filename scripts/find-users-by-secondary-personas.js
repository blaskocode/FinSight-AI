// Find users with specific numbers of secondary personas
// Usage: node scripts/find-users-by-secondary-personas.js

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

async function findUsersBySecondaryPersonaCount(count) {
  // Get all users with their latest persona assignment and secondary personas
  const allUsers = await all(`
    SELECT 
      u.user_id,
      u.name,
      u.email,
      p.persona_type as primary_persona,
      p.secondary_personas,
      p.assigned_at
    FROM users u
    INNER JOIN personas p ON u.user_id = p.user_id
    WHERE p.assigned_at = (
      SELECT MAX(assigned_at) 
      FROM personas 
      WHERE user_id = u.user_id
    )
    ORDER BY p.assigned_at DESC
  `);
  
  // Filter by secondary persona count
  const filtered = allUsers
    .map(user => {
      let secondaryCount = 0;
      let secondaryList = [];
      
      if (user.secondary_personas) {
        try {
          const parsed = JSON.parse(user.secondary_personas);
          if (Array.isArray(parsed)) {
            secondaryList = parsed;
            secondaryCount = parsed.length;
          }
        } catch (e) {
          // If parsing fails, treat as empty
        }
      }
      
      return {
        ...user,
        secondary_count: secondaryCount,
        secondary_list: secondaryList
      };
    })
    .filter(user => user.secondary_count === count)
    .slice(0, 5); // Limit to 5 examples
    
  return filtered;
}

async function main() {
  console.log('\n🔍 Finding users by secondary persona count...\n');
  console.log('='.repeat(80));
  
  try {
    // Find user with 0 secondary personas
    console.log('\n0️⃣  USER WITH ZERO SECONDARY PERSONAS:');
    console.log('-'.repeat(80));
    const zeroSecondaryUsers = await findUsersBySecondaryPersonaCount(0);
    if (zeroSecondaryUsers.length > 0) {
      const user = zeroSecondaryUsers[0];
      console.log(`   User ID: ${user.user_id}`);
      console.log(`   Name: ${user.name}`);
      console.log(`   Email: ${user.email}`);
      console.log(`   Primary Persona: ${user.primary_persona}`);
      console.log(`   Secondary Personas: ${user.secondary_count} (none)`);
      console.log(`   Assigned At: ${user.assigned_at}`);
    } else {
      console.log('   ❌ No users found with 0 secondary personas');
    }
    
    // Find user with 1 secondary persona
    console.log('\n\n1️⃣  USER WITH ONE SECONDARY PERSONA:');
    console.log('-'.repeat(80));
    const oneSecondaryUsers = await findUsersBySecondaryPersonaCount(1);
    if (oneSecondaryUsers.length > 0) {
      const user = oneSecondaryUsers[0];
      console.log(`   User ID: ${user.user_id}`);
      console.log(`   Name: ${user.name}`);
      console.log(`   Email: ${user.email}`);
      console.log(`   Primary Persona: ${user.primary_persona}`);
      console.log(`   Secondary Personas: ${user.secondary_count}`);
      console.log(`   Secondary List: ${user.secondary_list.join(', ')}`);
      console.log(`   Assigned At: ${user.assigned_at}`);
    } else {
      console.log('   ❌ No users found with 1 secondary persona');
    }
    
    // Find user with 2 secondary personas
    console.log('\n\n2️⃣  USER WITH TWO SECONDARY PERSONAS:');
    console.log('-'.repeat(80));
    const twoSecondaryUsers = await findUsersBySecondaryPersonaCount(2);
    if (twoSecondaryUsers.length > 0) {
      const user = twoSecondaryUsers[0];
      console.log(`   User ID: ${user.user_id}`);
      console.log(`   Name: ${user.name}`);
      console.log(`   Email: ${user.email}`);
      console.log(`   Primary Persona: ${user.primary_persona}`);
      console.log(`   Secondary Personas: ${user.secondary_count}`);
      console.log(`   Secondary List: ${user.secondary_list.join(', ')}`);
      console.log(`   Assigned At: ${user.assigned_at}`);
    } else {
      console.log('   ❌ No users found with 2 secondary personas');
    }
    
    // Summary
    console.log('\n' + '='.repeat(80));
    console.log('\n📊 Summary:');
    console.log(`   Users with 0 secondary personas: ${zeroSecondaryUsers.length > 0 ? '✅ Found' : '❌ None'}`);
    console.log(`   Users with 1 secondary persona: ${oneSecondaryUsers.length > 0 ? '✅ Found' : '❌ None'}`);
    console.log(`   Users with 2 secondary personas: ${twoSecondaryUsers.length > 0 ? '✅ Found' : '❌ None'}`);
    
    if (zeroSecondaryUsers.length > 0 || oneSecondaryUsers.length > 0 || twoSecondaryUsers.length > 0) {
      console.log('\n💡 To test these users:');
      console.log('   1. Copy a user_id from above');
      console.log('   2. Go to http://localhost:3000');
      console.log('   3. Enter the user_id in the consent form');
      console.log('   4. Check consent and submit');
      console.log('   5. View persona details in the dashboard\n');
    }
    
  } catch (error) {
    console.error('\n❌ Error:', error);
  } finally {
    db.close();
  }
}

main();

