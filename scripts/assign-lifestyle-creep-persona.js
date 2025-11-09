const sqlite3 = require('../backend/node_modules/sqlite3').verbose();
const path = require('path');
const dbPath = path.join(__dirname, '..', 'backend', 'finsight.db');
const db = new sqlite3.Database(dbPath);

// Find a user to assign lifestyle_creep persona
// Prefer users with names starting with S (for Sophia)
db.get(`
  SELECT u.user_id, u.name, u.email 
  FROM users u 
  WHERE u.name LIKE 'S%' 
  ORDER BY u.name 
  LIMIT 1
`, [], (err, row) => {
  if (err) {
    console.error('Error finding user:', err);
    db.close();
    return;
  }
  
  if (!row) {
    // If no user starting with S, get any user
    db.get(`
      SELECT u.user_id, u.name, u.email 
      FROM users u 
      ORDER BY u.name 
      LIMIT 1
    `, [], (err2, row2) => {
      if (err2) {
        console.error('Error finding user:', err2);
        db.close();
        return;
      }
      if (row2) {
        assignPersona(row2);
      } else {
        console.log('No users found in database');
        db.close();
      }
    });
    return;
  }
  
  assignPersona(row);
});

function assignPersona(user) {
  const username = user.name.toLowerCase().replace(/\s+/g, '.');
  console.log(`Assigning lifestyle_creep persona to: ${user.name} (username: ${username})`);
  console.log(`User ID: ${user.user_id}`);
  
  // Create persona assignment
  const personaId = `persona-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const now = new Date().toISOString();
  const signals = JSON.stringify({
    criteriaMet: ['spending_increase'],
    confidence: 0.85,
    spendingIncrease: 0.25,
    monthsWithIncrease: 6,
    averageMonthlySpending: 3500,
    spendingTrend: 'increasing'
  });
  
  db.run(`
    INSERT INTO personas (persona_id, user_id, persona_type, window_days, signals, secondary_personas, assigned_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `, [
    personaId,
    user.user_id,
    'lifestyle_creep',
    90,
    signals,
    JSON.stringify([]),
    now
  ], (err) => {
    if (err) {
      console.error('Error inserting persona:', err);
      db.close();
      return;
    }
    
    console.log(`✅ Successfully assigned lifestyle_creep persona to ${user.name}`);
    console.log(`   Username: ${username}`);
    console.log(`   Password: test`);
    console.log(`   Persona ID: ${personaId}`);
    db.close();
  });
}

