const request = require('supertest');
jest.mock('../db', () => ({
  getLatestSnapshot: jest.fn(),
  getHistoricalSnapshots: jest.fn()
}));

const { app } = require('../server');

test('GET /api/latest returns latest snapshot with categories', async () => {
  const mockSnapshot = {
    id: 1,
    total_assets: '187,069,320円',
    scraped_at: '2026-05-07 15:00:00',
    categories: [
      { category_name: '預金・現金・暗号資産', amount: 24415050 },
      { category_name: '株式(現物)', amount: 37303030 }
    ]
  };
  require('../db').getLatestSnapshot.mockReturnValue(mockSnapshot);
  
  const res = await request(app).get('/api/latest');
  expect(res.status).toBe(200);
  expect(res.body.totalAssets).toBe('187,069,320円');
  expect(res.body.categories).toHaveLength(2);
  expect(res.body.categories[0].name).toBe('預金・現金・暗号資産');
});

test('GET /api/latest returns 404 if no snapshot exists', async () => {
  require('../db').getLatestSnapshot.mockReturnValue(null);
  
  const res = await request(app).get('/api/latest');
  expect(res.status).toBe(404);
});

test('GET /api/historical returns all snapshots sorted ascending', async () => {
  const mockHistorical = [
    { id: 1, total_assets: '100,000円', scraped_at: '2026-05-01 10:00:00' },
    { id: 2, total_assets: '200,000円', scraped_at: '2026-05-03 10:00:00' }
  ];
  require('../db').getHistoricalSnapshots.mockReturnValue(mockHistorical);
  
  const res = await request(app).get('/api/historical');
  expect(res.status).toBe(200);
  expect(res.body).toHaveLength(2);
  expect(res.body[0].totalAssets).toBe('100,000円');
});

test('API responses have CORS headers', async () => {
  require('../db').getLatestSnapshot.mockReturnValue(null);
  
  const res = await request(app).get('/api/latest');
  expect(res.headers['access-control-allow-origin']).toBe('*');
});
