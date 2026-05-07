require('dotenv').config();
const { chromium } = require('playwright');
const { formatCurrency } = require('./utils');

(async () => {
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
    
    if (match) {
      console.log('総資産額:', match[1]);
    } else {
      console.log('総資産額の取得に失敗しました');
      await page.screenshot({ path: '/home/mokoshi/moneyfoward/after-login.png', fullPage: true });
      console.log('スクリーンショット保存: after-login.png');
      
      const assetsAlt = await page.locator('h1, h2, h3, .total, [class*="total"]').first().textContent().catch(() => null);
      if (assetsAlt) {
        console.log('代替取得結果:', assetsAlt.trim());
      }
    }

    console.log('\n資産内訳を取得中...');
    const assetBreakdown = await page.evaluate(() => {
      return typeof initPieData !== 'undefined' ? initPieData : null;
    });

    if (assetBreakdown && Array.isArray(assetBreakdown)) {
      console.log('資産内訳:');
      assetBreakdown.forEach(item => {
        if (item.name && typeof item.y === 'number') {
          console.log(`  ${item.name}: ${formatCurrency(item.y)}`);
        }
      });
    } else {
      console.log('資産内訳の取得に失敗しました');
      await page.screenshot({ path: '/home/mokoshi/moneyfoward/breakdown-error.png', fullPage: true });
      console.log('スクリーンショット保存: breakdown-error.png');
    }

  } catch (error) {
    console.error('エラーが発生しました:', error.message);
    await page.screenshot({ path: '/home/mokoshi/moneyfoward/error.png', fullPage: true });
  } finally {
    await browser.close();
  }
})();
