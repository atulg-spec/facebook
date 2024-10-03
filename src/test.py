import asyncio
from undetected_playwright.async_api import async_playwright, Playwright

# Function to scrape data
async def scrape_data(playwright: Playwright):
    args = ["--disable-blink-features=AutomationControlled"]
    browser = await playwright.chromium.launch(headless=False, args=args)
    page = await browser.new_page()
    await page.goto("https://www.f5.com/company/blog/nginx")

    headline_counter = 0

    # Function to extract data from the current page
    async def get_page_content():
        nonlocal headline_counter
        results = await page.query_selector_all("li.result")
        for result in results:
            # Extracting headlines
            headline = await result.query_selector(".result__headline a")
            headline_text = await headline.inner_text() if headline else "N/A"
            headline_counter += 1
            print(f"{headline_counter}. {headline_text}")

    await get_page_content()

    # Function to handle pagination
    async def paginate():
        while True:
            await page.wait_for_selector(".pagination-container")
            # Selecting the 'next' button
            next_button = await page.query_selector('button[value="next"]')
            # Checking if the 'next' button is disabled
            if not next_button or "disabled" in await next_button.get_attribute("class"):
                break
            await next_button.click() # Clicking the 'next' button
            await page.wait_for_load_state("networkidle") # waiting for the page to load
            await get_page_content()

    await paginate()
    # Closing the browser
    await browser.close()

# Main function to run the scraper
async def main():
    async with async_playwright() as playwright:
        await scrape_data(playwright)

# Entry point of the script
if __name__ == "__main__":
    loop = asyncio.ProactorEventLoop()
    loop.run_until_complete(main())