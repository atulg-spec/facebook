const { app, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));
const axios = require('axios');
const os = require('os');

// Function to generate a timestamp string
function getTimestamp() {
    const now = new Date();
    return now.toISOString().replace(/[:.]/g, '-'); // Replace colon and dot with dash for a valid filename
}


puppeteer.use(StealthPlugin());

let mainWindow;
let browsers = [];

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1536,
        height: 864,
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

function extractProxyDetails(inputString) {
    const [proxyUsername, proxyPassword, proxyUrl] = inputString.match(/([^:]+):([^@]+)@(.+)/).slice(1);
    return { proxyUrl: `http://${proxyUrl}`, proxyUsername, proxyPassword };
}

function getProxy(proxies) {
    const proxy = proxies[Math.floor(Math.random() * proxies.length)];
    if (proxy.startsWith("socks5")) {
        return { proxyUrl: proxy, proxyUsername: 'proxyUsername', proxyPassword: 'proxyPassword' };
        // return proxy;
    }
    else {
        return extractProxyDetails(proxy);
    }
}

function closeAllWindows() {
    browsers.forEach(browser => browser.close().catch(err => console.log('Error closing browser:', err)));
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
        await page.waitForNavigation({ waitUntil: 'networkidle0' }); // Wait for network connections to settle


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

async function click(page, data) {
    await page.evaluate(async (data) => {
        await new Promise((resolve) => {
            let urllist = data.mainurls;
            console.log('urllist')
            console.log(urllist)
            let links = Array.from(document.querySelectorAll('a[href]'));
            console.log('links')
            console.log(links)
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
                links = links.filter(link => urllist.includes(link.href));
                if (links.length > 0) {
                    let random = Math.floor(Math.random() * links.length);
                    console.log(links[random])
                    links[random].click();
                }
                else {
                    window.location.href = urllist[Math.floor(Math.random() * urllist.length)];
                }
            } else {
                window.location.href = urllist[Math.floor(Math.random() * urllist.length)];
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

async function saveBrowserCookiesToFile(browser, filePath) {
    try {
        const pages = await browser.pages();
        let allCookies = [];

        for (const page of pages) {
            const cookies = await page.cookies();
            allCookies = allCookies.concat(cookies);
        }

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
async function fetchDataAndInteract(data,proxy_data) {
    let proxyData = proxy_data;
    if (proxyData) {
        console.log('proxy data is here')
    }
    else {
        proxyData = getProxy(data.proxies);
    }
    const { proxyUrl, proxyUsername, proxyPassword } = proxyData;
    let exPath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
    const pathToExtension = path.resolve(data['extension_path']);
    const browser = await puppeteer.launch({
        executablePath: exPath,
        headless: false,
        devtools: false,
        args: [
            '--no-sandbox',
            `--proxy-server=${proxyUrl}`,
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            `--disable-extensions-except=${pathToExtension}`,
            `--load-extension=${pathToExtension}`,
            '--no-experiments',
            '--disable-infobars',
            '--proxy-bypass-list=<-loopback>',
            '--window-position=0,0',
            // '--disable-accelerated-2d-canvas',
        ],
        env: {
            TZ: data['time_zone'][0],
            ...process.env
        },
    });

    const page = await browser.newPage();
    let randomAgents = data['user_agents'][Math.floor(Math.random() * data['user_agents'].length)]
    await page.setViewport({
        width: randomAgents['width'],
        height: randomAgents['height'],
        isMobile: randomAgents['isMobile'],
        deviceScaleFactor: 3,
        hasTouch: randomAgents['isMobile'],
        isLandscape: false
    });
    if (data['cookies'].length > 0) {
        let randomCookies = data['cookies'][Math.floor(Math.random() * data['cookies'].length)]
        try {
            for (let i = 0; i < randomCookies.length; i++) {
                await page.setCookie(randomCookies[i]);
            }
        }
        catch (err) {
            console.log('Error with cookies')
        }
    }
    if (proxyUrl.startsWith("socks5")) {
    }
    else {
        await page.authenticate({ username: proxyUsername, password: proxyPassword });
    }
    console.log('randomAgents')
    console.log(randomAgents)
    await page.setUserAgent(randomAgents['userAgents']);
    await page.emulateTimezone(data['time_zone'][0]);
    await page.setExtraHTTPHeaders({
        'Accept-Language': 'en-US,en;q=0.9'
    });

    await page.goto('https://api.ipify.org?format=json');
    const ipResponse = await page.evaluate(() => {
        return JSON.parse(document.body.innerText).ip;
    });
    console.log(`IP Address: ${ipResponse}`);
    const geoResponse = await axios.get(`https://ipapi.co/${ipResponse}/json/`);
    const timezone = geoResponse.data.timezone;
    if (timezone != data['time_zone'][0]) {
        data['time_zone'][0] = geoResponse.data.timezone;
        await browser.close()
        fetchDataAndInteract(data,proxyData)
    }
    browsers.push(browser);
    console.log(`The timezone for IP ${ipResponse} is: ${timezone}`);
    const urllist = data.urls;
    async function performActions() {
        await page.goto(urllist[Math.floor(Math.random() * urllist.length)], { waitUntil: 'domcontentloaded' });
        const timestamp = getTimestamp();
        const downloadsPath = path.join(os.homedir(), 'Downloads', `cookies-${timestamp}.json`);

        let currentURL = page.url();
        if (currentURL.includes('https://www.google.com/sorry')) {
            await browser.close()
            fetchDataAndInteract(data)
        }

        try {
            const success = await saveBrowserCookiesToFile(browser, downloadsPath);
            if (success) {
                console.log('Cookies have been saved to:', downloadsPath);
            }

            let intervalId = setInterval(async () => {
                try {
                    await selectAndUnselectText(page);
                } catch (error) {
                    console.error('Error selecting/unselecting text:', error);
                }
            }, 4000);
        }
        catch (e) {

        }
        for (let i = 0; i <= data['visit_count_to']; i++) {
            try {
                await autoScroll(page, 50, data['scroll_duration'] * 1000);
                await autoScrollReverse(page, 50);
                await click(page, data);
            }
            catch (err) {
                console.log('Error is ')
                console.log(err)
            }
        }
    }
    performActions();
    setTimeout(closeAllWindows, (data.visit_count_to * data.scroll_duration * 1000) + (data.visit_count_to * 10000));
}


async function facebook(data, proxy_data = null) {
    try {
        let proxyData = proxy_data;
        if (proxyData) {
            console.log('proxy data is here')
        }
        else {
            proxyData = getProxy(data.proxies);
        }
        const { proxyUrl, proxyUsername, proxyPassword } = proxyData;
        const pathToExtension = path.resolve(data['extension_path']);
        let exPath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
        const browser = await puppeteer.launch({
            executablePath: exPath,
            headless: false,
            devtools: false,
            args: [
                '--no-sandbox',
                `--proxy-server=${proxyUrl}`,
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                `--disable-extensions-except=${pathToExtension}`,
                `--load-extension=${pathToExtension}`,
                '--no-experiments',
                '--disable-infobars',
                '--proxy-bypass-list=<-loopback>',
                '--window-position=0,0',
                '--disable-accelerated-2d-canvas',
            ],
            env: {
                TZ: data['time_zone'][0],
                ...process.env
            },
        });
        const page = await browser.newPage();
        browsers.push(browser);
        let randomAgents = data['user_agents'][Math.floor(Math.random() * data['user_agents'].length)]
        await page.setViewport({
            width: randomAgents['width'],
            height: randomAgents['height'],
            isMobile: randomAgents['isMobile'],
            deviceScaleFactor: 3,
            hasTouch: randomAgents['isMobile'],
            isLandscape: false
        });
        // if (data['cookies'].length > 0) {
        //     let randomCookies = data['cookies'][Math.floor(Math.random() * data['cookies'].length)]
        //     try {
        //         for (let i = 0; i < randomCookies.length; i++) {
        //             await page.setCookie(randomCookies[i]);
        //         }
        //     }
        //     catch (err) {
        //         console.log('Error with cookies')
        //     }
        // }
        if (proxyUrl.startsWith("socks5")) {
        }
        else {
            await page.authenticate({ username: proxyUsername, password: proxyPassword });
        }

        console.log('randomAgents')
        console.log(randomAgents)
        // await page.setUserAgent(randomAgents);
        // await page.emulateTimezone(data['time_zone'][0]);
        await page.setExtraHTTPHeaders({
            'Accept-Language': 'en-US,en;q=0.9'
        });
        await page.goto('https://api.ipify.org?format=json');
        const ipResponse = await page.evaluate(() => {
            return JSON.parse(document.body.innerText).ip;
        });
        console.log(`IP Address: ${ipResponse}`);
        const geoResponse = await axios.get(`https://ipapi.co/${ipResponse}/json/`);
        const timezone = geoResponse.data.timezone;
        if (timezone != data['time_zone'][0]) {
            data['time_zone'][0] = geoResponse.data.timezone;
            facebook(data, proxyData)
            await browser.close()
            // closeAllWindows()
        }
        console.log(`The timezone for IP ${ipResponse} is: ${timezone}`);
        const urllist = data.urls;
        async function performActions(url) {
            await page.goto(url, { waitUntil: 'domcontentloaded' });
            const timestamp = getTimestamp();
            const downloadsPath = path.join(os.homedir(), 'Downloads', `${data['campaign_name']}/cookies-${timestamp}.json`);

            try {
                const success = await saveBrowserCookiesToFile(browser, downloadsPath);
                if (success) {
                    console.log('Cookies have been saved to:', downloadsPath);
                }
            }
            catch (e) {

            }

            // FACEBOOK SECTION
            await page.waitForSelector('div[aria-label="Close"]');
            await page.click('div[aria-label="Close"]');
            await delay(5)
            // await autoScroll(page, 1, 1);
            await page.waitForSelector('div.xdj266r.x11i5rnm.xat24cr.x1mh8g0r.x1vvkbs.x126k92a');
            await page.evaluate(() => {
                const container = document.querySelector('div.xdj266r.x11i5rnm.xat24cr.x1mh8g0r.x1vvkbs.x126k92a');
                const links = container.querySelectorAll('a');
                if (links.length > 0) {
                    const randomLink = links[Math.floor(Math.random() * links.length)];
                    window.location.href = randomLink
                    // randomLink.click();
                } else {
                    console.log('No links found inside the specified div.');
                }
            });
            // END FACEBOOK SECTION

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

            for (let i = 0; i < data['visit_count_to']; i++) {
                // await autoScroll(page, 50, 4000);
                // await page.evaluate((data) => {
                //     let links = Array.from(document.querySelectorAll('a[href]'));
                //     if (links.length > 0) {
                //         const randomIndex = Math.floor(Math.random() * links.length);
                //         links[randomIndex].click();
                //     } else {
                //         window.location.href = url;
                //     }
                // }, data);
                try {
                    if(data['only_last_page_scroll_for_facebook']) {
                        if(i == data['visit_count_to']-1) {
                            await autoScroll(page, 50, data['scroll_duration'] * 1000);
                            await autoScrollReverse(page, 50);
                        }
                        else {
                            await autoScroll(page, 50, 5 * 1000);
                            // await autoScrollReverse(page, 50);                            
                        }
                    }
                    else {
                        await autoScroll(page, 50, data['scroll_duration'] * 1000);
                        await autoScrollReverse(page, 50);
                    }
                    await page.evaluate(async (data) => {
                        await new Promise((resolve) => {
                            let links = Array.from(document.querySelectorAll('a[href]'));
                            if (links.length > 0) {
                                    console.log('link is there')
                                    let random = Math.floor(Math.random() * links.length);
                                    console.log(links[random])
                                    links[random].click();
                            }
                        });
                    }, data);  // pass data to the function
                }
                catch (err) {
                }
            }
            browsers.reduce(browser);
            await browser.close()


            // for(let i=0;i<= data['visit_count_to'];i++) {
            //     try {
            //         await autoScroll(page, 50,data['scroll_duration']*1000);
            //         await autoScrollReverse(page, 50); 
            //         await click(page, data);
            //     }
            //     catch(err) {
            //         console.log('Error is ')
            //         console.log(err)
            //     }
            // }
        }
        console.log(data.count)
        await performActions(urllist[Math.floor(Math.random() * urllist.length)]);
        setTimeout(closeAllWindows, ((data.visit_count_to * data.scroll_duration) + (data.profile_delay * data.count) * 1000));
    } catch (error) {
        console.error('Puppeteer Error:', error);
    }
}



async function getTask() {
    const userIP = await getIPAddress();
    // const url = `https://bot.startmarket.in/api/getcampaigns/${userIP}`;
    const url = `https://bot.startmarket.in/api/getcampaigns/${userIP}`;
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
        if (data.data.facebook_campaign) {
            for (let i = 0; i < data.data.count; i++) {
                (function (index) {
                    setTimeout(function () {
                        facebook(data.data);
                    }, index * 1000 * data.data.profile_delay);  // Delay each call by 5 seconds
                })(i);
            }
        }
        else {
            for (let i = 0; i < data.data.count; i++) {
                (function (index) {
                    setTimeout(function () {
                        fetchDataAndInteract(data.data);
                    }, index * 1000 * data.data.profile_delay);  // Delay each call by 5 seconds
                })(i);
            }
        }
    }
}

app.on('ready', () => {
    createWindow();
    setInterval(() => {
        if (browsers.length === 0) checkTasks();
    }, 10000);
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
    if (mainWindow === null) createWindow();
});
