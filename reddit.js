const puppeteer = require('puppeteer');
const https = require('https');
const fs = require('fs');

function downloadUrl(url, dest) {
    return new Promise((resolve, reject) => {
        const file = fs.createWriteStream(dest);
        https.get(url, (response) => {
            response.pipe(file);
            file.on('finish', () => {
                file.close();
                resolve();
            });
        }).on('error', function (err) {
            fs.unlinkSync(dest);
            reject(err.message);
        });
    });
}

function downloadVideo(url) {
    return new Promise(async (resolve, reject) => {
        const browser = await puppeteer.launch({
            headless: false
        });
        const page = await browser.newPage();

        const parts = url.split('\.');
        const reddit = parts.findIndex(x => x === "reddit");

        if (reddit === -1) {
            await browser.close();
            return reject("URL is not valid");
        }
        parts[reddit] = "redditsave";

        await page.goto(parts.join('.'));

        const elementHandles = await page.$$('a.downloadbutton');
        const propertyJsHandles = await Promise.all(elementHandles.map(handle => handle.getProperty('href')));
        const hrefs = await Promise.all(propertyJsHandles.map(handle => handle.jsonValue()));

        const label = (await page.evaluate((element) => element.innerText,
            (await page.$$("h2"))[0])).replace(/[^\w\s]/gi, '');


        const destination = `${label}.mp4`;
        await downloadUrl(hrefs[0], destination);

        await browser.close();

        resolve(destination);
    });
}

downloadVideo("https://www.reddit.com/r/blender/comments/uwlumc/blender_render/?utm_source=share&utm_medium=web2x&context=3")
    .then(r => {
        console.log(r);
    })
    .catch((error) => {
        console.log(error);
    });