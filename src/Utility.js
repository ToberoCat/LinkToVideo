const fs = require("fs");

function getProgress(current, max) {
    const n = 15;
    const progress = Math.round((current / max) * n);
    return "█".repeat(progress) + "░".repeat(n - progress);
}

function fileSize(path) {
    const stats = fs.statSync(path)
    return stats["size"]
}

module.exports.getProgress = getProgress;
module.exports.fileSize = fileSize;