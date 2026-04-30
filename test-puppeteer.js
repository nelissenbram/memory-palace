const puppeteer = require('puppeteer');
(async () => {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  await page.setContent('<h1>Test</h1>');
  console.log('Puppeteer works!');
  await browser.close();
})();
