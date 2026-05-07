jest.mock('playwright', () => {
  const mockPage = {
    goto: jest.fn().mockResolvedValue(undefined),
    fill: jest.fn().mockResolvedValue(undefined),
    click: jest.fn().mockResolvedValue(undefined),
    waitForTimeout: jest.fn().mockResolvedValue(undefined),
    url: jest.fn().mockReturnValue('https://ssnb.x.moneyforward.com/'),
    evaluate: jest.fn().mockImplementation(() => {
      return [
        { name: '預金・現金・暗号資産', y: 24415050 },
        { name: '株式(現物)', y: 37303030 }
      ];
    }),
    locator: jest.fn().mockReturnThis(),
    textContent: jest.fn().mockResolvedValue('総資産 187,069,320円'),
    screenshot: jest.fn().mockResolvedValue(undefined)
  };
  const mockContext = {
    newPage: jest.fn().mockResolvedValue(mockPage)
  };
  const mockBrowser = {
    newContext: jest.fn().mockResolvedValue(mockContext),
    close: jest.fn().mockResolvedValue(undefined)
  };
  return {
    chromium: {
      launch: jest.fn().mockResolvedValue(mockBrowser)
    }
  };
});

jest.mock('dotenv', () => ({ config: jest.fn() }));
jest.mock('../utils', () => ({ formatCurrency: jest.fn((amt) => `${amt}円`) }));
jest.mock('../db', () => ({ saveSnapshot: jest.fn() }));

const { scrape } = require('../scrape');

test('scrape() returns structured data with totalAssets and categories', async () => {
  const result = await scrape();
  expect(result).toHaveProperty('totalAssets');
  expect(result).toHaveProperty('categories');
  expect(result.totalAssets).toBe('187,069,320円');
  expect(Array.isArray(result.categories)).toBe(true);
  expect(result.categories.length).toBe(2);
  expect(result.categories[0]).toHaveProperty('name', '預金・現金・暗号資産');
  expect(result.categories[0]).toHaveProperty('amount', 24415050);
});

test('scrape() returns empty categories if initPieData is null', async () => {
  const playwright = require('playwright');
  const mockPage = await playwright.chromium.launch().then(b => b.newContext()).then(c => c.newPage());
  mockPage.evaluate.mockResolvedValueOnce(null);
  
  const result = await scrape();
  expect(result.categories).toEqual([]);
});

test('scrape() saves data to DB via saveSnapshot', async () => {
  const db = require('../db');
  
  await scrape();
  
  expect(db.saveSnapshot).toHaveBeenCalledWith('187,069,320円', expect.any(Array));
});
