require('dotenv').config();
const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    console.log('MoneyForwardにアクセス中...');
    await page.goto('https://ssnb.x.moneyforward.com/', { waitUntil: 'networkidle', timeout: 60000 });

    await page.waitForTimeout(3000);
    
    console.log('現在のURL:', page.url());
    console.log('ページタイトル:', await page.title());
    
    await page.screenshot({ path: '/home/mokoshi/moneyfoward/debug_full.png', fullPage: true });
    
    const frames = page.frames();
    console.log('フレーム数:', frames.length);
    for (let i = 0; i < frames.length; i++) {
      console.log(`フレーム ${i}:`, frames[i].url());
    }
    
    const bodyText = await page.locator('body').textContent();
    console.log('ページのテキスト(最初の500文字):', bodyText.substring(0, 500));
    
    const allElements = await page.evaluate(() => {
      const inputs = Array.from(document.querySelectorAll('input'));
      return inputs.map((inp, idx) => ({
        index: idx,
        tag: inp.tagName,
        type: inp.type,
        name: inp.name,
        id: inp.id,
        className: inp.className,
        placeholder: inp.placeholder
      }));
    });
    
    console.log('見つかった全input要素:', JSON.stringify(allElements, null, 2));
    
    const hasLoginForm = await page.evaluate(() => {
      return document.body.innerHTML.includes('ログイン') || 
             document.body.innerHTML.includes('login') ||
             document.body.innerHTML.includes('mfid');
    });
    console.log('ログイン関連のテキストが含まれているか:', hasLoginForm);

  } catch (error) {
    console.error('エラーが発生しました:', error.message);
  } finally {
    await browser.close();
  }
})();
