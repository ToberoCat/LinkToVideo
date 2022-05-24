const ytdl = require("ytdl-core");
const fs = require("fs");

const {AbstractDownloader, isSlotFree, freeSlot, occupySlot, addDownloadTask} = require("./AbstractDownloader");
const {getMbFromBytes} = require("../Converter");

module.exports = class YoutubeDownloader extends AbstractDownloader {
    download(url, message, args) {
        this.once("download_link", async (msg) => {
            const info = await ytdl.getInfo(url);

            const maxProgress = getMbFromBytes(info.formats[0].contentLength);
            let destination = info.videoDetails.title.replace(/[^\w\s]/gi, '');

            const slot = this.getDownloadSlot(destination, maxProgress, msg);
            if (!slot) return;

            // Start downloading
            const mapped = mapArgs(args);
            const video = ytdl(url, mapped.options);
            destination += "." + mapped.ending;

            this.emit("processing", {
                video_slot: slot,
                reply: msg
            });

            video.pipe(fs.createWriteStream(destination));

            video.on("progress", (n, m, l) => {
                m = Math.min(getMbFromBytes(m), maxProgress);
                this.emit("progress", {
                    max: maxProgress,
                    current: m,
                    reply: msg
                });
            });

            video.on('end', () => {
                freeSlot();
                this.emit("finished", {
                    destination: destination,
                    reply: msg
                });
            });
        });

        return super.download(url, message);
    }
}

function mapArgs(args) {
    let res = "lowest";
    let audio = "";
    let filter = "";
    let ending = "mp4";

    args.forEach((arg) => {
        if (arg === "--no-audio") filter = "videoonly";
        if (arg === "--only-audio") {
            filter = "audioonly";
            ending = "mp3";
        }

        if (arg === "--audio") audio = "audio";
        if (arg === "--video") audio = "video";

        if (arg === "--highest") res = "highest";
        if (arg === "--lowest") res = "lowest";
    });

    return {
        options: {
            highWaterMark: 10000,
            quality: res + audio,
            filter: filter
        },
        ending: ending
    };
}