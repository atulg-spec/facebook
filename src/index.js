const { app, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));
const os = require('os');
let downloadDir = path.join(os.homedir(), 'Downloads');
let extensionPath = path.join(downloadDir, 'WebRTC-Leak-Prevent');

// Function to generate a timestamp string
function getTimestamp() {
    const now = new Date();
    return now.toISOString().replace(/[:.]/g, '-'); // Replace colon and dot with dash for a valid filename
}



let mainWindow;
let browsers = [];
function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1536,
        height: 864,
        icon: path.join(__dirname, 'assets/icon.ico'),
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            nodeIntegration: true,
            contextIsolation: false,
        },
    });

    mainWindow.loadFile('frontend/index.html');

    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}

async function getIPAddress() {
    try {
        const response = await fetch('https://api.ipify.org?format=json');
        const data = await response.json();
        return data.ip;
    } catch (error) {
        console.error('Error fetching IP address:', error);
        return '0.0.0.0';
    }
}

function extractProxyDetails(inputString, timeZone) {
    const [proxyUsername, proxyPassword, proxyUrl] = inputString.match(/([^:]+):([^@]+)@(.+)/).slice(1);
    return { proxyUrl: `http://${proxyUrl}`, proxyUsername, proxyPassword, timeZone };
}

async function getTimezone(proxy) {
    console.log('func proxy')
    console.log(proxy)
    const url = `https://ipwhois.app/json/${proxy}`;

    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }
        const data = await response.json();

        // Extract and return the timezone from the response
        return data.timezone;
    } catch (error) {
        console.error('Error fetching timezone:', error);
        return null;
    }
}

async function getProxy(proxies) {
    const proxyKeys = Object.keys(proxies);
    const randomKey = proxyKeys[Math.floor(Math.random() * proxyKeys.length)];
    const proxy = randomKey;
    const timeZone = proxies[proxy];

    if (proxy.includes('@')) {
        return extractProxyDetails(proxy, timeZone);
    } else {
        try {
            const timezone = await getTimezone(proxy);
            return {
                proxyUrl: `socks5://${proxy}`,
                proxyUsername: 'proxyUsername',
                proxyPassword: 'proxyPassword',
                timeZone: timezone
            };
        } catch (error) {
            // Handle error if timezone fetch fails
            console.error('Error in getProxy:', error);
            return null;
        }
    }
}

function closeAllWindows() {
    try {
        browsers.forEach(browser => browser.close().catch(err => console.log('Error closing browser:', err)));
    }
    catch (e) {
        console.log('error in closing all')
        console.log(e)
    }
    browsers = [];
}

function convertCookies(cookies) {
    return cookies.map(cookie => {
        return {
            ...cookie,
            secure: cookie.secure === 'TRUE',
            expirationDate: Number(cookie.expiration)
        };
    });
}

async function autoScroll(page, maxScrolls, minTime) {
    try {
        console.log('bhai scrolling bhi to kar rhe hai 1')
        await page.waitForNavigation({ waitUntil: 'networkidle0' }); // Wait for network connections to settle
        console.log('bhai scrolling bhi to kar rhe hai')

        await page.evaluate(async (maxScrolls, minTime) => {
            await new Promise((resolve) => {
                var totalHeight = 0;
                var distance = 10;  // Adjust scroll distance as needed
                var scrolls = 0;
                var startTime = Date.now();  // start time
                var height = document.body.scrollHeight;

                function scroll() {
                    var scrollPos = window.scrollY || window.scrollTop || document.getElementsByTagName("html")[0].scrollTop;
                    window.scrollTo(0, scrollPos + distance);
                    totalHeight += distance;
                    scrolls++;

                    var elapsedTime = Date.now() - startTime;
                    if (elapsedTime >= minTime && (totalHeight >= height - window.innerHeight || scrolls >= maxScrolls)) {
                        clearInterval(timer);
                        resolve();
                    }
                }

                // Initial scroll
                scroll();

                // Interval for continuous scrolling
                var timer = setInterval(scroll, 200);  // Adjust interval time as needed

                // Ensure the minimum time has passed before resolving
                setTimeout(() => {
                    clearInterval(timer);
                    resolve();
                }, minTime);
            });
        }, maxScrolls, minTime);
        // Pass maxScrolls and minTime to the page.evaluate function
    }
    catch (e) { }
}

async function facebookAutoScroll(page, maxScrolls, minTime) {
    try {
        console.log('bhai scrolling bhi to kar rhe hai 1')
        // await page.waitForNavigation({ waitUntil: 'networkidle0' }); // Wait for network connections to settle
        console.log('bhai scrolling bhi to kar rhe hai')

        await page.evaluate(async (maxScrolls, minTime) => {
            await new Promise((resolve) => {
                var totalHeight = 0;
                var distance = 10;  // Adjust scroll distance as needed
                var scrolls = 0;
                var startTime = Date.now();  // start time
                var height = document.body.scrollHeight;

                function scroll() {
                    var scrollPos = window.scrollY || window.scrollTop || document.getElementsByTagName("html")[0].scrollTop;
                    window.scrollTo(0, scrollPos + distance);
                    totalHeight += distance;
                    scrolls++;

                    var elapsedTime = Date.now() - startTime;
                    if (elapsedTime >= minTime && (totalHeight >= height - window.innerHeight || scrolls >= maxScrolls)) {
                        clearInterval(timer);
                        resolve();
                    }
                }

                // Initial scroll
                scroll();

                // Interval for continuous scrolling
                var timer = setInterval(scroll, 200);  // Adjust interval time as needed

                // Ensure the minimum time has passed before resolving
                setTimeout(() => {
                    clearInterval(timer);
                    resolve();
                }, minTime);
            });
        }, maxScrolls, minTime);
        // Pass maxScrolls and minTime to the page.evaluate function
    }
    catch (e) { }
}




async function autoScrollReverse(page, maxScrolls) {
    try {
        await page.evaluate(async (maxScrolls) => {
            await new Promise((resolve) => {
                var totalHeight = document.body.scrollHeight;
                var distance = 18;
                var scrolls = 0;  // scrolls counter
                var timer = setInterval(() => {
                    window.scrollBy(0, -distance);  // scroll up (negative distance)
                    totalHeight -= distance;  // decrease totalHeight as we scroll up
                    scrolls++;  // increment counter

                    // stop scrolling if reached the top or the maximum number of scrolls
                    if (totalHeight <= 0 || scrolls >= maxScrolls) {
                        clearInterval(timer);
                        resolve();
                    }
                }, 100);
            });
        }, maxScrolls);  // pass maxScrolls to the function
    }
    catch (e) {

    }
}


const clickFirstElement = async (page, selectors) => {
    console.log('selectors:', selectors);

    for (const selector of selectors) {
        const element = await page.$(selector); // Get the first element matching the selector

        if (element) {
            console.log(`Element found matching selector: ${selector}`);

            // Check if the element is an iframe
            const tagName = await page.evaluate(el => el.tagName.toLowerCase(), element);
            console.log(`Tag Name: ${tagName}`);

            if (tagName === 'iframe') {
                // Get iframe src and navigate to it
                const iframeSrc = await page.evaluate(el => el.src, element);
                console.log(`Navigating to iframe src: ${iframeSrc}`);

                // Navigate to iframe src using location.href
                await page.evaluate((url) => {
                    window.location.href = url;
                }, iframeSrc);

                // Wait for the iframe content to load
                await delay(5000);

                // Check if current URL contains "facebook"
                const currentUrl = await page.evaluate(() => window.location.href);
                if (currentUrl.includes('facebook')) {
                    // Find <a> tag with data-lynx-mode="asynclazy"
                    const asyncLazyAnchor = await page.$('a[data-lynx-mode="asynclazy"]');
                    if (asyncLazyAnchor) {
                        const anchorHref = await page.evaluate(a => a.href, asyncLazyAnchor);
                        console.log(`Navigating to <a> tag with data-lynx-mode="asynclazy" href: ${anchorHref}`);

                        // Navigate to the href using location.href
                        await page.evaluate((url) => {
                            window.location.href = url;
                        }, anchorHref);
                    } else {
                        console.log(`No <a> tag found with data-lynx-mode="asynclazy"`);
                    }
                }
                else {
                    // Now find a random <a> on the new page and navigate to its href
                    const randomAnchor = await page.$('a'); // Finds first <a> tag
                    if (randomAnchor) {
                        const anchorHref = await page.evaluate(a => a.href, randomAnchor);
                        console.log(`Navigating to random <a> href: ${anchorHref}`);

                        // Navigate to anchor href using location.href
                        await page.evaluate((url) => {
                            window.location.href = url;
                        }, anchorHref);
                    }
                }
            }

            else if (tagName === 'img') {
                await page.evaluate(() => {
                    document.getElementsByTagName('img')[0].click()
                });
            }
            else if (tagName === 'a') {
                // If it's an <a> element, get its href and navigate to it
                const href = await page.evaluate(el => el.href, element);
                console.log(`Navigating to <a> href: ${href}`);

                // Navigate to href using location.href
                await page.evaluate((url) => {
                    window.location.href = url;
                }, href);
            } else {
                page.reload();
                console.log(`Skipping click for element matching: ${selector}`);
            }
            break; // Stop after handling the first matching element
        }
    }
};




