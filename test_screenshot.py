from playwright.sync_api import sync_playwright

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        page.set_viewport_size({"width": 1200, "height": 1000})
        page.goto('http://localhost:3000/equity-risk-premium.html')
        page.wait_for_timeout(2000)
        page.screenshot(path='/tmp/screenshot.png', full_page=True)
        browser.close()

if __name__ == '__main__':
    run()
