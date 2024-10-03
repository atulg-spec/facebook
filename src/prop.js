const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ 
    headless: false,
    args: ['--proxy-server=socks5://45.43.11.72:1080'] // Set the proxy server
  }); // Set headless to false
  const page = await browser.newPage();

  // Set the viewport to be a mobile device (iPhone 11 dimensions)
  await page.setViewport({
    width: 375, // iPhone 11 width
    height: 812, // iPhone 11 height
    deviceScaleFactor: 3, // Retina display
    isMobile: true,
    hasTouch: true,
  });

  // Set the user agent for iPhone 11
  await page.setUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 13_2_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/13.0.3 Mobile/15E148 Safari/604.1');

  await page.setExtraHTTPHeaders({
    'Accept-Language': 'en-US,en;q=0.9'
  });

  // Navigate to a website to see the mobile user agent
  await page.goto('https://browserscan.net/');
  
  // Wait for a moment to ensure the page is fully loaded
  // await page.waitForTimeout(3000);

  // Get and print the user agent
  const userAgent = await page.evaluate(() => navigator.userAgent);
  console.log('User Agent:', userAgent);

  // await browser.close();
})();