async function facebookClick(page, data, selectorList, is_iframe) {
    // await delay(5000)
    if (is_iframe) {
        try {
            let selectors = selectorList.split(',')
            await page.waitForSelector('body');  // Adjust the selector as per your need
            await clickFirstElement(page, selectors);
            await facebookAutoScroll(page, 50, 5000);
        }
        catch (er) {
            console.log('Error on iframe');
            console.log(er);
        }
    }
    else {
        await page.waitForSelector(selector, { timeout: 60000 }); // Timeout in milliseconds (60,000 ms = 60 seconds)
        await page.evaluate(async (data, selector) => {
            await new Promise((resolve) => {
                // const container = document.querySelector(selector);
                let links = document.querySelectorAll(selector);
                // let links = Array.from(document.querySelectorAll(selector));
                // clicking part
                if (links.length > 0) {
                    let random = Math.floor(Math.random() * links.length);
                    console.log(links[random])
                    location.href = links[random].href;
                }
                else {
                }
                // clicking part end
                resolve();  // resolve the promise after the action
            });
        }, data, selector);  // pass data to the function
    }
}


async function click(page, data) {
    await page.evaluate(async (data) => {
        await new Promise((resolve) => {
            let urllist = data.mainurls;
            console.log('urllist')
            console.log(urllist)
            let links = Array.from(document.querySelectorAll('a[href]'));
            console.log('links')
            console.log(links)
            if (data.click_anywhere) {
                if (links.length > 0) {
                    let random = Math.floor(Math.random() * links.length);
                    console.log(links[random])
                    links[random].click();
                }
                else { }
            }
            else {
                if (window.location.href.includes('google.com')) {
                    links = Array.from(document.querySelectorAll('a[href][jsname="UWckNb"]'))
                        .filter(link => link.href.includes(data.domain_name));
                }
                else if (window.location.href.includes('yahoo.com')) {
                    links = Array.from(document.querySelectorAll('a[href][class="d-ib"]'))
                        .filter(link => link.href.includes(data.domain_name));
                }
                else if (window.location.href.includes('bing.com')) {
                    links = Array.from(document.querySelectorAll('a[href]'))
                        .filter(link => link.href.includes(data.domain_name));
                }
                else if (window.location.href.includes('duckduckgo.com')) {
                    links = Array.from(document.querySelectorAll('a[href][data-testid="result-title-a"]'))
                        .filter(link => link.href.includes(data.domain_name));
                }
                // clicking part
                if (links.length > 0) {
                    if (window.location.href.includes('google.com')) {
                    }
                    else {
                        links = links.filter(link => urllist.includes(link.href));
                    }
                    if (links.length > 0) {
                        let random = Math.floor(Math.random() * links.length);
                        console.log(links[random])
                        links[random].click();
                    }
                    else {
                        if (window.location.href.includes('google.com')) {
                        }
                        else {
                            window.location.href = urllist[Math.floor(Math.random() * urllist.length)];
                        }
                    }
                } else {
                    if (window.location.href.includes('google.com')) {
                    }
                    else {
                        window.location.href = urllist[Math.floor(Math.random() * urllist.length)];
                    }
                }
            }

            // clicking part end
            resolve();  // resolve the promise after the action
        });
    }, data);  // pass data to the function
}


async function saveCookiesToFile(page, filePath) {
    try {
        // Getting the cookies from the current page
        const cookies = await page.cookies();

        // Writing the cookies to a file as JSON
        fs.writeFileSync(filePath, JSON.stringify(cookies, null, 2));

        // Cookies have been saved successfully
        return true;
    } catch (error) {
        // An error occurred while saving cookies
        console.error('Error saving cookies:', error);
        return false;
    }
}

async function saveBrowserCookiesToFile(browser, filePath, allCookies) {
    try {


        // Remove duplicate cookies by filtering based on the cookie name and domain
        const uniqueCookies = allCookies.filter((cookie, index, self) =>
            index === self.findIndex((t) => (
                t.name === cookie.name && t.domain === cookie.domain
            ))
        );

        // Writing the cookies to a file as JSON
        fs.writeFileSync(filePath, JSON.stringify(uniqueCookies, null, 2));

        // Cookies have been saved successfully
        return true;
    } catch (error) {
        // An error occurred while saving cookies
        console.error('Error saving cookies:', error);
        return false;
    }
}

function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

async function selectAndUnselectText(page) {
    // Get the viewport height
    const viewportHeight = await page.evaluate(() => window.innerHeight);

    // Get all visible text nodes within the viewport
    const textNodes = await page.evaluate(viewportHeight => {
        if (window.location.href.includes('google.com')) {
            return 'no effect'
        }
        else {
            const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
                acceptNode: (node) => {
                    // Filter out invisible or empty text nodes
                    if (node.nodeValue.trim() && window.getComputedStyle(node.parentElement).display !== 'none') {
                        return NodeFilter.FILTER_ACCEPT;
                    }
                    return NodeFilter.FILTER_REJECT;
                }
            });
            const nodes = [];
            let node;
            while (node = walker.nextNode()) {
                const range = document.createRange();
                range.selectNodeContents(node);
                const rect = range.getBoundingClientRect();
                if (rect.top >= 0 && rect.bottom <= viewportHeight && rect.width > 0 && rect.height > 0) {
                    nodes.push({ text: node.nodeValue.trim(), rect: rect.toJSON() });
                }
            }
            return nodes;
        }
    }, viewportHeight);

    if (textNodes.length === 0) {
        console.log('No visible text nodes found.');
        return;
    }

    // Select a random text node
    const randomTextNode = textNodes[getRandomInt(0, textNodes.length - 1)];
    const { rect } = randomTextNode;

    try {
        // Simulate mouse events to select the text
        await page.mouse.move(rect.x, rect.y);
        await page.mouse.down();
        await page.mouse.move(rect.x + rect.width, rect.y + rect.height, { steps: 300 });
        await page.mouse.up();

        // Wait for 2 seconds
        // await page.waitForTimeout(2000);

        // Unselect the text by clicking somewhere else
        await page.mouse.click(rect.x, rect.y + rect.height + 1000);
    }
    catch (e) {

    }
}
async function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

const getRandomElement = (array) => array[Math.floor(Math.random() * array.length)];

// Load cookie files from the test folder
const loadCookiesFromFolder = (folderPath) => {
    return fs.readdirSync(folderPath)
        .filter(file => file.endsWith('.json')) // Only JSON files
        .map(file => {
            const filePath = path.join(folderPath, file);
            const cookies = JSON.parse(fs.readFileSync(filePath, 'utf8'));
            return cookies;
        });
};

