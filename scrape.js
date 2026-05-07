require('dotenv').config();
const { chromium } = require('playwright');
const { formatCurrency } = require('./utils');
const { saveSnapshot, saveHoldings } = require('./db');

async function scrape() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    console.log('ログインページにアクセス中...');
    await page.goto('https://ssnb.x.moneyforward.com/users/sign_in', { waitUntil: 'networkidle', timeout: 60000 });

    console.log('ログイン情報を入力中...');
    await page.fill('input[name="sign_in_session_service[email]"]', process.env.MONEYFORWARD_ID);
    await page.fill('input[name="sign_in_session_service[password]"]', process.env.MONEYFORWARD_PASSWORD);
    
    console.log('ログインボタンをクリック...');
    await page.click('input[name="commit"], button[type="submit"]');
    
    await page.waitForTimeout(5000);
    console.log('ログイン後のURL:', page.url());

    console.log('総資産額と資産内訳を取得中...');
    
    const totalAssets = await page.locator('body').textContent();
    const match = totalAssets.match(/総資産[\s]*([\d,]+円)/);
    const totalAssetsResult = match ? match[1] : null;
    
    if (totalAssetsResult) {
      console.log('総資産額:', totalAssetsResult);
    } else {
      console.log('総資産額の取得に失敗しました');
      await page.screenshot({ path: '/home/mokoshi/moneyfoward/after-login.png', fullPage: true });
      console.log('スクリーンショット保存: after-login.png');
    }

    console.log('\n資産内訳を取得中...');
    const assetBreakdown = await page.evaluate(() => {
      return typeof initPieData !== 'undefined' ? initPieData : null;
    });

    const categories = [];
    if (assetBreakdown && Array.isArray(assetBreakdown)) {
      console.log('資産内訳:');
      assetBreakdown.forEach(item => {
        if (item.name && typeof item.y === 'number') {
          console.log(`  ${item.name}: ${formatCurrency(item.y)}`);
          categories.push({ name: item.name, amount: item.y });
        }
      });
    } else {
      console.log('資産内訳の取得に失敗しました');
      await page.screenshot({ path: '/home/mokoshi/moneyfoward/breakdown-error.png', fullPage: true });
      console.log('スクリーンショット保存: breakdown-error.png');
    }

    let snapshotId = null;
    if (totalAssetsResult && categories.length > 0) {
      snapshotId = saveSnapshot(totalAssetsResult, categories);
    }

    console.log('\nポートフォリオ詳細を取得中...');
    const holdings = [];
    let totalValuation = 0;
    let totalUnrealizedGain = 0;

    try {
      await page.goto('https://ssnb.x.moneyforward.com/bs/portfolio', { waitUntil: 'networkidle', timeout: 60000 });
      console.log('ポートフォリオページ読み込み完了');

      function parseJPY(str) {
        const cleaned = String(str || '').replace(/[,円]/g, '').replace(/\s/g, '');
        const num = parseInt(cleaned, 10);
        return isNaN(num) ? 0 : num;
      }

      const tables = await page.locator('table');
      const tableCount = await tables.count();

      for (let t = 0; t < tableCount; t++) {
        const headers = await tables.nth(t).locator('th').allTextContents();
        const headerText = headers.join(' ');

        let category = null;
        if (headerText.includes('銘柄コード')) category = '株式(現物)';
        else if (headerText.includes('基準価額')) category = '投資信託';
        else if (headerText.includes('現在価値') && headerText.includes('評価損益')) category = '年金';

        if (!category) continue;

        const rows = await tables.nth(t).locator('tr');
        const rowCount = await rows.count();

        for (let r = 1; r < rowCount; r++) {
          const cells = await rows.nth(r).locator('td').allTextContents();
          if (cells.length < 3) continue;
          const name = cells[0].trim();
          if (name === '' || name === '合計評価額') continue;

          if (category === '株式(現物)') {
            const symbol = cells[0].trim();
            const hName = cells[1].trim();
            const quantity = parseFloat(cells[2].replace(/,/g, ''));
            const avgCost = parseJPY(cells[3]);
            const currentPrice = parseJPY(cells[4]);
            const valuation = parseJPY(cells[5]);
            const unrealizedGain = parseJPY(cells[7]);
            const institution = cells[9] ? cells[9].trim() : '';
            holdings.push({ category, symbol: symbol !== hName ? symbol : null, name: hName, valuation, unrealizedGain, quantity, avgCost, currentPrice, institution });
            totalValuation += valuation;
            totalUnrealizedGain += unrealizedGain;
            console.log(`  ${category}: ${hName} 評価額=${formatCurrency(valuation)} 評価損益=${formatCurrency(unrealizedGain)}`);
          } else if (category === '投資信託') {
            const hName = cells[0].trim();
            const quantity = parseFloat((cells[1] || '').replace(/,/g, ''));
            const avgCost = parseJPY(cells[2]);
            const currentPrice = parseJPY(cells[3]);
            const valuation = parseJPY(cells[4]);
            const unrealizedGain = parseJPY(cells[6]);
            const institution = cells[8] ? cells[8].trim() : '';
            holdings.push({ category, symbol: null, name: hName, valuation, unrealizedGain, quantity, avgCost, currentPrice, institution });
            totalValuation += valuation;
            totalUnrealizedGain += unrealizedGain;
            console.log(`  ${category}: ${hName} 評価額=${formatCurrency(valuation)} 評価損益=${formatCurrency(unrealizedGain)}`);
          } else if (category === '年金') {
            const hName = cells[0].trim();
            const cost = parseJPY(cells[1]);
            const valuation = parseJPY(cells[2]);
            const unrealizedGain = parseJPY(cells[3]);
            holdings.push({ category, symbol: null, name: hName, valuation, unrealizedGain, quantity: null, avgCost: cost, currentPrice: null, institution: null });
            totalValuation += valuation;
            totalUnrealizedGain += unrealizedGain;
            console.log(`  ${category}: ${hName} 評価額=${formatCurrency(valuation)} 評価損益=${formatCurrency(unrealizedGain)}`);
          }
        }
      }

      if (holdings.length > 0 && snapshotId) {
        saveHoldings(snapshotId, holdings);
      }
      console.log(`\nポートフォリオ合計: 評価額=${formatCurrency(totalValuation)}, 評価損益=${formatCurrency(totalUnrealizedGain)}`);
      console.log(`${holdings.length}件の銘柄を保存しました`);

    } catch (e) {
      console.log('ポートフォリオ取得に失敗:', e.message);
      await page.screenshot({ path: '/home/mokoshi/moneyfoward/portfolio-error.png', fullPage: true });
    }

    return { totalAssets: totalAssetsResult, categories, holdings, totalValuation, totalUnrealizedGain };

  } catch (error) {
    console.error('エラーが発生しました:', error.message);
    await page.screenshot({ path: '/home/mokoshi/moneyfoward/error.png', fullPage: true });
    throw error;
  } finally {
    await browser.close();
  }
}

if (require.main === module) {
  scrape().then(result => {
    console.log('\nScraping result:', result);
  }).catch(err => {
    console.error('Scraping failed:', err.message);
    process.exit(1);
  });
}

module.exports = { scrape };
