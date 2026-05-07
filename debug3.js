require('dotenv').config();
const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    console.log('MoneyForwardにアクセス中...');
    await page.goto('https://ssnb.x.moneyforward.com/', { waitUntil: 'networkidle', timeout: 60000 });

    console.log('ログインリンクをクリック...');
    await page.click('text=ログイン', { timeout: 10000 });
    
    await page.waitForTimeout(3000);
    console.log('遷移後のURL:', page.url());
    
    await page.waitForSelector('input', { timeout: 10000 });
    
    const inputs = await page.locator('input').all();
    console.log('見つかったinput要素の数:', inputs.length);
    
    for (let i = 0; i < inputs.length; i++) {
      const input = inputs[i];
      const name = await input.getAttribute('name');
      const type = await input.getAttribute('type');
      const id = await input.getAttribute('id');
      const placeholder = await input.getAttribute('placeholder');
      console.log(`Input ${i}: name="${name}", type="${type}", id="${id}", placeholder="${placeholder}"`);
    }
    
    await page.screenshot({ path: '/home/mokoshi/moneyfoward/after-click.png', fullPage: true });
    console.log('スクリーンショット保存: after-click.png');

  } catch (error) {
    console.error('エラーが発生しました:', error.message);
    await page.screenshot({ path: '/home/mokoshi/moneyfoward/error.png', fullPage: true });
  } finally {
    await browser.close();
  }
})();
