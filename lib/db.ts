import Database from 'better-sqlite3';
import path from 'path';

const DB_PATH = path.join(process.cwd(), 'mockups.db');

let db: Database.Database;

function getDb(): Database.Database {
  if (!db) {
    db = new Database(DB_PATH);
    db.exec(`
      CREATE TABLE IF NOT EXISTS mockups (
        id TEXT PRIMARY KEY,
        company TEXT NOT NULL,
        sector TEXT NOT NULL,
        city TEXT,
        country TEXT,
        services TEXT,
        primary_color TEXT DEFAULT '#005A82',
        phone TEXT,
        email TEXT,
        html_path TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    // Migration douce — ignore l'erreur si la colonne existe déjà
    for (const col of [
      "ALTER TABLE mockups ADD COLUMN presence_type TEXT DEFAULT 'new'",
      'ALTER TABLE mockups ADD COLUMN existing_url TEXT',
      'ALTER TABLE mockups ADD COLUMN social_urls TEXT',
      'ALTER TABLE mockups ADD COLUMN logo_path TEXT',
    ]) {
      try { db.exec(col); } catch { /* colonne déjà présente */ }
    }
  }
  return db;
}

export interface Mockup {
  id: string;
  company: string;
  sector: string;
  city?: string;
  country?: string;
  services?: string;
  primary_color: string;
  phone?: string;
  email?: string;
  html_path?: string;
  presence_type?: string;
  existing_url?: string;
  social_urls?: string;
  logo_path?: string;
  created_at: string;
}

export function getAllMockups(): Mockup[] {
  return getDb().prepare('SELECT * FROM mockups ORDER BY created_at DESC').all() as Mockup[];
}

export function getMockupById(id: string): Mockup | undefined {
  return getDb().prepare('SELECT * FROM mockups WHERE id = ?').get(id) as Mockup | undefined;
}

export function insertMockup(mockup: Omit<Mockup, 'created_at'>): void {
  getDb().prepare(`
    INSERT INTO mockups (id, company, sector, city, country, services, primary_color, phone, email, html_path, presence_type, existing_url, social_urls, logo_path)
    VALUES (@id, @company, @sector, @city, @country, @services, @primary_color, @phone, @email, @html_path, @presence_type, @existing_url, @social_urls, @logo_path)
  `).run(mockup);
}

export function deleteMockup(id: string): void {
  getDb().prepare('DELETE FROM mockups WHERE id = ?').run(id);
}
