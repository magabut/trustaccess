import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import { readFileSync } from 'node:fs';
import { minutesOfDay, toOrgLocal } from './time';
import type { EidClient } from './types';

export interface DBSession {
  all<T = unknown>(sql: string, params?: unknown[]): T[];
  get<T = unknown>(sql: string, params?: unknown[]): T | undefined;
  run(sql: string, params?: unknown[]): { lastInsertRowid: number };
}

let cached: DBSession | null = null;

export function initDb(dbPath = process.env.DB_PATH ?? './data/trustaccess.db'): DBSession {
  if (cached && dbPath !== ':memory:') return cached;
  if (dbPath !== ':memory:') fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  const db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  const schema = readFileSync(path.join(__dirname, 'db', 'schema.sql'), 'utf8');
  db.exec(schema);
  const session: DBSession = {
    all: (sql, params) => db.prepare(sql).all(...(params ?? [])) as unknown[],
    get: (sql, params) => db.prepare(sql).get(...(params ?? [])) as unknown | undefined,
    run: (sql, params) => db.prepare(sql).run(...(params ?? [])) as { lastInsertRowid: number },
  };
  if (dbPath !== ':memory:') cached = session;
  return session;
}

export function getDb(): DBSession {
  return cached ?? initDb();
}