async function fetchDataAndInteract(data, i) {
    puppeteer.use(StealthPlugin());
    let proxyData = {}
    async function fetchProxyData() {
        try {
            proxyData = await getProxy(data.proxies);
            console.log(proxyData);
            // Use proxyData as needed
        } catch (error) {
            console.error('Error fetching proxy data:', error);
        }
    }
    await fetchProxyData();
    console.log('proxyData')
    console.log(proxyData)
    const { proxyUrl, proxyUsername, proxyPassword, timeZone } = proxyData;
    console.log(timeZone)
    let exPath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
    let randomAgents = data['user_agents'][Math.floor(Math.random() * data['user_agents'].length)]

    const browser = await puppeteer.launch({
        executablePath: exPath,
        headless: false,
        devtools: false,
        args: [
            '--disable-webrtc',
            '--disable-features=WebRTC-HW-Decoding,WebRTC-HW-Video-Coding',
            '--disable-features=WebRTC-HW-Encoding',
            '--disable-features=WebRTC-Screen-Capture-Capabilities',
            '--disable-rtc-smoothness-algorithm',
            '--webrtc-ip-handling-policy=disable_non_proxied_udp',
            '--force-webrtc-ip-handling-policy',
            '--no-sandbox',
            `--proxy-server=${proxyUrl}`,
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--no-experiments',
            '--disable-infobars',
            '--proxy-bypass-list=<-loopback>',
            `--window-position=${i * 20},${i * 20}`,
            `--window-size=${1500 - (i * 10)},${800 - (i * 5)}`,
            `--timezone=${timeZone}`,
            '--disable-accelerated-2d-canvas',
        ],
        ignoreDefaultArgs: ["--enable-automation"],
        env: {
            TZ: timeZone,
            ...process.env,
            // Set additional hardware and environment settings
            "VISITOR_ID": randomAgents.visitor_id,
            "CANVAS_FINGERPRINT": randomAgents.canvas,
            "WEBGL_FINGERPRINT": randomAgents.WebGL,
            "UNMASKED_RENDERER": randomAgents.unmasked_renderer,
            "AUDIO_FINGERPRINT": randomAgents.audio,
            "CLIENT_RECTS": randomAgents.client_rects,
            "WEBGPU_REPORT": randomAgents.webGPU_report,
            "SCREEN_RESOLUTION": randomAgents.screen_resolution,
            "COLOR_DEPTH": randomAgents.color_depth,
            "TOUCH_SUPPORT": randomAgents.touch_support,
            "DEVICE_MEMORY": randomAgents.device_memory,
            "HARDWARE_CONCURRENCY": randomAgents.hardware_concurrency,
        },
    });

    const page = await browser.newPage();

    await page.setViewport({
        width: randomAgents.width,
        height: randomAgents.height,
        isMobile: randomAgents.isMobile,
        deviceScaleFactor: 3, // Adjust based on your requirements
        hasTouch: randomAgents.isMobile,
        isLandscape: false,
    });

    await page.evaluateOnNewDocument((visitorId, canvasFingerprint, webGLFingerprint, unmaskedRenderer, audioFingerprint, clientRects, webGPURreport, screenResolution, colorDepth, touchSupport, deviceMemory, hardwareConcurrency) => {
        // Set properties on the browser context
        Object.defineProperty(window.navigator, 'deviceMemory', {
            get: () => deviceMemory,
        });
        Object.defineProperty(window.navigator, 'hardwareConcurrency', {
            get: () => hardwareConcurrency,
        });
        // Further hardware fingerprinting methods can be set up similarly...
    }, randomAgents.visitor_id, randomAgents.canvas, randomAgents.WebGL, randomAgents.unmasked_renderer, randomAgents.audio, randomAgents.client_rects, randomAgents.webGPU_report, randomAgents.screen_resolution, randomAgents.color_depth, randomAgents.touch_support, randomAgents.device_memory, randomAgents.hardware_concurrency);


    try {
        const folderPath = path.join(process.env.HOME || process.env.USERPROFILE, 'Downloads', data.cookies_folder);

        // Load all cookies from the folder
        const allCookies = loadCookiesFromFolder(folderPath);

        if (allCookies.length === 0) {
            console.log('No cookie files found in the folder.');
        }
        else {
            // Choose random cookies
            const randomCookies = getRandomElement(allCookies);
            // Set cookies in Puppeteer
            await page.setCookie(...randomCookies);
        }

    }
    catch (e) {
        console.log('Cookie Use Error')
        console.log(e)
    }
    if (proxyUrl.startsWith("socks5")) {
    }
    else {
        await page.authenticate({ username: proxyUsername, password: proxyPassword });
    }
    await page.setUserAgent(randomAgents['userAgents']);
    await page.emulateTimezone(timeZone);
    await page.setExtraHTTPHeaders({
        'Accept-Language': 'en-US,en;q=0.9'
    });
    browsers.push(browser);
    const urllist = data.urls;

    async function performActions() {
        let tempurl = urllist[Math.floor(Math.random() * urllist.length)]
        console.log('tempurl')
        console.log(tempurl)
        await page.goto(tempurl, { waitUntil: 'domcontentloaded' });
        const timestamp = getTimestamp();
        const downloadsPath = path.join(os.homedir(), 'Downloads', data.campaign_name, `cookies-${timestamp}.json`);
        const folderPath = path.dirname(downloadsPath);

        // Check if the folder exists, and if not, create it
        if (!fs.existsSync(folderPath)) {
            fs.mkdirSync(folderPath, { recursive: true });
        }

        page.on('error', async (error) => {
            if (error.message.includes('net::ERR_PROXY_CONNECTION_FAILED')) {
                console.error('Proxy connection failed. Closing browser.');
                await browser.close();
                fetchDataAndInteract(data, i)
            }
        });


        const elementExists = await page.$('#main-frame-error') !== null;
        if (elementExists) {
            await browser.close()
            // main-frame-error
            fetchDataAndInteract(data, i)
        }

        let currentURL = page.url();
        if (currentURL.includes('https://www.google.com/sorry')) {
            await browser.close()
            // main-frame-error
            fetchDataAndInteract(data, i)
        }

        try {
            if (data.selection_on_page) {
                let intervalId = setInterval(async () => {
                    try {
                        await selectAndUnselectText(page);
                    } catch (error) {
                        console.error('Error selecting/unselecting text:', error);
                    }
                }, 4000);
            }
            else {
                console.log('selection is not here')
            }
        }
        catch (e) {
            console.log('yaha hai bhai')
            console.log(e)
        }
        let allCookies = [];
        data['pages'] = data['pages'].slice(0, (Math.floor(Math.random() * (data.visit_count_to - data.visit_count_from + 1)) + data.visit_count_from))
        for (let x of data['pages']) {
            console.log(data['pages']);
            let scroll_duration = Math.floor(Math.random() * (x['scroll_duration_to'] - x['scroll_duration_from'] + 1)) + x['scroll_duration_from'];
            console.log('scroll_duration')
            console.log(scroll_duration)
            try {
                try {
                    await autoScroll(page, 50, scroll_duration * 1000);
                }
                catch (e) {
                    console.log('ohh')
                    console.log(e)
                }
                // Cookies Section        
                const pages = await browser.pages();

                for (let p of pages) {
                    const cookies = await p.cookies();
                    allCookies = allCookies.concat(cookies);
                }
                // Cookies Section End        

                console.log('yha to aa rhe hai')
                
                await autoScrollReverse(page, 50);
                await click(page, data);
            }
            catch (err) {
                console.log('Error is ')
                console.log(err)
            }
        }
        const success = await saveBrowserCookiesToFile(browser, downloadsPath, allCookies);
        if (success) {
            console.log('Cookies have been saved to:', downloadsPath);
        }

        try {
            let index = browsers.indexOf(browser);

            if (index !== -1) {
                // Remove the browser from the array
                browsers.splice(index, 1);
            } else {
                console.log("Browser not found in the array.");
            }
            console.log('1 is called')
            await browser.close()
        }
        catch (e) {
            console.error('Error in closing:', e);
        }
    }
    await performActions().catch(error => {
        if (error.message.includes('net::ERR_PROXY_CONNECTION_FAILED')) {
            console.error('Proxy connection failed. Closing browser.');
            if (browser) {
                browser.close();
            }
            fetchDataAndInteract(data, i);
        } else {
            console.error('An unexpected error occurred:', error);
        }
        console.error('Error in performActions:', error);
    })
}


