const { app, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');
const AdmZip = require('adm-zip');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));
const axios = require('axios');
const os = require('os');
puppeteer.use(StealthPlugin());

let downloadDir = path.join(os.homedir(), 'Downloads');
let extensionPath = path.join(downloadDir, 'WebRTC-Leak-Prevent');
let downloadUrl = 'https://bot.startmarket.in/api/download-zip/';

async function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

let proxies = {
    "36420396-zone-custom-region-CA-sessid-q9tf153m-sessTime-50:rashidghjff@165.154.172.141:3660": "America/Toronto"
}



function extractProxyDetails(inputString, timeZone) {
    const [proxyUsername, proxyPassword, proxyUrl] = inputString.match(/([^:]+):([^@]+)@(.+)/).slice(1);
    return { proxyUrl: `http://${proxyUrl}`, proxyUsername, proxyPassword, timeZone };
}

async function getTimezone(proxy) {
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
            console.error('Error in getProxy:', error);
            return null;
        }
    }
}
async function initializeCDP(page) {
    const client = await page.target().createCDPSession();

}

async function fetchDataAndInteract() {
    let proxyData = {};

    async function fetchProxyData() {
        try {
            proxyData = await getProxy(proxies);
            console.log(proxyData);
        } catch (error) {
            console.error('Error fetching proxy data:', error);
        }
    }

    const profileDir = 'C:\\Users\\atulg\\AppData\\Local\\Google\\Chrome\\User Data\\Profile 3';

    await fetchProxyData();
    const { proxyUrl, proxyUsername, proxyPassword, timeZone } = proxyData;

    let exPath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
    // let exPath = 'C:\\Users\\atulg\\AppData\\Local\\Chromium\\Application\\chrome.exe';

    const browser = await puppeteer.launch({
        executablePath: exPath,
        headless: false,
        userDataDir: 'C:\\Users\\atulg\\AppData\\Local\\Google\\Chrome\\User Data\\',
        args: [
            // '--no-first-run',
            // '--no-default-browser-check',
            // '--disable-software-rasterizer',      
            // '--remote-debugging-port=9222',
            // '--disable-webrtc',
            // '--disable-features=WebRTC-HW-Decoding,WebRTC-HW-Video-Coding',
            // '--disable-features=WebRTC-HW-Encoding',
            // '--disable-features=WebRTC-Screen-Capture-Capabilities',
            // '--disable-rtc-smoothness-algorithm',
            // '--webrtc-ip-handling-policy=disable_non_proxied_udp',
            // '--force-webrtc-ip-handling-policy',
            // '--disable-gpu',
            // '--no-sandbox',
            // '--disable-webgl',
            // '--hide-scrollbars',
            // '--disable-blink-features=AutomationControlled', 
            // '--disable-web-security',
            // // `--proxy-server=${proxyUrl}`,
            // '--disable-setuid-sandbox',
            // '--disable-dev-shm-usage',
            // '--no-experiments',
            // '--disable-infobars',
            // '--proxy-bypass-list=<-loopback>',
            // `--window-position=${20},${20}`,
            // `--window-size=${1280},${800}`,
            // // `--timezone=${timeZone}`,
            // '--disable-accelerated-2d-canvas',

            // '--disable-blink-features=AutomationControlled', // Prevents blink features related to automation
            // '--disable-web-security', // Disables web security (optional, for bypassing CORS issues)
            // '--disable-site-isolation-trials', // Prevents site isolation (which can reveal automation)
            // '--disable-features=IsolateOrigins', // Disables some of Chrome’s security features
            // '--disable-features=BlockInsecurePrivateNetworkRequests',
            // '--no-first-run',
            // '--no-zygote',
            // '--single-process',
            // '--disable-background-timer-throttling', 
            // '--disable-renderer-backgrounding',    
        ],
        // ignoreDefaultArgs: ["--enable-automation"],
        // env: {
        //     TZ: timeZone,
        //     ...process.env
        // },
    });

    // const cdp = await browser.target().createCDPSession();
    // await cdp.send("Target.createBrowserContext");
    
    const page = await browser.newPage();
    // await page.setViewport({ width: 1280, height: 800 });
    


    // if (proxyUrl.startsWith("socks5")) {
    //     // Handle socks5 proxy authentication if needed
    // } else {
    //     await page.authenticate({ username: proxyUsername, password: proxyPassword });
    // }




    // await page.emulateTimezone(timeZone);
    // await page.setExtraHTTPHeaders({
    //     'Accept-Language': 'en-US,en;q=0.9'
    // });

    const urllist = ['https://www.browserscan.net/bot-detection'];
    let tempurl = urllist[Math.floor(Math.random() * urllist.length)];
    await page.goto(tempurl, { waitUntil: 'domcontentloaded' });

    // Perform your interactions with the page here
}

fetchDataAndInteract();
