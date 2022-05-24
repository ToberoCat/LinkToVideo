const {EventEmitter} = require("events");
const fs = require("fs");

const DOWNLOAD_QUEUE = [];
let FREE_SLOTS = 5;

class AbstractDownloader extends EventEmitter {
    download(url, message, args) {
        this.once("::", async () => {
            const msg = await message.channel.send("Processing...");

            if (!isSlotFree())
                return addDownloadTask(() => {
                    this.download(url, message, args);
                });

            this.emit("download_link", msg);
        });
        this.emit("::");
        return this;
    }

    getDownloadSlot(destination, maxProgress, msg) {
        if (fs.existsSync(destination)) {
            this.emit("videoAlreadyDownloading", {
                destination: destination,
                reply: msg
            });

            return undefined;
        }


        if (maxProgress > 8) {
            this.emit("fileTooBig", {
                size: maxProgress,
                reply: msg
            });
            return undefined;
        }


        return occupySlot();
    }
}

function isSlotFree() {
    return FREE_SLOTS > 0;
}

function occupySlot() {
    return FREE_SLOTS--;
}

function addDownloadTask(task) {
    DOWNLOAD_QUEUE.push(task);
}

function freeSlot() {
    FREE_SLOTS++;
}


function getType(message) {
    message = message.replace("http://", "https://");

    if (message.startsWith("https://youtu.be/"))
        message = message.replace("https://youtu.be/", "https://www.youtube.com/watch?v=");

    if (message.startsWith("https://reddit.com/"))
        message = message.replace("https://reddit.com/", "https://www.reddit.com/");


    if (message.startsWith("https://www.youtube.com"))
        return {
            "type": "youtube",
            "url": message
        };

    if (message.startsWith("https://www.reddit.com")) {
        return {
            "type": "reddit",
            "url": message
        };
    }

    return {
        "type": null,
        "url": message
    }
}

module.exports.getType = getType;
module.exports.AbstractDownloader = AbstractDownloader;
module.exports.freeSlot = freeSlot;
module.exports.addDownloadTask = addDownloadTask;
module.exports.isSlotFree = isSlotFree;
module.exports.occupySlot = occupySlot;