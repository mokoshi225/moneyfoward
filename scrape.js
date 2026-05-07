require('dotenv').config();
const { chromium } = require('playwright');
const { formatCurrency } = require('./utils');
const { saveSnapshot } = require('./db');

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

    if (totalAssetsResult && categories.length > 0) {
      saveSnapshot(totalAssetsResult, categories);
    }

    return { totalAssets: totalAssetsResult, categories };

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
