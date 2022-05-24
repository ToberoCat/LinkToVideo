//Bot
const {Client, MessageAttachment} = require('discord.js');
const client = new Client({intents: 513});
const TOKEN = process.env.LINK_TO_VIDEO_TOKEN;

// Downloader
const {getType} = require("./downloader/AbstractDownloader");
const YoutubeDownloader = require("./downloader/YoutubeDownloader");
const RedditDownloader = require("./downloader/RedditDownloader");

const {getProgress} = require("./Utility");

const fs = require("fs");

client.once("ready", async () => {
    console.log(client.user.username + " is now online");
});

client.on("messageCreate", async (message) => {
    const messageParts = message.content.split(" ");

    for (let i = 0; i < messageParts.length; i++) {
        const messagePart = messageParts[i];
        if (messagePart.startsWith("!")) return;

        const type = getType(messagePart);
        if (type.type == null) continue;

        const downloader = getDownloader(type.type);

        downloadTasks(downloader, message);

        const args = messageParts.splice(i+1, messageParts.length);

        downloader.download(type.url, message, args);
        return;
    }
});

function downloadTasks(downloader, message) {
    downloader.on("finished", async (data) => {
        await data.reply.edit({
            content: message.member.user.toString() + " sent this video: ",
            files: ["./" + data.destination]
        });
        await message.delete();
        await fs.unlinkSync("./" + data.destination);
    });

    let lastProgressBar;
    downloader.on("progress", async (data) => {
        const newProgressBar = getProgress(data.current, data.max);
        if (newProgressBar !== lastProgressBar) {
            data.reply.edit({content: "Download progress: " + newProgressBar + " | " + data.current + "mB / " + data.max + "mB"});
            lastProgressBar = newProgressBar;
        }
    });

    downloader.on("videoAlreadyDownloading", (data) => {
        data.reply.edit({content: `${data.destination} is already being processed. Please wait until video finished`});
    });

    downloader.on("fileTooBig", (data) => {
        data.reply.edit({content: "Video is too big. Skipping download"});
    })

    downloader.on("e", (data) => {
        data.reply.edit({content: "There was an error while downloading your video. " + data.error});
    });
}

function getDownloader(type) {
    switch (type) {
        case "reddit":
            return new RedditDownloader()
        case "youtube":
            return new YoutubeDownloader();

    }
}


client.login(TOKEN);