async function facebook(data, i) {
    puppeteer.use(StealthPlugin());
    try {
        let proxyData = {}
        async function fetchProxyData() {
            try {
                proxyData = await getProxy(data.proxies);
                console.log(proxyData);
                // Use proxyData as needed
            } catch (error) {
                console.error('Error fetching proxy data:', error);
            }
        }
        await fetchProxyData();
        const { proxyUrl, proxyUsername, proxyPassword, timeZone } = proxyData;
        let exPath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
        let randomAgents = data['user_agents'][Math.floor(Math.random() * data['user_agents'].length)]
        const browser = await puppeteer.launch({
            executablePath: exPath,
            headless: false,
            devtools: false,
            args: [
                '--disable-webrtc',  // Disables WebRTC
                '--disable-features=WebRTC-HW-Decoding,WebRTC-HW-Video-Coding',
                '--disable-features=WebRTC-HW-Encoding',
                '--disable-features=WebRTC-Screen-Capture-Capabilities',
                '--disable-rtc-smoothness-algorithm',  // Optional, but might help
                '--webrtc-ip-handling-policy=disable_non_proxied_udp',
                '--force-webrtc-ip-handling-policy',
                '--no-sandbox',
                `--proxy-server=${proxyUrl}`,
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--no-experiments',
                '--disable-infobars',
                '--proxy-bypass-list=<-loopback>',
                `--window-position=${i * 20},${i * 20}`,
                `--window-size=${1500 - (i * 10)},${800 - (i * 5)}`,
                `--timezone=${timeZone}`,
                '--disable-accelerated-2d-canvas',
            ],
            ignoreDefaultArgs: ["--enable-automation"],
            env: {
                TZ: timeZone,
                ...process.env,
                // Set additional hardware and environment settings
                "VISITOR_ID": randomAgents.visitor_id,
                "CANVAS_FINGERPRINT": randomAgents.canvas,
                "WEBGL_FINGERPRINT": randomAgents.WebGL,
                "UNMASKED_RENDERER": randomAgents.unmasked_renderer,
                "AUDIO_FINGERPRINT": randomAgents.audio,
                "CLIENT_RECTS": randomAgents.client_rects,
                "WEBGPU_REPORT": randomAgents.webGPU_report,
                "SCREEN_RESOLUTION": randomAgents.screen_resolution,
                "COLOR_DEPTH": randomAgents.color_depth,
                "TOUCH_SUPPORT": randomAgents.touch_support,
                "DEVICE_MEMORY": randomAgents.device_memory,
                "HARDWARE_CONCURRENCY": randomAgents.hardware_concurrency,
            },
        });
        const page = await browser.newPage();
        await page.setViewport({
            width: randomAgents.width,
            height: randomAgents.height,
            isMobile: randomAgents.isMobile,
            deviceScaleFactor: 3, // Adjust based on your requirements
            hasTouch: randomAgents.isMobile,
            isLandscape: false,
        });
        await page.evaluateOnNewDocument((visitorId, canvasFingerprint, webGLFingerprint, unmaskedRenderer, audioFingerprint, clientRects, webGPURreport, screenResolution, colorDepth, touchSupport, deviceMemory, hardwareConcurrency) => {
            // Set properties on the browser context
            Object.defineProperty(window.navigator, 'deviceMemory', {
                get: () => deviceMemory,
            });
            Object.defineProperty(window.navigator, 'hardwareConcurrency', {
                get: () => hardwareConcurrency,
            });
            // Further hardware fingerprinting methods can be set up similarly...
        }, randomAgents.visitor_id, randomAgents.canvas, randomAgents.WebGL, randomAgents.unmasked_renderer, randomAgents.audio, randomAgents.client_rects, randomAgents.webGPU_report, randomAgents.screen_resolution, randomAgents.color_depth, randomAgents.touch_support, randomAgents.device_memory, randomAgents.hardware_concurrency);


        try {
            const folderPath = path.join(process.env.HOME || process.env.USERPROFILE, 'Downloads', data.cookies_folder);
            // Load all cookies from the folder
            const allCookies = loadCookiesFromFolder(folderPath);

            if (allCookies.length === 0) {
                console.log('No cookie files found in the folder.');
                return;
            }
            // Choose random cookies
            const randomCookies = getRandomElement(allCookies);
            // Set cookies in Puppeteer
            await page.setCookie(...randomCookies);
        }
        catch (e) {
            console.log('Cookie Use Error')
            console.log(e)
        }
        if (proxyUrl.startsWith("socks5")) {
        }
        else {
            await page.authenticate({ username: proxyUsername, password: proxyPassword });
        }

        console.log('randomAgents')
        console.log(randomAgents)
        // await page.setUserAgent(randomAgents);
        await page.emulateTimezone(timeZone);
        await page.setExtraHTTPHeaders({
            'Accept-Language': 'en-US,en;q=0.9'
        });
        browsers.push(browser);
        const urllist = data.urls;
        async function performActions(url) {
            await page.goto(url, { waitUntil: 'load', timeout: 60000 });
            console.log('abb yha aaye')
            const timestamp = getTimestamp();
            const downloadsPath = path.join(os.homedir(), 'Downloads', data.campaign_name, `cookies-${timestamp}.json`);
            const folderPath = path.dirname(downloadsPath);
            // Check if the folder exists, and if not, create it
            if (!fs.existsSync(folderPath)) {
                fs.mkdirSync(folderPath, { recursive: true });
            }
            let currentURL = page.url();
            if (currentURL.includes('https://www.facebook.com/login/')) {
                await browser.close()
                let index = browsers.indexOf(browser);

                if (index !== -1) {
                    // Remove the browser from the array
                    browsers.splice(index, 1);
                } else {
                    console.log("Browser not found in the array.");
                }
                // main-frame-error
                facebook(data, i)
            }
            if (currentURL.includes('https://facebook.com/login/')) {
                await browser.close()
                let index = browsers.indexOf(browser);

                if (index !== -1) {
                    // Remove the browser from the array
                    browsers.splice(index, 1);
                } else {
                    console.log("Browser not found in the array.");
                }
                // main-frame-error
                facebook(data, i)
            }

            if (data.direct_traffic) { }
            else {
                try {
                    console.log('check kar rhe hai.');
                    console.log('check kar rhe hai. mil gya');
                    await page.waitForSelector('div[aria-label="Close"]', { timeout: 60000 });
                    await page.click('div[aria-label="Close"]');
                    await page.click('div[aria-label="Close"]');
                    console.log('Close button clicked.');
                } catch (error) {
                    console.error('Error clicking close button:', error);
                }

                try {
                    await page.waitForSelector(data.facebook_post_div);
                    console.log(`Selector ${data.facebook_post_div} found.`);

                    await page.evaluate((data) => {
                        try {
                            const container = document.querySelector(data.facebook_post_div);
                            const links = container.querySelectorAll('a');
                            if (links.length > 0) {
                                const randomLink = links[Math.floor(Math.random() * links.length)];
                                window.location.href = randomLink.href;
                                console.log('Navigating to random link.');
                                // Alternatively, you can use randomLink.click();
                            } else {
                                console.log('No links found inside the specified div.');
                            }
                        } catch (error) {
                            console.error('Error during evaluation:', error);
                        }
                    }, data);
                } catch (error) {
                    console.error('Error processing facebook_post_div:', error);
                }

                // END FACEBOOK SECTION
                if (data.is_iframe) {
                    try {
                        await facebookClick(page, data, data.facebook_ads_div, data.is_iframe);
                    }
                    catch (er) {
                        console.log('Error on iframe');
                        console.log(er);
                    }
                }
                else {
                    try {
                        await delay(5000)
                        console.log('data.facebook_ads_div')
                        console.log(data.facebook_ads_div)
                        await page.waitForSelector(data.facebook_ads_div, { timeout: 60000 }); // Timeout in milliseconds (60,000 ms = 60 seconds)

                        console.log('getting a query selector')
                        await page.evaluate((data) => {
                            try {
                                const container = document.querySelector(data.facebook_ads_div);
                                const links = container.querySelectorAll('a');
                                if (links.length > 0) {
                                    const randomLink = links[Math.floor(Math.random() * links.length)];
                                    randomLink.click()
                                    console.log('Navigating to random link.');
                                    // Alternatively, you can use randomLink.click();
                                } else {
                                    console.log('No links found inside the specified div.');
                                }
                            } catch (error) {
                                console.error('Error during evaluation:', error);
                            }
                        }, data);
                    }
                    catch (e) {
                        console.log(e)
                    }
                }
            }

            let scroll_duration
            for (let x of data['pages']) {
                scroll_duration = Math.floor(Math.random() * (x['scroll_duration_to'] - x['scroll_duration_from'] + 1)) + x['scroll_duration_from'];
                try {
                    console.log('scroll_duration')
                    console.log(scroll_duration)
                    try {
                        let intervalId = setInterval(async () => {
                            try {
                                await selectAndUnselectText(page);
                            } catch (error) {
                                console.error('Error selecting/unselecting text:', error);
                            }
                        }, 4000);
                    }
                    catch (e) { }
                    await facebookAutoScroll(page, 50, scroll_duration * 1000);
                    await autoScrollReverse(page, 50);
                    await facebookClick(page, data, x['click_selector'], x['is_iframe']);
                }
                catch (err) {
                    console.log('Error is ')
                    console.log(err)
                }
            }
            try {
                let index = browsers.indexOf(browser);

                if (index !== -1) {
                    // Remove the browser from the array
                    browsers.splice(index, 1);
                } else {
                    console.log("Browser not found in the array.");
                }
                console.log('1 is called')
                await browser.close()
            }
            catch (e) {
                console.error('Error in closing:', e);
            }
        }
        await performActions(urllist[Math.floor(Math.random() * urllist.length)]).catch(error => {
            if (error.message.includes('net::ERR_PROXY_CONNECTION_FAILED')) {
                console.error('Proxy connection failed. Closing browser.');
                if (browser) {
                    browser.close();
                }
                facebook(data, i);
            } else {
                console.error('An unexpected error occurred:', error);
            }
            console.error('Error in performActions:', error);
        })
    } catch (error) {
        console.error('Puppeteer Error:', error);
    }
}

