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

  db.prepare(`
    CREATE TABLE IF NOT EXISTS holdings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      snapshot_id INTEGER NOT NULL,
      category TEXT NOT NULL,
      symbol TEXT,
      name TEXT NOT NULL,
      valuation INTEGER NOT NULL,
      unrealized_gain INTEGER,
      quantity REAL,
      avg_cost REAL,
      current_price REAL,
      institution TEXT,
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

function saveHoldings(snapshotId, holdings) {
  const db = getDB();
  const stmt = db.prepare(`
    INSERT INTO holdings (snapshot_id, category, symbol, name, valuation, unrealized_gain, quantity, avg_cost, current_price, institution)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const insertMany = db.transaction((items) => {
    for (const h of items) {
      stmt.run(snapshotId, h.category, h.symbol || null, h.name, h.valuation, h.unrealizedGain || null, h.quantity || null, h.avgCost || null, h.currentPrice || null, h.institution || null);
    }
  });
  insertMany(holdings);
}

function getLatestHoldings() {
  const db = getDB();
  const snapshot = db.prepare('SELECT * FROM asset_snapshots ORDER BY id DESC LIMIT 1').get();
  if (!snapshot) return null;
  const holdings = db.prepare('SELECT * FROM holdings WHERE snapshot_id = ? ORDER BY category, name').all(snapshot.id);
  return {
    snapshotId: snapshot.id,
    totalAssets: snapshot.total_assets,
    scrapedAt: snapshot.scraped_at,
    holdings: holdings
  };
}

module.exports = { saveSnapshot, getLatestSnapshot, getHistoricalSnapshots, saveHoldings, getLatestHoldings, closeDB };
