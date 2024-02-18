const express = require('express');
const puppeteer = require('puppeteer');
const fs = require('fs-extra');
const path = require('path');
const http = require('http');

const app = express();
const PORT = process.env.PORT || 3000;
const hostname = '0.0.0.0'

// Define the uploadImageAndTakeScreenshot function
async function uploadImageAndTakeScreenshot() {
    const browser = await puppeteer.launch({
        headless: true, // Set to true for headless mode
        // args: ['--window-size=500,1080'],
        timeout: 0, // Disable timeout for the entire Puppeteer operation
        defaultViewport: null, // Set the viewport to null to ensure the full page is visible
        devtools: false, // Disable DevTools
        slowMo: 0 // Disable slow motion
    });
    const page = await browser.newPage();

    // Remove timeout limits
    await page.setDefaultNavigationTimeout(0);
    await page.setDefaultTimeout(0);

    try {
        // Navigate to the website
        await page.goto('https://photo-to-anime.com/en/photo-to-anime');

        // Remove the first element using JavaScript injection
        await page.evaluate(() => {
            const element = document.querySelector('head > link:nth-of-type(6)');
            if (element) element.remove();
        });

        // Remove the second element using JavaScript injection
        await page.evaluate(() => {
            const element = document.querySelector('#adsbygoogle-init');
            if (element) element.remove();
        });

        console.log('Elements removed successfully!');

        // Upload the image
        const filePath = path.join(__dirname, 'frames', 'frame_0.png');
        const fileInput = await page.$('input[type="file"]');
        await fileInput.uploadFile(filePath);

        console.log('File Uploaded Successfully !');

        await page.evaluate(() => {
            return new Promise(resolve => {
                setTimeout(resolve, 1000);
            });
        });
        console.log('Processing >>>>>>>>>>>>>>>>>>>>>')

        // Wait for the span tag text to be "Select a photo"
        await page.waitForFunction(() => {
            return document.querySelector('html > body > div:nth-of-type(2) > div:first-of-type > div > div:first-of-type > span').innerText === 'Select a photo';
        });

        const resultCanvas = await page.$('#resultCanvas');
        // Check if the class of the div matches
        const divClass = await page.$eval('html > body > div:nth-of-type(2) > div:first-of-type > div > div:nth-of-type(2) > div:nth-of-type(3)', element => element.className);
        await new Promise(r => setTimeout(r, 1000));
        if (divClass.includes('m-4') && divClass.includes('flex') && divClass.includes('space-x-2')) {
            // Take a screenshot
            const screenshot = await resultCanvas.screenshot({ encoding: 'base64' });

            // Save the screenshot as an image file
            const imagePath2 = path.join(__dirname, 'images', `cartoon_0.png`);
            await fs.writeFile(imagePath2, screenshot, 'base64');
            console.log(`cartoon_0.png Saved !!!!`);
        } else {
            console.log('The class of the div does not match.');
        }

        // Process remaining files
        const folderPath = path.join(__dirname, 'frames');
        const files = await fs.readdir(folderPath);
        for (let i = 1; i < files.length; i++) {
            const imagePath = path.join(folderPath, `frame_${i}.png`);
            await fileInput.uploadFile(imagePath);
            await page.evaluate(() => {
                return new Promise(resolve => {
                    setTimeout(resolve, 500);
                });
            });

            // Wait for the "Select a photo" text
            await page.waitForFunction(() => {
                return document.querySelector('html > body > div:nth-of-type(2) > div:first-of-type > div > div:first-of-type > span').innerText === 'Select a photo';
            });

            // Take Screenshot
            const screenshot = await resultCanvas.screenshot({ encoding: 'base64' });

            // Save Screenshot
            const imagePath2 = path.join(__dirname, 'images', `cartoon_${i}.png`);
            await fs.writeFile(imagePath2, screenshot, 'base64');
            console.log(`cartoon_${i}.png Saved !!!!`)
        }
    } catch (error) {
        console.error('An error occurred:', error);
    } finally {
        await browser.close();
    }
}

// Define the route handler for "/generate"
app.get('/generate', async (req, res) => {
    // Call the function to upload the image and take a screenshot
    await uploadImageAndTakeScreenshot();
    res.send('Generation completed');
});

// Start the server
app.listen(PORT, hostname, () => {
    console.log(`Server is running on http://${hostname}:${PORT}`);
});
