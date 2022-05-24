const fs = require("fs");
const https = require("https");
const puppeteer = require("puppeteer");
const {AbstractDownloader} = require("./AbstractDownloader");
const {fileSize} = require("../Utility");
const {getMbFromBytes} = require("../Converter");

module.exports = class RedditDownloader extends AbstractDownloader {
    download(url, message, args) {
        this.once("download_link", (msg) => {
            this.once("dest", (destination) => {
                const slot = this.getDownloadSlot(destination, 0, msg);
                this.emit("processing", {
                    video_slot: slot,
                    reply: msg
                });
            });
            this.downloadVideo(url).then(r => {
                const size = getMbFromBytes(fileSize(r));
                if (size > 8) return this.emit("fileTooBig", {
                    size: size,
                    reply: msg
                });

                this.emit("finished", {
                    destination: r,
                    reply: msg
                });
            }).catch((error) => {
                this.emit("e", {
                    error: error,
                    reply: msg
                });
            });
        });
        return super.download(url, message);
    }

    downloadVideo(url) {
        return new Promise(async (resolve, reject) => {
            const browser = await puppeteer.launch();
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
            this.emit('dest', destination);

            await downloadUrl(hrefs[0], destination);

            await browser.close();

            resolve(destination);
        });
    }
}

function downloadUrl(url, dest) {
    return new Promise((resolve, reject) => {
        const file = fs.createWriteStream(dest);
        https.get(url, (response) => {
            response.pipe(file);
            file.on('finish', function () {
                file.close();
                resolve();
            });
        }).on('error', function (err) {
            fs.unlinkSync(dest);
            reject(err.message);
        });
    });
}