async function make_google_login(data, i, account) {
    // let proxyData = {}
    // async function fetchProxyData() {
    //     try {
    //         proxyData = await getProxy(data.proxies);
    //         console.log(proxyData);
    //         // Use proxyData as needed
    //     } catch (error) {
    //         console.error('Error fetching proxy data:', error);
    //     }
    // }
    // await fetchProxyData();
    // console.log('proxyData')
    // console.log(proxyData)
    // const { proxyUrl, proxyUsername, proxyPassword, timeZone } = proxyData;
    // console.log(timeZone)
    let exPath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
    let randomAgents = data['user_agents'][Math.floor(Math.random() * data['user_agents'].length)]
    const timestamp = getTimestamp();
    const profilePath = path.join(os.homedir(), 'Downloads', data.campaign_name, 'Profiles', `profile-${timestamp}`);
    // Now create the folder if it doesn't exist
    if (!fs.existsSync(profilePath)) {
        fs.mkdirSync(profilePath, { recursive: true }); // recursive allows creating nested directories
    }
    const browser = await puppeteer.launch({
        executablePath: exPath,
        headless: false,
        devtools: false,
        userDataDir: profilePath,
        args: [
            '--disable-webrtc',
            '--disable-features=WebRTC-HW-Decoding,WebRTC-HW-Video-Coding',
            '--disable-features=WebRTC-HW-Encoding',
            '--disable-features=WebRTC-Screen-Capture-Capabilities',
            '--disable-rtc-smoothness-algorithm',
            '--webrtc-ip-handling-policy=disable_non_proxied_udp',
            '--force-webrtc-ip-handling-policy',
            '--no-sandbox',
            // `--proxy-server=${proxyUrl}`,
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--no-experiments',
            '--disable-infobars',
            '--proxy-bypass-list=<-loopback>',
            `--window-position=${i * 20},${i * 20}`,
            `--window-size=${1500 - (i * 10)},${800 - (i * 5)}`,
            // `--timezone=${timeZone}`,
            '--disable-accelerated-2d-canvas',
        ],
        ignoreDefaultArgs: ["--enable-automation"],
        env: {
            // TZ: timeZone,
            ...process.env,
            // Set additional hardware and environment settings
            "VISITOR_ID": randomAgents.visitor_id,
            "CANVAS_FINGERPRINT": randomAgents.canvas,
            "WEBGL_FINGERPRINT": randomAgents.WebGL,
            "UNMASKED_RENDERER": randomAgents.unmasked_renderer,
            "AUDIO_FINGERPRINT": randomAgents.audio,
            "CLIENT_RECTS": randomAgents.client_rects,
            "WEBGPU_REPORT": randomAgents.webGPU_report,
            "SCREEN_RESOLUTION": randomAgents.screen_resolution,
            "COLOR_DEPTH": randomAgents.color_depth,
            "TOUCH_SUPPORT": randomAgents.touch_support,
            "DEVICE_MEMORY": randomAgents.device_memory,
            "HARDWARE_CONCURRENCY": randomAgents.hardware_concurrency,
        },
    });

    const page = await browser.newPage();

    await page.setViewport({
        width: randomAgents.width,
        height: randomAgents.height,
        isMobile: randomAgents.isMobile,
        deviceScaleFactor: 3, // Adjust based on your requirements
        hasTouch: randomAgents.isMobile,
        isLandscape: false,
    });

    await page.evaluateOnNewDocument((visitorId, canvasFingerprint, webGLFingerprint, unmaskedRenderer, audioFingerprint, clientRects, webGPURreport, screenResolution, colorDepth, touchSupport, deviceMemory, hardwareConcurrency) => {
        // Set properties on the browser context
        Object.defineProperty(window.navigator, 'deviceMemory', {
            get: () => deviceMemory,
        });
        Object.defineProperty(window.navigator, 'hardwareConcurrency', {
            get: () => hardwareConcurrency,
        });
        // Further hardware fingerprinting methods can be set up similarly...
    }, randomAgents.visitor_id, randomAgents.canvas, randomAgents.WebGL, randomAgents.unmasked_renderer, randomAgents.audio, randomAgents.client_rects, randomAgents.webGPU_report, randomAgents.screen_resolution, randomAgents.color_depth, randomAgents.touch_support, randomAgents.device_memory, randomAgents.hardware_concurrency);

    try {
        const folderPath = path.join(process.env.HOME || process.env.USERPROFILE, 'Downloads', data.cookies_folder);

        // Load all cookies from the folder
        const allCookies = loadCookiesFromFolder(folderPath);

        if (allCookies.length === 0) {
            console.log('No cookie files found in the folder.');
        }
        else {
            // Choose random cookies
            const randomCookies = getRandomElement(allCookies);
            // Set cookies in Puppeteer
            await page.setCookie(...randomCookies);
        }

    }
    catch (e) {
        console.log('Cookie Use Error')
        console.log(e)
    }
    // if (proxyUrl.startsWith("socks5")) {
    // }
    // else {
    //     await page.authenticate({ username: proxyUsername, password: proxyPassword });
    // }
    await page.setUserAgent(randomAgents.userAgents);
    // await page.emulateTimezone(timeZone);
    await page.setExtraHTTPHeaders({
        'Accept-Language': 'en-US,en;q=0.9'
    });
    browsers.push(browser);

    async function performActions() {
        await page.goto('https://mail.google.com', { waitUntil: 'load', timeout: 60000 });
        const timestamp = getTimestamp();
        const downloadsPath = path.join(os.homedir(), 'Downloads', data.campaign_name, `cookies-${timestamp}.json`);
        const folderPath = path.dirname(downloadsPath);

        // Check if the folder exists, and if not, create it
        if (!fs.existsSync(folderPath)) {
            fs.mkdirSync(folderPath, { recursive: true });
        }

        page.on('error', async (error) => {
            if (error.message.includes('net::ERR_PROXY_CONNECTION_FAILED')) {
                console.error('Proxy connection failed. Closing browser.');
                await browser.close();
                make_google_login(data, i, account)
            }
        });


        const elementExists = await page.$('#main-frame-error') !== null;
        if (elementExists) {
            await browser.close()
            // main-frame-error
            make_google_login(data, i, account)
        }

        let currentURL = page.url();
        if (currentURL.includes('https://www.google.com/sorry')) {
            await browser.close()
            make_google_login(data, i, account)
        }
        if (currentURL.includes('https://www.google.com/intl/en-US/gmail/')) {
            try {
                await delay(1000);
                await page.waitForSelector('a.button.button--medium.button--mobile-before-hero-only');
                // Click the "Sign in" button
                await page.click('a.button.button--medium.button--mobile-before-hero-only');
                await delay(2000);
                let currentURL = page.url();
                if (currentURL.includes('https://accounts.google.com')) {
                    await delay(1000);
                    await page.keyboard.type(account.email, { delay: 120 });
                    await delay(2000);
                    await page.keyboard.press('Enter');
                    await delay(3000);
                    await page.keyboard.type(account.password, { delay: 120 });
                    await delay(2000);
                    await page.keyboard.press('Enter');
                    await delay(3000);
                    try {
                        await page.waitForSelector('button[jsname="LgbsSe"]');
                        // Click the button
                        await page.click('button[jsname="LgbsSe"]');
                        await delay(2000)
                    }
                    catch (e) {
                        console.log(e)
                    }
                }
            }
            catch (e) {
                console.log(e);
            }
        }
        else if (currentURL.includes('https://accounts.google.com')) {
            try {
                await delay(1000);
                await page.keyboard.type(account.email, { delay: 120 });
                await delay(2000);
                await page.keyboard.press('Enter');
                await delay(3000);
                await page.keyboard.type(account.password, { delay: 120 });
                await delay(2000);
                await page.keyboard.press('Enter');
                await delay(3000);
                try {
                    await page.waitForSelector('button[jsname="LgbsSe"]');
                    // Click the button
                    await page.click('button[jsname="LgbsSe"]');
                    await delay(2000)
                }
                catch (e) {
                    console.log(e)
                }
            }
            catch (e) {
                console.log(e);
            }
        }
        try {
            let index = browsers.indexOf(browser);

            if (index !== -1) {
                // Remove the browser from the array
                browsers.splice(index, 1);
            } else {
                console.log("Browser not found in the array.");
            }
            console.log('1 is called')
            await browser.close()
        }
        catch (e) {
            console.error('Error in closing:', e);
        }
    }
    await performActions().catch(error => {
        if (error.message.includes('net::ERR_PROXY_CONNECTION_FAILED')) {
            console.error('Proxy connection failed. Closing browser.');
            if (browser) {
                browser.close();
            }
            make_google_login(data, i, account);
        } else {
            console.error('An unexpected error occurred:', error);
        }
        console.error('Error in performActions:', error);
    })
}

