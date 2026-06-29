import * as SQLite from 'expo-sqlite';

const db = SQLite.openDatabaseSync('tomato_scans.db');

export function initDatabase() {
  db.execSync(
    `CREATE TABLE IF NOT EXISTS scans (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      scan_id TEXT UNIQUE,
      disease TEXT,
      confidence REAL,
      gradcam_url TEXT,
      timestamp TEXT,
      image_uri TEXT
    );`
  );
}

export interface Scan {
  scan_id: string;
  disease: string;
  confidence: number;
  gradcam_url: string;
  timestamp: string;
  image_uri: string;
}

export function saveScan(scan: Scan) {
  db.runSync(
    `INSERT OR REPLACE INTO scans (scan_id, disease, confidence, gradcam_url, timestamp, image_uri)
     VALUES (?, ?, ?, ?, ?, ?);`,
    [
      scan.scan_id,
      scan.disease,
      scan.confidence,
      scan.gradcam_url,
      scan.timestamp,
      scan.image_uri,
    ]
  );
}

export async function getRecentScans(limit: number = 50): Promise<Scan[]> {
  return db.getAllSync('SELECT * FROM scans ORDER BY timestamp DESC LIMIT ?;', [limit]) as Scan[];
}

export async function getScansByDisease(disease: string): Promise<Scan[]> {
  return db.getAllSync('SELECT * FROM scans WHERE disease = ? ORDER BY timestamp DESC;', [disease]) as Scan[];
}

export function deleteScan(scan_id: string) {
  db.runSync('DELETE FROM scans WHERE scan_id = ?;', [scan_id]);
}

export async function getDiseaseStats(): Promise<{ disease: string; count: number }[]> {
  return db.getAllSync('SELECT disease, COUNT(*) as count FROM scans GROUP BY disease ORDER BY count DESC;') as any;
}
