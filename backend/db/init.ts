import path from 'path';
import fs from 'fs';
import { runMigration, tableExists, getTables, closeDatabase, run, get } from './db';

/**
 * Initialize database by running migrations
 */
export async function initializeDatabase(): Promise<void> {
  try {
    console.log('Initializing database...');
    
    // Run initial schema migration
    const migrationPath = path.join(__dirname, 'migrations', '001_initial_schema.sql');
    
    // Check if migration file exists
    if (!fs.existsSync(migrationPath)) {
      throw new Error(`Migration file not found: ${migrationPath}`);
    }

    // Run migration
    await runMigration(migrationPath);

    // Run performance indexes migration
    const performanceMigrationPath = path.join(__dirname, 'migrations', '002_performance_indexes.sql');
    if (fs.existsSync(performanceMigrationPath)) {
      console.log('Running performance optimization migration...');
      await runMigration(performanceMigrationPath);
      console.log('✅ Performance indexes created');
    }

    // Verify tables were created
    const expectedTables = [
      'users',
      'accounts',
      'transactions',
      'liabilities',
      'consents',
      'personas',
      'recommendations',
      'audit_log',
      'chat_cache'
    ];

    const tables = await getTables();
    console.log(`Created ${tables.length} tables:`, tables);

    // Verify all expected tables exist
    for (const table of expectedTables) {
      const exists = await tableExists(table);
      if (!exists) {
        throw new Error(`Table ${table} was not created`);
      }
    }

    console.log('✅ Database initialization completed successfully');
    console.log('All tables verified:', expectedTables);

  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    throw error;
  }
}

/**
 * Test database connection and insert a test row
 */
export async function testDatabase(): Promise<void> {
  try {
    console.log('Testing database...');

    // Test insert into users table (using simple ID for testing)
    const testUserId = `test-${Date.now()}`;
    const testEmail = `test-${Date.now()}@example.com`;
    
    await run(
      'INSERT INTO users (user_id, email, name) VALUES (?, ?, ?)',
      [testUserId, testEmail, 'Test User']
    );

    console.log('✅ Test user inserted:', testUserId);

    // Verify the insert
    const user = await get('SELECT * FROM users WHERE user_id = ?', [testUserId]);
    if (!user) {
      throw new Error('Test user was not found after insert');
    }

    console.log('✅ Test user verified:', user);

    // Clean up test data
    await run('DELETE FROM users WHERE user_id = ?', [testUserId]);
    console.log('✅ Test user cleaned up');

    console.log('✅ Database test completed successfully');

  } catch (error) {
    console.error('❌ Database test failed:', error);
    throw error;
  }
}

// If run directly, initialize and test
if (require.main === module) {
  (async () => {
    try {
      await initializeDatabase();
      await testDatabase();
      await closeDatabase();
      process.exit(0);
    } catch (error) {
      console.error(error);
      process.exit(1);
    }
  })();
}

