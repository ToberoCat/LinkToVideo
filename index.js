const { Client, MessageAttachment } = require('discord.js');
const fs = require('fs');
const ytdl = require('ytdl-core');
const EventEmitter = require('events');
const child_process = require("child_process");

//Status
const StatusHandler = require("./handler/StatusHandler");
const StatusManager = new StatusHandler.StatusManager();

const client = new Client({ intents: 32767 });

const generalFreeSavingDocks = 5;

let queue = [];
let freeSlots = generalFreeSavingDocks;

const token = process.env.LINK_TO_VIDEO_TOKEN;
const {Status} = require("./handler/StatusHandler");

client.once("ready", () => {
    StatusManager.Ready(client, 5000);
    console.log(client.user.username + " is now online");
});

async function sendVideo(msg, message, slot) {
    await msg.edit({ content: message.member.user.toString() + " sent this video: ",  files: [ "./" + slot ]});
    await message.member.send(slot + " finished converting your video. Check it out: " + msg.url);
    await message.delete();
    fs.unlinkSync(slot);
}

function getProgressBar(current, max) {
    const n = 15;
    const progress = Math.round((current / max) * n);
    return "█".repeat(progress) + "░".repeat(n-progress);
}

function getMb(size) {
    return Math.round((size / 1000000.0) * 100) / 100;
}

function getSize(path) {
    const stats = fs.statSync(path);
    return stats["size"];
}

function finish(msg, message, mp4, deleteExtra, status) {
    sendVideo(msg, message, mp4)

    if (deleteExtra) {
        deleteExtra.delete();
    }

    StatusManager.Remove(status);

    freeSlots++;

    if (queue.length > 0) {
        const queued = queue.shift();
        convert(queued.url, queued.message, queued.queueMsg);
    }
}

async function convert(url, message, deleteExtra) {
    const msg = await message.channel.send("Processing...");
    if (freeSlots <= 0) {
        const queueMsg = await message.reply("Cannot convert another video. Please wait. All slots are already being in use. Video got queued: " + (queue.length+1))
        queue.push({
            url: url,
            message: message,
            queueMsg: queueMsg
        });
        return;
    }

    const info = await ytdl.getInfo(url);
    const fileSize = info.formats[0].contentLength;
    const fileSizeMb = getMb(fileSize);
    const videoTitle = info.videoDetails.title.replace(/[^\w\s]/gi, '');
    if (fs.existsSync(videoTitle + ".mp4")) {
        return msg.edit({ content: videoTitle + " is already being processed. Please wait until video finished" });
    }

    if (fileSizeMb > 8) {
        msg.edit({ content: "Video is too big. Skipping download" });
        message.member.send(videoTitle + " is too big");
        return;
    }

    const status = new Status(videoTitle, "WATCHING");
    StatusManager.Add(status);

    const slot = freeSlots;
    freeSlots--;

    const video = ytdl(url, { highWaterMark: 10000, format: 140 });

    msg.edit("Please wait while converting in slot " + slot + "...");


    video.pipe(fs.createWriteStream(videoTitle + ".mp4"));

    let lastProgress = "";
    video.on("progress", (n, m, l) => {
        const newProgress = getProgressBar(m, fileSize);
        if (newProgress !== lastProgress) {
            msg.edit({content: "Download progress: " + newProgress + " | " + getMb(m) + "mB / " + fileSizeMb + "mB" });
            lastProgress = newProgress;
        }
    });

    video.on('end', () => {
        finish(msg, message, videoTitle + ".mp4", deleteExtra, status);
    });
}

client.on("messageCreate", async (message) => {
    const messageParts = message.content.split(" ");

    for (let messagePart of messageParts) {
        if (messagePart.startsWith("https://youtu.be/") || messagePart.startsWith("http://youtu.be/")) {
            const videoId = messagePart.replace("https://youtu.be/", "").replace("http://youtu.be/", "");
            convert("https://www.youtube.com/watch?v=" + videoId, message);
            return;  
        }
        if ((messagePart.startsWith("https://") || messagePart.startsWith("http://")) && messagePart.includes("youtu")) {
            convert(messagePart, message);
            return;  
        }
    }
});


client.login(token);