async function subscribe(data, i, profile) {
    puppeteer.use(StealthPlugin());
    // let proxyData = {}
    // async function fetchProxyData() {
    //     try {
    //         proxyData = await getProxy(data.proxies);
    //         console.log(proxyData);
    //         // Use proxyData as needed
    //     } catch (error) {
    //         console.error('Error fetching proxy data:', error);
    //     }
    // }
    // await fetchProxyData();
    // console.log('proxyData')
    // console.log(proxyData)
    // const { proxyUrl, proxyUsername, proxyPassword, timeZone } = proxyData;
    // console.log(timeZone)
    let exPath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
    let randomAgents = data['user_agents'][Math.floor(Math.random() * data['user_agents'].length)]
    const browser = await puppeteer.launch({
        executablePath: exPath,
        headless: false,
        devtools: false,
        userDataDir: profile,
        args: [
            // '--disable-webrtc',
            // '--disable-features=WebRTC-HW-Decoding,WebRTC-HW-Video-Coding',
            // '--disable-features=WebRTC-HW-Encoding',
            // '--disable-features=WebRTC-Screen-Capture-Capabilities',
            // '--disable-rtc-smoothness-algorithm',
            // '--webrtc-ip-handling-policy=disable_non_proxied_udp',
            // '--force-webrtc-ip-handling-policy',
            '--no-sandbox',
            // `--proxy-server=${proxyUrl}`,
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--no-experiments',
            '--disable-infobars',
            '--proxy-bypass-list=<-loopback>',
            `--window-position=${i * 20},${i * 20}`,
            `--window-size=${1500 - (i * 10)},${800 - (i * 5)}`,
            // `--timezone=${timeZone}`,
            '--disable-accelerated-2d-canvas',
        ],
        ignoreDefaultArgs: ["--enable-automation"],
        env: {
            // TZ: timeZone,
            ...process.env,
            // Set additional hardware and environment settings
            "VISITOR_ID": randomAgents.visitor_id,
            "CANVAS_FINGERPRINT": randomAgents.canvas,
            "WEBGL_FINGERPRINT": randomAgents.WebGL,
            "UNMASKED_RENDERER": randomAgents.unmasked_renderer,
            "AUDIO_FINGERPRINT": randomAgents.audio,
            "CLIENT_RECTS": randomAgents.client_rects,
            "WEBGPU_REPORT": randomAgents.webGPU_report,
            "SCREEN_RESOLUTION": randomAgents.screen_resolution,
            "COLOR_DEPTH": randomAgents.color_depth,
            "TOUCH_SUPPORT": randomAgents.touch_support,
            "DEVICE_MEMORY": randomAgents.device_memory,
            "HARDWARE_CONCURRENCY": randomAgents.hardware_concurrency,
        },
    });

    const page = await browser.newPage();

    await page.setViewport({
        width: randomAgents.width,
        height: randomAgents.height,
        isMobile: randomAgents.isMobile,
        deviceScaleFactor: 3, // Adjust based on your requirements
        hasTouch: randomAgents.isMobile,
        isLandscape: false,
    });

    await page.evaluateOnNewDocument((visitorId, canvasFingerprint, webGLFingerprint, unmaskedRenderer, audioFingerprint, clientRects, webGPURreport, screenResolution, colorDepth, touchSupport, deviceMemory, hardwareConcurrency) => {
        // Set properties on the browser context
        Object.defineProperty(window.navigator, 'deviceMemory', {
            get: () => deviceMemory,
        });
        Object.defineProperty(window.navigator, 'hardwareConcurrency', {
            get: () => hardwareConcurrency,
        });
        // Further hardware fingerprinting methods can be set up similarly...
    }, randomAgents.visitor_id, randomAgents.canvas, randomAgents.WebGL, randomAgents.unmasked_renderer, randomAgents.audio, randomAgents.client_rects, randomAgents.webGPU_report, randomAgents.screen_resolution, randomAgents.color_depth, randomAgents.touch_support, randomAgents.device_memory, randomAgents.hardware_concurrency);

    // if (proxyUrl.startsWith("socks5")) {
    // }
    // else {
    //     await page.authenticate({ username: proxyUsername, password: proxyPassword });
    // }
    await page.setUserAgent(randomAgents.userAgents);
    // await page.emulateTimezone(timeZone);
    await page.setExtraHTTPHeaders({
        'Accept-Language': 'en-US,en;q=0.9'
    });
    browsers.push(browser);

    async function performActions() {
        for (let url of data.urls) {
            await page.goto(url, { waitUntil: 'load', timeout: 60000 });
            const timestamp = getTimestamp();
            const downloadsPath = path.join(os.homedir(), 'Downloads', data.campaign_name, `cookies-${timestamp}.json`);
            const folderPath = path.dirname(downloadsPath);

            // Check if the folder exists, and if not, create it
            if (!fs.existsSync(folderPath)) {
                fs.mkdirSync(folderPath, { recursive: true });
            }

            page.on('error', async (error) => {
                if (error.message.includes('net::ERR_PROXY_CONNECTION_FAILED')) {
                    console.error('Proxy connection failed. Closing browser.');
                    await browser.close();
                    subscribe(data, i, profile)
                }
            });
            const elementExists = await page.$('#main-frame-error') !== null;
            if (elementExists) {
                await browser.close()
                // main-frame-error
                subscribe(data, i, profile)
            }
            let currentURL = page.url();
            if (currentURL.includes('https://www.google.com/sorry')) {
                await browser.close()
                subscribe(data, i, profile)
            }
            try {
                await delay(4000)
                await page.waitForSelector('.yt-spec-button-shape-next.yt-spec-button-shape-next--filled.yt-spec-button-shape-next--mono.yt-spec-button-shape-next--size-m.yt-spec-button-shape-next--disable-text-ellipsis.yt-spec-button-shape-next--enable-backdrop-filter-experiment');
                // await page.click('.yt-spec-button-shape-next.yt-spec-button-shape-next--filled.yt-spec-button-shape-next--mono.yt-spec-button-shape-next--size-m.yt-spec-button-shape-next--disable-text-ellipsis.yt-spec-button-shape-next--enable-backdrop-filter-experiment');
                await page.evaluate(() => {
                    const button = document.querySelector('.yt-spec-button-shape-next.yt-spec-button-shape-next--filled.yt-spec-button-shape-next--mono.yt-spec-button-shape-next--size-m.yt-spec-button-shape-next--disable-text-ellipsis.yt-spec-button-shape-next--enable-backdrop-filter-experiment');
                    if (button) {
                        button.click();
                    }
                });
                await delay(4000)
            }
            catch (e) {
                console.log(e)
            }
        }
        try {
            let index = browsers.indexOf(browser);
            if (index !== -1) {
                // Remove the browser from the array
                browsers.splice(index, 1);
            } else {
                console.log("Browser not found in the array.");
            }
            console.log('1 is called')
            await browser.close()
        }
        catch (e) {
            console.error('Error in closing:', e);
        }
    }
    await performActions().catch(error => {
        if (error.message.includes('net::ERR_PROXY_CONNECTION_FAILED')) {
            console.error('Proxy connection failed. Closing browser.');
            if (browser) {
                browser.close();
            }
            subscribe(data, i, profile);
        } else {
            console.error('An unexpected error occurred:', error);
        }
        console.error('Error in performActions:', error);
    })
}

