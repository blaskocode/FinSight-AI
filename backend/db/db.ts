import sqlite3 from 'sqlite3';
import path from 'path';
import fs from 'fs';

// Database connection singleton
let db: sqlite3.Database | null = null;

/**
 * Get or create database connection
 * Uses singleton pattern for connection pooling
 */
export function getDatabase(): sqlite3.Database {
  if (db) {
    return db;
  }

  const dbPath = process.env.DATABASE_PATH || path.join(__dirname, '..', 'finsight.db');
  
  // Ensure directory exists
  const dbDir = path.dirname(dbPath);
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
      console.error('Error opening database:', err);
      throw err;
    }
    console.log(`Connected to SQLite database at ${dbPath}`);
  });

  // Enable foreign keys
  db.run('PRAGMA foreign_keys = ON');

  return db;
}

/**
 * Close database connection
 */
export function closeDatabase(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (!db) {
      resolve();
      return;
    }

    db.close((err) => {
      if (err) {
        reject(err);
      } else {
        db = null;
        console.log('Database connection closed');
        resolve();
      }
    });
  });
}

/**
 * Run a SQL query (INSERT, UPDATE, DELETE)
 */
export function run(sql: string, params: any[] = []): Promise<sqlite3.RunResult> {
  const database = getDatabase();
  return new Promise((resolve, reject) => {
    database.run(sql, params, function(err) {
      if (err) {
        reject(err);
      } else {
        resolve(this);
      }
    });
  });
}

/**
 * Get a single row
 */
export function get<T = any>(sql: string, params: any[] = []): Promise<T | undefined> {
  const database = getDatabase();
  return new Promise((resolve, reject) => {
    database.get(sql, params, (err, row) => {
      if (err) {
        reject(err);
      } else {
        resolve(row as T);
      }
    });
  });
}

/**
 * Get all rows
 */
export function all<T = any>(sql: string, params: any[] = []): Promise<T[]> {
  const database = getDatabase();
  return new Promise((resolve, reject) => {
    database.all(sql, params, (err, rows) => {
      if (err) {
        reject(err);
      } else {
        resolve(rows as T[]);
      }
    });
  });
}

/**
 * Run migration file
 */
export async function runMigration(migrationPath: string): Promise<void> {
  const database = getDatabase();
  const migrationSQL = fs.readFileSync(migrationPath, 'utf-8');
  
  return new Promise((resolve, reject) => {
    database.exec(migrationSQL, (err) => {
      if (err) {
        reject(err);
      } else {
        console.log(`Migration completed: ${path.basename(migrationPath)}`);
        resolve();
      }
    });
  });
}

/**
 * Check if table exists
 */
export async function tableExists(tableName: string): Promise<boolean> {
  const result = await get<{ name: string }>(
    "SELECT name FROM sqlite_master WHERE type='table' AND name=?",
    [tableName]
  );
  return !!result;
}

/**
 * Get all table names
 */
export async function getTables(): Promise<string[]> {
  const rows = await all<{ name: string }>(
    "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name"
  );
  return rows.map(row => row.name);
}

