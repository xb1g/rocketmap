const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  for (const scheme of ['dark','light']) {
    const context = await browser.newContext({ viewport: { width: 1280, height: 700 }, colorScheme: scheme });
    const page = await context.newPage();
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
    await page.screenshot({ path: `tmp-buttons2-${scheme}.png`, fullPage: false });
    await context.close();
  }
  await browser.close();
})();
