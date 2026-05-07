require('dotenv').config();
const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    console.log('MoneyForwardにアクセス中...');
    await page.goto('https://ssnb.x.moneyforward.com/', { waitUntil: 'networkidle', timeout: 60000 });

    console.log('現在のURL:', page.url());
    
    const html = await page.content();
    console.log('ページタイトル:', await page.title());
    
    await page.screenshot({ path: '/home/mokoshi/moneyfoward/debug.png', fullPage: true });
    console.log('スクリーンショットを保存しました: debug.png');
    
    const inputs = await page.locator('input').all();
    console.log('見つかったinput要素の数:', inputs.length);
    
    for (let i = 0; i < Math.min(inputs.length, 10); i++) {
      const input = inputs[i];
      const name = await input.getAttribute('name');
      const type = await input.getAttribute('type');
      const id = await input.getAttribute('id');
      console.log(`Input ${i}: name="${name}", type="${type}", id="${id}"`);
    }

  } catch (error) {
    console.error('エラーが発生しました:', error.message);
  } finally {
    await browser.close();
  }
})();
