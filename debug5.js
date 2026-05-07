require('dotenv').config();
const { chromium } = require('playwright');

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
    
    await page.screenshot({ path: '/home/mokoshi/moneyfoward/before-click.png', fullPage: true });
    console.log('クリック前のスクリーンショット: before-click.png');
    
    console.log('ログインボタンをクリック...');
    await page.click('input[name="commit"], button[type="submit"]');
    
    await page.waitForTimeout(5000);
    
    console.log('クリック後のURL:', page.url());
    
    const pageText = await page.locator('body').textContent();
    
    if (pageText.includes('エラー') || pageText.includes('失敗') || pageText.includes('不正')) {
      console.log('エラーメッセージが検出されました');
      const errorMsg = await page.locator('.error, .alert, [class*="error"]').first().textContent().catch(() => 'エラー要素が見つかりません');
      console.log('エラー内容:', errorMsg);
    }
    
    await page.screenshot({ path: '/home/mokoshi/moneyfoward/after-click.png', fullPage: true });
    console.log('クリック後のスクリーンショット: after-click.png');
    
    console.log('ページテキスト(最初の1000文字):', pageText.substring(0, 1000));

  } catch (error) {
    console.error('エラーが発生しました:', error.message);
    await page.screenshot({ path: '/home/mokoshi/moneyfoward/error-state.png', fullPage: true });
  } finally {
    await browser.close();
  }
})();
