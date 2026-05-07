require('dotenv').config();
const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    console.log('ログインページに直接アクセス...');
    await page.goto('https://ssnb.x.moneyforward.com/users/sign_in', { waitUntil: 'networkidle', timeout: 60000 });

    await page.waitForTimeout(5000);
    
    console.log('現在のURL:', page.url());
    
    const inputs = await page.locator('input').all();
    console.log('見つかったinput要素の数:', inputs.length);
    
    for (let i = 0; i < inputs.length; i++) {
      const input = inputs[i];
      const name = await input.getAttribute('name');
      const type = await input.getAttribute('type');
      const id = await input.getAttribute('id');
      const placeholder = await input.getAttribute('placeholder');
      const visible = await input.isVisible();
      console.log(`Input ${i}: name="${name}", type="${type}", id="${id}", placeholder="${placeholder}", visible=${visible}`);
    }
    
    await page.screenshot({ path: '/home/mokoshi/moneyfoward/login-page.png', fullPage: true });
    console.log('スクリーンショット保存: login-page.png');

  } catch (error) {
    console.error('エラーが発生しました:', error.message);
    await page.screenshot({ path: '/home/mokoshi/moneyfoward/error.png', fullPage: true });
  } finally {
    await browser.close();
  }
})();
