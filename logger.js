const fs = require('fs');
const path = require('path');
const { getLogChannel } = require('./database.js');

async function sendDeletionLog(client, msg) {
    const logChannelId = getLogChannel(msg.guild.id);
    if (!logChannelId) {
        console.log(`No log channel set for server ${msg.guild.id}`);
        return;
    }

    const logChannel = client.channels.cache.get(logChannelId);
    if (!logChannel) {
        console.log(`Log channel with ID ${logChannelId} not found`);
        return;
    }

    const deletionTime = Math.floor(Date.now() / 1000);
    const originalTime = Math.floor(msg.createdTimestamp / 1000);
    const logMessage = `<t:${deletionTime}:f> 🗑️ QR Code (\`${msg.id}\`) from <@${msg.author.id}> (**${msg.author.username}**, \`${msg.author.id}\`) deleted in <#${msg.channel.id}> (**${msg.channel.name}**, \`${msg.channel.id}\`) (originally posted at: **<t:${originalTime}:f>**)`;

    await logChannel.send({ content: logMessage, allowedMentions: { parse: [] } });
}

module.exports = { sendDeletionLog };