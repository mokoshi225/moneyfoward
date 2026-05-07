const fs = require('fs');
const path = require('path');
const { saveSnapshot, getLatestSnapshot, getHistoricalSnapshots, closeDB } = require('../db');

const DB_PATH = process.env.NODE_ENV === 'test' 
  ? '/tmp/assets-test.db' 
  : path.join(__dirname, '../assets.db');

beforeEach(() => {
  closeDB();
  if (fs.existsSync(DB_PATH)) {
    fs.unlinkSync(DB_PATH);
  }
});

afterAll(() => {
  closeDB();
  if (fs.existsSync(DB_PATH)) {
    fs.unlinkSync(DB_PATH);
  }
});

test('assets.db is created after first DB operation', () => {
  saveSnapshot('187,069,320円', [
    { name: '預金・現金・暗号資産', amount: 24415050 },
    { name: '株式(現物)', amount: 37303030 }
  ]);
  expect(fs.existsSync(DB_PATH)).toBe(true);
});

test('asset_snapshots table exists with correct schema', () => {
  saveSnapshot('187,069,320円', []);
  const Database = require('better-sqlite3');
  const db = new Database(DB_PATH);
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='asset_snapshots'").all();
  expect(tables.length).toBe(1);
  db.close();
});

test('asset_categories table exists with correct schema', () => {
  saveSnapshot('187,069,320円', []);
  const Database = require('better-sqlite3');
  const db = new Database(DB_PATH);
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='asset_categories'").all();
  expect(tables.length).toBe(1);
  db.close();
});

test('saveSnapshot inserts correct data into asset_snapshots', () => {
  const totalAssets = '187,069,320円';
  saveSnapshot(totalAssets, []);
  const snapshot = getLatestSnapshot();
  expect(snapshot.total_assets).toBe(totalAssets);
  expect(snapshot.id).toBeDefined();
});

test('saveSnapshot inserts categories into asset_categories', () => {
  const categories = [
    { name: '預金・現金・暗号資産', amount: 24415050 },
    { name: '株式(現物)', amount: 37303030 }
  ];
  saveSnapshot('187,069,320円', categories);
  const snapshot = getLatestSnapshot();
  expect(snapshot.categories.length).toBe(2);
  expect(snapshot.categories[0].category_name).toBe('預金・現金・暗号資産');
  expect(snapshot.categories[0].amount).toBe(24415050);
});

test('getLatestSnapshot returns most recent entry', () => {
  saveSnapshot('100,000円', []);
  return new Promise(resolve => setTimeout(resolve, 100)).then(() => {
    saveSnapshot('200,000円', []);
    const latest = getLatestSnapshot();
    expect(latest.total_assets).toBe('200,000円');
  });
});

test('getHistoricalSnapshots returns all entries sorted ascending by date', () => {
  saveSnapshot('100,000円', []);
  return new Promise(resolve => setTimeout(resolve, 100)).then(() => {
    saveSnapshot('200,000円', []);
    return new Promise(resolve => setTimeout(resolve, 100)).then(() => {
      saveSnapshot('300,000円', []);
      const historical = getHistoricalSnapshots();
      expect(historical.length).toBe(3);
      expect(historical[0].total_assets).toBe('100,000円');
      expect(historical[1].total_assets).toBe('200,000円');
      expect(historical[2].total_assets).toBe('300,000円');
    });
  });
});