async function create_google_accounts(data, i, profile) {
    puppeteer.use(StealthPlugin());
    let proxyData = {}
    async function fetchProxyData() {
        try {
            proxyData = await getProxy(data.proxies);
            console.log(proxyData);
            // Use proxyData as needed
        } catch (error) {
            console.error('Error fetching proxy data:', error);
        }
    }
    await fetchProxyData();
    console.log('proxyData')
    console.log(proxyData)
    const { proxyUrl, proxyUsername, proxyPassword, timeZone } = proxyData;
    console.log(timeZone)
    // let exPath = 'C:\\Users\\atulg\\AppData\\Local\\Chromium\\Application\\chrome.exe'
    let exPath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
    let randomAgents = data['user_agents'][Math.floor(Math.random() * data['user_agents'].length)]
    const browser = await puppeteer.launch({
        executablePath: exPath,
        headless: false,
        devtools: false,
        userDataDir: profile,
        args: [
            '--disable-webrtc',
            '--disable-features=WebRTC-HW-Decoding,WebRTC-HW-Video-Coding',
            '--disable-features=WebRTC-HW-Encoding',
            '--disable-features=WebRTC-Screen-Capture-Capabilities',
            '--disable-rtc-smoothness-algorithm',
            '--webrtc-ip-handling-policy=disable_non_proxied_udp',
            '--force-webrtc-ip-handling-policy',
            `--proxy-server=${proxyUrl}`,
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--no-experiments',
            '--disable-infobars',
            '--proxy-bypass-list=<-loopback>',
            `--window-position=${i * 20},${i * 20}`,
            `--window-size=${1500 - (i * 10)},${800 - (i * 5)}`,
            `--timezone=${timeZone}`,
            '--disable-accelerated-2d-canvas',
        ],
        ignoreDefaultArgs: ["--enable-automation"],
        env: {
            TZ: timeZone,
            ...process.env,
            // Set additional hardware and environment settings
            "VISITOR_ID": randomAgents.visitor_id,
            "CANVAS_FINGERPRINT": randomAgents.canvas,
            "WEBGL_FINGERPRINT": randomAgents.WebGL,
            "UNMASKED_RENDERER": randomAgents.unmasked_renderer,
            "AUDIO_FINGERPRINT": randomAgents.audio,
            "CLIENT_RECTS": randomAgents.client_rects,
            "WEBGPU_REPORT": randomAgents.webGPU_report,
            "SCREEN_RESOLUTION": randomAgents.screen_resolution,
            "COLOR_DEPTH": randomAgents.color_depth,
            "TOUCH_SUPPORT": randomAgents.touch_support,
            // "DEVICE_MEMORY": randomAgents.device_memory,
            // "HARDWARE_CONCURRENCY": randomAgents.hardware_concurrency,
        },
    });

    const page = await browser.newPage();


    await page.setViewport({
        width: randomAgents.width,
        height: randomAgents.height,
        isMobile: randomAgents.isMobile,
        deviceScaleFactor: 3, // Adjust based on your requirements
        hasTouch: randomAgents.isMobile,
        isLandscape: false,
    });

    // await page.evaluateOnNewDocument((visitorId, canvasFingerprint, webGLFingerprint, unmaskedRenderer, audioFingerprint, clientRects, webGPURreport, screenResolution, colorDepth, touchSupport, deviceMemory, hardwareConcurrency) => {
    //     // Set properties on the browser context
    //     Object.defineProperty(window.navigator, 'deviceMemory', {
    //         get: () => deviceMemory,
    //     });
    //     Object.defineProperty(window.navigator, 'hardwareConcurrency', {
    //         get: () => hardwareConcurrency,
    //     });
    //     // Further hardware fingerprinting methods can be set up similarly...
    // }, randomAgents.visitor_id, randomAgents.canvas, randomAgents.WebGL, randomAgents.unmasked_renderer, randomAgents.audio, randomAgents.client_rects, randomAgents.webGPU_report, randomAgents.screen_resolution, randomAgents.color_depth, randomAgents.touch_support, randomAgents.device_memory, randomAgents.hardware_concurrency);

    if (proxyUrl.startsWith("socks5")) {
    }
    else {
        await page.authenticate({ username: proxyUsername, password: proxyPassword });
    }
    await page.setUserAgent(randomAgents.userAgents);
    await page.emulateTimezone(timeZone);
    await page.setExtraHTTPHeaders({
        'Accept-Language': 'en-US,en;q=0.9'
    });
    browsers.push(browser);

    async function performActions() {
        await page.goto('https://browserscan.net', { waitUntil: 'load', timeout: 60000 });
        page.on('error', async (error) => {
            if (error.message.includes('net::ERR_PROXY_CONNECTION_FAILED')) {
                console.error('Proxy connection failed. Closing browser.');
                await browser.close();
                create_google_accounts(data, i, profile)
            }
        });
        const elementExists = await page.$('#main-frame-error') !== null;
        if (elementExists) {
            await browser.close()
            // main-frame-error
            create_google_accounts(data, i, profile)
        }
        let currentURL = page.url();
        if (currentURL.includes('https://www.google.com/sorry')) {
            await browser.close()
            create_google_accounts(data, i, profile)
        }
        // try {
        //     await delay(4000)
        //     await page.waitForSelector('.yt-spec-button-shape-next.yt-spec-button-shape-next--filled.yt-spec-button-shape-next--mono.yt-spec-button-shape-next--size-m.yt-spec-button-shape-next--disable-text-ellipsis.yt-spec-button-shape-next--enable-backdrop-filter-experiment');
        //     // await page.click('.yt-spec-button-shape-next.yt-spec-button-shape-next--filled.yt-spec-button-shape-next--mono.yt-spec-button-shape-next--size-m.yt-spec-button-shape-next--disable-text-ellipsis.yt-spec-button-shape-next--enable-backdrop-filter-experiment');
        //     await page.evaluate(() => {
        //         const button = document.querySelector('.yt-spec-button-shape-next.yt-spec-button-shape-next--filled.yt-spec-button-shape-next--mono.yt-spec-button-shape-next--size-m.yt-spec-button-shape-next--disable-text-ellipsis.yt-spec-button-shape-next--enable-backdrop-filter-experiment');
        //         if (button) {
        //             button.click();
        //         }
        //     });
        //     await delay(4000)
        // }
        // catch (e) {
        //     console.log(e)
        // }

        // try {
        //     let index = browsers.indexOf(browser);
        //     if (index !== -1) {
        //         // Remove the browser from the array
        //         browsers.splice(index, 1);
        //     } else {
        //         console.log("Browser not found in the array.");
        //     }
        //     console.log('1 is called')
        //     await browser.close()
        // }
        // catch (e) {
        //     console.error('Error in closing:', e);
        // }
    }
    await performActions().catch(error => {
        if (error.message.includes('net::ERR_PROXY_CONNECTION_FAILED')) {
            console.error('Proxy connection failed. Closing browser.');
            if (browser) {
                browser.close();
            }
            subscribe(data, i, profile);
        } else {
            console.error('An unexpected error occurred:', error);
        }
        console.error('Error in performActions:', error);
    })
}

async function youtube_views(data, i, profile) {
    // let proxyData = {}
    // async function fetchProxyData() {
    //     try {
    //         proxyData = await getProxy(data.proxies);
    //         console.log(proxyData);
    //         // Use proxyData as needed
    //     } catch (error) {
    //         console.error('Error fetching proxy data:', error);
    //     }
    // }
    // await fetchProxyData();
    // console.log('proxyData')
    // console.log(proxyData)
    // const { proxyUrl, proxyUsername, proxyPassword, timeZone } = proxyData;
    // console.log(timeZone)
    let exPath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
    let randomAgents = data['user_agents'][Math.floor(Math.random() * data['user_agents'].length)]
    const browser = await puppeteer.launch({
        executablePath: exPath,
        headless: false,
        devtools: false,
        userDataDir: profile,
        args: [
            '--disable-webrtc',
            '--disable-features=WebRTC-HW-Decoding,WebRTC-HW-Video-Coding',
            '--disable-features=WebRTC-HW-Encoding',
            '--disable-features=WebRTC-Screen-Capture-Capabilities',
            '--disable-rtc-smoothness-algorithm',
            '--webrtc-ip-handling-policy=disable_non_proxied_udp',
            '--force-webrtc-ip-handling-policy',
            '--no-sandbox',
            // `--proxy-server=${proxyUrl}`,
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--no-experiments',
            '--disable-infobars',
            '--proxy-bypass-list=<-loopback>',
            `--window-position=${i * 20},${i * 20}`,
            `--window-size=${1500 - (i * 10)},${800 - (i * 5)}`,
            // `--timezone=${timeZone}`,
            '--disable-accelerated-2d-canvas',
        ],
        ignoreDefaultArgs: ["--enable-automation"],
        env: {
            // TZ: timeZone,
            ...process.env,
            // Set additional hardware and environment settings
            "VISITOR_ID": randomAgents.visitor_id,
            "CANVAS_FINGERPRINT": randomAgents.canvas,
            "WEBGL_FINGERPRINT": randomAgents.WebGL,
            "UNMASKED_RENDERER": randomAgents.unmasked_renderer,
            "AUDIO_FINGERPRINT": randomAgents.audio,
            "CLIENT_RECTS": randomAgents.client_rects,
            "WEBGPU_REPORT": randomAgents.webGPU_report,
            "SCREEN_RESOLUTION": randomAgents.screen_resolution,
            "COLOR_DEPTH": randomAgents.color_depth,
            "TOUCH_SUPPORT": randomAgents.touch_support,
            "DEVICE_MEMORY": randomAgents.device_memory,
            "HARDWARE_CONCURRENCY": randomAgents.hardware_concurrency,
        },
    });

    const page = await browser.newPage();

    await page.setViewport({
        width: randomAgents.width,
        height: randomAgents.height,
        isMobile: randomAgents.isMobile,
        deviceScaleFactor: 3, // Adjust based on your requirements
        hasTouch: randomAgents.isMobile,
        isLandscape: false,
    });

    await page.evaluateOnNewDocument((visitorId, canvasFingerprint, webGLFingerprint, unmaskedRenderer, audioFingerprint, clientRects, webGPURreport, screenResolution, colorDepth, touchSupport, deviceMemory, hardwareConcurrency) => {
        // Set properties on the browser context
        Object.defineProperty(window.navigator, 'deviceMemory', {
            get: () => deviceMemory,
        });
        Object.defineProperty(window.navigator, 'hardwareConcurrency', {
            get: () => hardwareConcurrency,
        });
        // Further hardware fingerprinting methods can be set up similarly...
    }, randomAgents.visitor_id, randomAgents.canvas, randomAgents.WebGL, randomAgents.unmasked_renderer, randomAgents.audio, randomAgents.client_rects, randomAgents.webGPU_report, randomAgents.screen_resolution, randomAgents.color_depth, randomAgents.touch_support, randomAgents.device_memory, randomAgents.hardware_concurrency);


    // if (proxyUrl.startsWith("socks5")) {
    // }
    // else {
    //     await page.authenticate({ username: proxyUsername, password: proxyPassword });
    // }
    await page.setUserAgent(randomAgents.userAgents);
    // await page.emulateTimezone(timeZone);
    await page.setExtraHTTPHeaders({
        'Accept-Language': 'en-US,en;q=0.9'
    });
    browsers.push(browser);

    async function performActions() {
        try {
            for (let x of data['pages']) {
                await page.goto(x['click_selector'], { waitUntil: 'load', timeout: 60000 });
                page.on('error', async (error) => {
                    if (error.message.includes('net::ERR_PROXY_CONNECTION_FAILED')) {
                        console.error('Proxy connection failed. Closing browser.');
                        await browser.close();
                        youtube_views(data, i, profile)
                    }
                });
                const elementExists = await page.$('#main-frame-error') !== null;
                if (elementExists) {
                    await browser.close()
                    // main-frame-error
                    youtube_views(data, i, profile)
                }
                let currentURL = page.url();
                if (currentURL.includes('https://www.google.com/sorry')) {
                    await browser.close()
                    youtube_views(data, i, profile)
                }
                try {
                    await page.waitForSelector('.ytp-large-play-button.ytp-button');
                    // Click the button using evaluate
                    await page.evaluate(() => {
                        // Select the play button element and trigger a click
                        const playButton = document.querySelector('.ytp-large-play-button.ytp-button');
                        if (playButton) {
                            playButton.click();
                        }
                    });
                }
                catch (e) {
                    console.log(e);
                }
                try {
                    await page.waitForSelector('.yt-spec-button-view-model');
                    // Click the button using evaluate
                    await page.evaluate(() => {
                        // Select the play button element and trigger a click
                        const playButton = document.querySelector('.yt-spec-button-view-model');
                        if (playButton) {
                            playButton.click();
                        }
                    });
                }
                catch (e) {
                    console.log(e);
                }
                try {
                    await page.waitForSelector('.yt-spec-button-shape-next.yt-spec-button-shape-next--filled.yt-spec-button-shape-next--mono.yt-spec-button-shape-next--size-m.yt-spec-button-shape-next--disable-text-ellipsis.yt-spec-button-shape-next--enable-backdrop-filter-experiment');
                    // await page.click('.yt-spec-button-shape-next.yt-spec-button-shape-next--filled.yt-spec-button-shape-next--mono.yt-spec-button-shape-next--size-m.yt-spec-button-shape-next--disable-text-ellipsis.yt-spec-button-shape-next--enable-backdrop-filter-experiment');
                    await page.evaluate(() => {
                        const button = document.querySelector('.yt-spec-button-shape-next.yt-spec-button-shape-next--filled.yt-spec-button-shape-next--mono.yt-spec-button-shape-next--size-m.yt-spec-button-shape-next--disable-text-ellipsis.yt-spec-button-shape-next--enable-backdrop-filter-experiment');
                        if (button) {
                            button.click();
                        }
                    });
                }
                catch (e) {
                    console.log(e)
                }

                scroll_duration = Math.floor(Math.random() * (x['scroll_duration_to'] - x['scroll_duration_from'] + 1)) + x['scroll_duration_from'];
                try {
                    await delay(scroll_duration * 1000);
                }
                catch (err) {
                    console.log('Error is ')
                    console.log(err)
                }
            }
        }
        catch (e) {
            console.log(e)
        }
        try {
            let index = browsers.indexOf(browser);
            if (index !== -1) {
                // Remove the browser from the array
                browsers.splice(index, 1);
            } else {
                console.log("Browser not found in the array.");
            }
            console.log('1 is called')
            await browser.close()
        }
        catch (e) {
            console.error('Error in closing:', e);
        }
    }
    await performActions().catch(error => {
        if (error.message.includes('net::ERR_PROXY_CONNECTION_FAILED')) {
            console.error('Proxy connection failed. Closing browser.');
            if (browser) {
                browser.close();
            }
            subscribe(data, i, profile);
        } else {
            console.error('An unexpected error occurred:', error);
        }
        console.error('Error in performActions:', error);
    })
}



