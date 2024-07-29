const fs = require('fs');
const path = require('path');
const databasePath = path.join(__dirname, 'database.json');

function loadDatabase() {
    if (!fs.existsSync(databasePath)) {
        fs.writeFileSync(databasePath, JSON.stringify({}));
    }
    const data = fs.readFileSync(databasePath, 'utf8');
    return JSON.parse(data);
}

function saveDatabase(db) {
    fs.writeFileSync(databasePath, JSON.stringify(db, null, 2));
}

function setLogChannel(guildId, channelId) {
    const data = loadDatabase();

    // Initialize guild data if it doesn't exist
    if (!data[guildId]) {
        data[guildId] = {};
    }

    // Set or remove the log channel
    if (channelId === null) {
        delete data[guildId].logChannel;
    } else {
        data[guildId].logChannel = channelId;
    }

    saveDatabase(data);
}

function getLogChannel(guildId) {
    const db = loadDatabase();
    return db[guildId] ? db[guildId].logChannel : null;
}

module.exports = {
    setLogChannel,
    getLogChannel,
};