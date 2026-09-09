import Database from 'better-sqlite3';
import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';

dotenv.config();

const rawDbUrl = (process.env.DATABASE_URL || '').trim();
// A valid PostgreSQL connection string MUST start with postgres:// or postgresql://
const isPostgres = rawDbUrl.startsWith('postgres://') || rawDbUrl.startsWith('postgresql://');
const isSqlite = !isPostgres;

let sqliteDb: any = null;
let pool: any = null;

if (isPostgres) {
  console.log('Connecting to PostgreSQL database...');
  pool = new Pool({
    connectionString: rawDbUrl,
    connectionTimeoutMillis: 5000, // 5s timeout to prevent hanging on unreachable hosts
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });
} else {
  if (rawDbUrl) {
    console.warn(`[DATABASE NOTICE] DATABASE_URL does not start with postgres:// or postgresql://. Using local SQLite database.`);
  }
  const dbPath = process.env.VERCEL ? '/tmp/jhf_erp.db' : 'jhf_erp.db';
  console.log(`Using SQLite database at: ${dbPath}`);
  try {
    sqliteDb = new Database(dbPath);
    sqliteDb.pragma('journal_mode = WAL');
  } catch (err) {
    console.error("Error initializing SQLite database:", err);
  }
}

export const dbQuery = async (text: string, params: any[] = []) => {
  if (isSqlite) {
    if (!sqliteDb) {
      throw new Error("SQLite database is not initialized");
    }
    const sqliteText = text.replace(/\$\d+/g, '?');
    const upperText = text.trim().toUpperCase();
    if (upperText.startsWith('SELECT') || upperText.startsWith('PRAGMA')) {
      const rows = sqliteDb.prepare(sqliteText).all(params);
      return { rows, rowCount: rows.length };
    } else {
      const result = sqliteDb.prepare(sqliteText).run(params);
      return { rows: [], rowCount: result.changes, lastInsertRowid: result.lastInsertRowid };
    }
  } else {
    return pool.query(text, params);
  }
};

export const getClient = async () => {
  if (isSqlite) {
    if (!sqliteDb) {
      throw new Error("SQLite database is not initialized");
    }
    return {
      query: dbQuery,
      release: () => {},
      rollback: () => sqliteDb.prepare('ROLLBACK').run(),
      commit: () => sqliteDb.prepare('COMMIT').run(),
      begin: () => sqliteDb.prepare('BEGIN').run()
    };
  } else {
    const client = await pool.connect();
    return {
      query: (text: string, params: any[] = []) => client.query(text, params),
      release: () => client.release(),
      rollback: () => client.query('ROLLBACK'),
      commit: () => client.query('COMMIT'),
      begin: () => client.query('BEGIN'),
      rawClient: client
    };
  }
};

export { isSqlite };
export default isSqlite ? sqliteDb : pool;

