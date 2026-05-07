const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = process.env.NODE_ENV === 'test' 
  ? '/tmp/assets-test.db' 
  : path.join(__dirname, 'assets.db');
let db = null;

function getDB() {
  if (!db) {
    db = new Database(DB_PATH);
    initSchema();
  }
  return db;
}

function initSchema() {
  db.prepare(`
    CREATE TABLE IF NOT EXISTS asset_snapshots (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      total_assets TEXT NOT NULL,
      scraped_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `).run();
  
  db.prepare(`
    CREATE TABLE IF NOT EXISTS asset_categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      snapshot_id INTEGER NOT NULL,
      category_name TEXT NOT NULL,
      amount INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (snapshot_id) REFERENCES asset_snapshots(id)
    )
  `).run();
}

function saveSnapshot(totalAssets, categories) {
  const db = getDB();
  const insertSnapshot = db.prepare('INSERT INTO asset_snapshots (total_assets) VALUES (?)');
  const snapshotResult = insertSnapshot.run(totalAssets);
  const snapshotId = snapshotResult.lastInsertRowid;
  
  if (categories && categories.length > 0) {
    const insertCategory = db.prepare('INSERT INTO asset_categories (snapshot_id, category_name, amount) VALUES (?, ?, ?)');
    const insertMany = db.transaction((cats) => {
      for (const cat of cats) {
        insertCategory.run(snapshotId, cat.name, cat.amount);
      }
    });
    insertMany(categories);
  }
  
  return snapshotId;
}

function getLatestSnapshot() {
  const db = getDB();
  const snapshot = db.prepare('SELECT * FROM asset_snapshots ORDER BY id DESC LIMIT 1').get();
  if (!snapshot) return null;
  
  const categories = db.prepare('SELECT category_name, amount FROM asset_categories WHERE snapshot_id = ?').all(snapshot.id);
  snapshot.categories = categories.map(c => ({
    category_name: c.category_name,
    amount: c.amount
  }));
  return snapshot;
}

function getHistoricalSnapshots() {
  const db = getDB();
  const snapshots = db.prepare('SELECT * FROM asset_snapshots ORDER BY scraped_at ASC').all();
  return snapshots.map(s => ({
    id: s.id,
    total_assets: s.total_assets,
    scraped_at: s.scraped_at
  }));
}

function closeDB() {
  if (db) {
    db.close();
    db = null;
  }
}

module.exports = { saveSnapshot, getLatestSnapshot, getHistoricalSnapshots, closeDB };
