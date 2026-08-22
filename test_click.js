const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', error => console.log('PAGE ERROR:', error.message));
  
  await page.goto('file:///' + __dirname.replace(/\\\\/g, '/') + '/asd_gestionale.html');
  
  console.log('App loaded. Clicking button...');
  await page.evaluate(() => {
     app.showPage('ricevute');
  });
  
  await page.waitForTimeout(1000);
  
  await page.evaluate(() => {
     app.openFastEntryModal();
  });
  
  await page.waitForTimeout(1000);
  console.log('Done.');
  await browser.close();
})();
