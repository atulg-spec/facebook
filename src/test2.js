const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({
    headless: false, // Set to true for headless mode
    executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', // Path to the Chrome executable
    userDataDir: 'C:/Users/atulg/AppData/Local/Google/Chrome/User Data', // Path to the Chrome profile
    args: [
      '--profile-directory=Profile 3', // Opens the Default profile
    ],
    ignoreDefaultArgs: ['--disable-extensions'],
  });

  const page = await browser.newPage();
  await page.goto('https://example.com'); // Replace with your desired URL

  // Perform operations...

  // Close the browser
  await browser.close();
})();
