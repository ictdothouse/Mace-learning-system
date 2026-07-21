const puppeteer = require('puppeteer');

(async () => {
    console.log("Launching browser...");
    const browser = await puppeteer.launch({ 
        headless: 'new',
        executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe' 
    });
    const page = await browser.newPage();
    
    // Set viewport
    await page.setViewport({ width: 1440, height: 900 });

    try {
        console.log("Navigating to https://modulatletmsn.com ...");
        await page.goto('https://modulatletmsn.com', { waitUntil: 'networkidle0' });

        // Wait a bit to ensure animations are done
        await new Promise(r => setTimeout(r, 2000));
        
        // Take screenshot of login page
        console.log("Taking screenshot of login page...");
        await page.screenshot({ path: 'login_real.png' });

        // Let's attempt to find the IC input field and type it
        // The input could be name="icNumber" or something similar
        // We'll try to find input fields
        console.log("Filling login form...");
        const inputs = await page.$$('input');
        
        // Strategy: First input is likely Name or IC. Second is IC or Password.
        // Or we use placeholder text if we can find it
        
        await page.evaluate(() => {
            const allInputs = document.querySelectorAll('input');
            for (let input of allInputs) {
                // If the placeholder or name implies IC
                if (input.placeholder.toLowerCase().includes('ic') || input.placeholder.toLowerCase().includes('pengenalan') || input.name.toLowerCase().includes('ic')) {
                    input.value = '870424025105';
                    input.dispatchEvent(new Event('input', { bubbles: true }));
                    input.dispatchEvent(new Event('change', { bubbles: true }));
                }
                // If it implies Name
                if (input.placeholder.toLowerCase().includes('nama') || input.name.toLowerCase().includes('name')) {
                    input.value = 'FAIZ';
                    input.dispatchEvent(new Event('input', { bubbles: true }));
                    input.dispatchEvent(new Event('change', { bubbles: true }));
                }
            }
        });
        
        // Type into the fields directly to trigger React state (evaluate might not trigger React onChange properly sometimes, so let's use type just in case we can find them)
        // If there's only 2 inputs, maybe type in them sequentially
        if (inputs.length >= 2) {
            await inputs[0].click({clickCount: 3});
            await inputs[0].type('870424025105'); // Assuming first is IC, wait let's just type the IC in all of them if we aren't sure, or rely on evaluate
        }

        console.log("Taking screenshot of filled login page...");
        await page.screenshot({ path: 'login_filled_real.png' });

        // Find and click login button
        console.log("Clicking login button...");
        await page.evaluate(() => {
            const buttons = document.querySelectorAll('button');
            for (let btn of buttons) {
                if (btn.innerText.toLowerCase().includes('log masuk') || btn.innerText.toLowerCase().includes('login') || btn.innerText.toLowerCase().includes('masuk')) {
                    btn.click();
                    break;
                }
            }
        });

        // Wait for navigation / dashboard load
        console.log("Waiting for dashboard to load...");
        await new Promise(r => setTimeout(r, 5000));

        console.log("Taking screenshot of dashboard...");
        await page.screenshot({ path: 'dashboard_real.png' });

    } catch (e) {
        console.error("Error during puppeteer script:", e);
    } finally {
        console.log("Closing browser...");
        await browser.close();
    }
})();
