"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDatabase = getDatabase;
exports.closeDatabase = closeDatabase;
exports.run = run;
exports.get = get;
exports.all = all;
exports.runMigration = runMigration;
exports.tableExists = tableExists;
exports.getTables = getTables;
const sqlite3_1 = __importDefault(require("sqlite3"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
// Database connection singleton
let db = null;
/**
 * Get or create database connection
 * Uses singleton pattern for connection pooling
 */
function getDatabase() {
    if (db) {
        return db;
    }
    const dbPath = process.env.DATABASE_PATH || path_1.default.join(__dirname, '..', 'finsight.db');
    // Ensure directory exists
    const dbDir = path_1.default.dirname(dbPath);
    if (!fs_1.default.existsSync(dbDir)) {
        fs_1.default.mkdirSync(dbDir, { recursive: true });
    }
    db = new sqlite3_1.default.Database(dbPath, (err) => {
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
function closeDatabase() {
    return new Promise((resolve, reject) => {
        if (!db) {
            resolve();
            return;
        }
        db.close((err) => {
            if (err) {
                reject(err);
            }
            else {
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
function run(sql, params = []) {
    const database = getDatabase();
    return new Promise((resolve, reject) => {
        database.run(sql, params, function (err) {
            if (err) {
                reject(err);
            }
            else {
                resolve(this);
            }
        });
    });
}
/**
 * Get a single row
 */
function get(sql, params = []) {
    const database = getDatabase();
    return new Promise((resolve, reject) => {
        database.get(sql, params, (err, row) => {
            if (err) {
                reject(err);
            }
            else {
                resolve(row);
            }
        });
    });
}
/**
 * Get all rows
 */
function all(sql, params = []) {
    const database = getDatabase();
    return new Promise((resolve, reject) => {
        database.all(sql, params, (err, rows) => {
            if (err) {
                reject(err);
            }
            else {
                resolve(rows);
            }
        });
    });
}
/**
 * Run migration file
 */
async function runMigration(migrationPath) {
    const database = getDatabase();
    const migrationSQL = fs_1.default.readFileSync(migrationPath, 'utf-8');
    return new Promise((resolve, reject) => {
        database.exec(migrationSQL, (err) => {
            if (err) {
                reject(err);
            }
            else {
                console.log(`Migration completed: ${path_1.default.basename(migrationPath)}`);
                resolve();
            }
        });
    });
}
/**
 * Check if table exists
 */
async function tableExists(tableName) {
    const result = await get("SELECT name FROM sqlite_master WHERE type='table' AND name=?", [tableName]);
    return !!result;
}
/**
 * Get all table names
 */
async function getTables() {
    const rows = await all("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name");
    return rows.map(row => row.name);
}
