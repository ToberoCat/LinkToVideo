function getMbFromBytes(bytes) {
    return Math.round((bytes / 1000000.0) * 100) / 100;
}

module.exports.getMbFromBytes = getMbFromBytes;