const sqlite3 = require('../backend/node_modules/sqlite3').verbose();
const path = require('path');
const dbPath = path.join(__dirname, '..', 'backend', 'finsight.db');
const db = new sqlite3.Database(dbPath);

const userId = 'user-1762524843481-3dlzhwf1b'; // Samantha Carson
const now = new Date().toISOString();

console.log('Fixing lifestyle_creep persona for Samantha Carson...');

// First, delete the conflicting high_utilization persona from 2025-11-15
db.run(`
  DELETE FROM personas 
  WHERE user_id = ? 
  AND persona_type = 'high_utilization' 
  AND assigned_at = '2025-11-15T06:00:00.000Z'
`, [userId], function(err) {
  if (err) {
    console.error('Error deleting high_utilization:', err);
    db.close();
    return;
  }
  
  console.log(`Deleted ${this.changes} conflicting high_utilization persona(s)`);
  
  // Now update the lifestyle_creep persona to be the most recent
  // First get the persona_id
  db.get(`
    SELECT persona_id 
    FROM personas 
    WHERE user_id = ? 
    AND persona_type = 'lifestyle_creep'
    ORDER BY assigned_at DESC 
    LIMIT 1
  `, [userId], (err2, personaRow) => {
    if (err2) {
      console.error('Error finding lifestyle_creep persona:', err2);
      db.close();
      return;
    }
    
    if (!personaRow) {
      console.log('No lifestyle_creep persona found');
      db.close();
      return;
    }
    
    // Update it
    db.run(`
      UPDATE personas 
      SET assigned_at = ? 
      WHERE persona_id = ?
    `, [now, personaRow.persona_id], function(err3) {
      if (err3) {
        console.error('Error updating lifestyle_creep:', err3);
        db.close();
        return;
      }
      
      console.log(`Updated ${this.changes} lifestyle_creep persona(s) to ${now}`);
      
      // Verify
      db.get(`
        SELECT persona_type, assigned_at 
        FROM personas 
        WHERE user_id = ? 
        ORDER BY assigned_at DESC 
        LIMIT 1
      `, [userId], (err4, row) => {
        if (err4) {
          console.error('Error verifying:', err4);
        } else if (row) {
          console.log(`✅ Latest persona: ${row.persona_type} at ${row.assigned_at}`);
          if (row.persona_type === 'lifestyle_creep') {
            console.log('✅ Success! Samantha Carson now has lifestyle_creep as latest persona');
            console.log('   Username: samantha.carson');
            console.log('   Password: test');
          } else {
            console.log('❌ Warning: Latest persona is still', row.persona_type);
          }
        }
        db.close();
      });
    });
  });
});

