const puppeteer = require('puppeteer');

(async () => {
  try {
    const browser = await puppeteer.launch({ headless: 'new' });
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });
    await page.goto('https://movie-ticket-booking-wazg.bolt.host', { waitUntil: 'networkidle2' });
    await page.screenshot({ path: 'ref-home.png' });
    
    // click on the first movie if it exists to see details page
    try {
        await page.click('a[href^="/movie/"]');
        await page.waitForTimeout(2000);
        await page.screenshot({ path: 'ref-movie.png' });
    } catch(e) {
        console.log("No movie link found");
    }

    await browser.close();
    console.log("Screenshots captured");
  } catch (err) {
    console.error(err);
  }
})();