async function getTask() {
    const userIP = await getIPAddress();
    const url = `https://traffic.startmarket.in/api/getcampaigns/${userIP}`;
    // const url = `http://127.0.0.1:8000/api/getcampaigns/${userIP}`;
    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        return await response.json();
    } catch (error) {
        console.error('Error fetching tasks:', error);
        return null;
    }
}


async function checkTasks() {
    const data = await getTask();
    if (data && data.status) {
        if (data.data.make_google_logins) {
            let timeouts = []; // Array to store all setTimeout IDs
            for (let i = 0; i < data.data.accounts.length; i++) {
                (function (index) {
                    let timeoutId = setTimeout(function () {
                        if (i <= 15) {
                            make_google_login(data.data, i, data.data.accounts[i]);
                        }
                        else {
                            make_google_login(data.data, (i - (i / 2)), data.data.accounts[i]);
                        }
                    }, index * 1000 * data.data.profile_delay);  // Delay each call by profile_delay seconds
                    timeouts.push(timeoutId); // Store the timeout ID in the array
                })(i);
                console.log('loop over inside')
            }
        }
        else if (data.data.youtube_subscribe) {
            let timeouts = []; // Array to store all setTimeout IDs
            const profilePath = path.join(os.homedir(), 'Downloads', data.data.profileTag, 'Profiles');
            // Get the full paths of all the folders inside profilePath
            const profiles = fs.readdirSync(profilePath).filter((file) => {
                const fullPath = path.join(profilePath, file);
                return fs.statSync(fullPath).isDirectory();
            }).map((folder) => path.join(profilePath, folder));
            // Output the array of folder paths
            console.log(profiles);
            for (let i = 0; i < profiles.length; i++) {
                (function (index) {
                    let timeoutId = setTimeout(function () {
                        if (i <= 15) {
                            subscribe(data.data, i, profiles[i]);
                        }
                        else {
                            subscribe(data.data, (i - (i / 2)), profiles[i]);
                        }
                    }, index * 1000 * data.data.profile_delay);  // Delay each call by profile_delay seconds
                    timeouts.push(timeoutId); // Store the timeout ID in the array
                })(i);
                console.log('loop over inside')
            }
        }
        else if (data.data.create_google_accounts) {
            let timeouts = []; // Array to store all setTimeout IDs
            const profilePath = path.join(os.homedir(), 'Downloads', data.data.profileTag, 'Profiles');
            // Get the full paths of all the folders inside profilePath
            const profiles = fs.readdirSync(profilePath).filter((file) => {
                const fullPath = path.join(profilePath, file);
                return fs.statSync(fullPath).isDirectory();
            }).map((folder) => path.join(profilePath, folder));
            // Output the array of folder paths
            console.log(profiles);
            for (let i = 0; i < profiles.length; i++) {
                (function (index) {
                    let timeoutId = setTimeout(function () {
                        if (i <= 15) {
                            create_google_accounts(data.data, i, profiles[i]);
                        }
                        else {
                            create_google_accounts(data.data, (i - (i / 2)), profiles[i]);
                        }
                    }, index * 1000 * data.data.profile_delay);  // Delay each call by profile_delay seconds
                    timeouts.push(timeoutId); // Store the timeout ID in the array
                })(i);
                console.log('loop over inside')
            }
        }
        else if (data.data.youtube_views) {
            let timeouts = []; // Array to store all setTimeout IDs
            const profilePath = path.join(os.homedir(), 'Downloads', data.data.profileTag, 'Profiles');
            // Get the full paths of all the folders inside profilePath
            const profiles = fs.readdirSync(profilePath).filter((file) => {
                const fullPath = path.join(profilePath, file);
                return fs.statSync(fullPath).isDirectory();
            }).map((folder) => path.join(profilePath, folder));
            // Output the array of folder paths
            console.log(profiles);
            for (let i = 0; i < profiles.length; i++) {
                (function (index) {
                    let timeoutId = setTimeout(function () {
                        if (i <= 15) {
                            youtube_views(data.data, i, profiles[i]);
                        }
                        else {
                            youtube_views(data.data, (i - (i / 2)), profiles[i]);
                        }
                    }, index * 1000 * data.data.profile_delay);  // Delay each call by profile_delay seconds
                    timeouts.push(timeoutId); // Store the timeout ID in the array
                })(i);
                console.log('loop over inside')
            }
        }
        else if (data.data.facebook_campaign) {
            let timeouts = []; // Array to store all setTimeout IDs
            for (let i = 0; i < data.data.count; i++) {
                (function (index) {
                    let timeoutId = setTimeout(function () {
                        if (i <= 15) {
                            facebook(data.data, i);
                        }
                        else {
                            facebook(data.data, (i - (i / 2)));
                        }
                    }, index * 1000 * data.data.profile_delay);  // Delay each call by profile_delay seconds
                    timeouts.push(timeoutId); // Store the timeout ID in the array
                })(i);
                console.log('loop over inside')
            }
        }
        else {
            let timeouts = []; // Array to store all setTimeout IDs
            for (let i = 0; i < data.data.count; i++) {
                (function (index) {
                    let timeoutId = setTimeout(function () {
                        if (i <= 15) {
                            fetchDataAndInteract(data.data, i);
                        }
                        else {
                            fetchDataAndInteract(data.data, (i - (i / 2)));
                        }
                    }, index * 1000 * data.data.profile_delay);  // Delay each call by profile_delay seconds

                    timeouts.push(timeoutId); // Store the timeout ID in the array
                })(i);
            }
        }
        setTimeout(function () {
            try {
                closeAllWindows();
            }
            catch (e) {
                browsers = [];
            }
        }, data.data.campaign_time * 1000);
    }
}


app.on('ready', async () => { // Make the function async
    createWindow();
    setInterval(() => {
        if (browsers.length === 0) checkTasks();
    }, 10000);
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});

// Activate event
app.on('activate', async () => {
    // Create window if it doesn't exist
    if (mainWindow === null) createWindow();
});