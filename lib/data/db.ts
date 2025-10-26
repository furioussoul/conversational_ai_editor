import Database from 'better-sqlite3';
import { mkdirSync } from 'fs';
import path from 'path';

const DB_PATH = path.join(process.cwd(), 'data', 'agents.sqlite');

let db: Database.Database | null = null;
let initialized = false;

function addColumnIfMissing(
  database: Database.Database,
  table: string,
  column: string,
  definition: string,
) {
  const columns = database.prepare(`PRAGMA table_info(${table})`).all() as {
    name: string;
  }[];
  const exists = columns.some((item) => item.name === column);
  if (!exists) {
    database.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  }
}

function ensureMigrations(database: Database.Database) {
  database.pragma('journal_mode = WAL');
  database.pragma('foreign_keys = ON');

  database.exec(`
    CREATE TABLE IF NOT EXISTS agents (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      constraints TEXT,
      systemPromptJson TEXT,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS tools (
      id TEXT PRIMARY KEY,
      agentId TEXT NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      description TEXT,
      parameters TEXT
    );

    CREATE TABLE IF NOT EXISTS glossary_terms (
      id TEXT PRIMARY KEY,
      agentId TEXT NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      description TEXT NOT NULL,
      synonyms TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS guidelines (
      id TEXT PRIMARY KEY,
      agentId TEXT NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
      condition TEXT NOT NULL,
      action TEXT NOT NULL,
      toolIds TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS journeys (
      id TEXT PRIMARY KEY,
      agentId TEXT NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      description TEXT,
      triggerConditions TEXT NOT NULL,
      logic TEXT
    );

    CREATE TABLE IF NOT EXISTS journey_nodes (
      id TEXT PRIMARY KEY,
      journeyId TEXT NOT NULL REFERENCES journeys(id) ON DELETE CASCADE,
      type TEXT NOT NULL,
      positionX REAL NOT NULL,
      positionY REAL NOT NULL,
      data TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS journey_edges (
      id TEXT PRIMARY KEY,
      journeyId TEXT NOT NULL REFERENCES journeys(id) ON DELETE CASCADE,
      source TEXT NOT NULL,
      target TEXT NOT NULL,
      label TEXT
    );
  `);
  addColumnIfMissing(database, 'agents', 'constraints', 'TEXT');
  addColumnIfMissing(database, 'journeys', 'logic', 'TEXT');
}

export function getDb(): Database.Database {
  if (!db) {
    mkdirSync(path.dirname(DB_PATH), { recursive: true });
    db = new Database(DB_PATH);
  }

  if (!initialized) {
    ensureMigrations(db);
    initialized = true;
  }

  return db;
}
