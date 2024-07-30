const fs = require('fs');
const { Client, GatewayIntentBits, PermissionsBitField, Partials, ChannelType, EmbedBuilder, ActivityType } = require('discord.js');
const Scanner = require('./scanner.js');
const { responses, rand } = require('./responses.js'); 
const { sendDeletionLog } = require('./logger.js');
const registerCommands = require('./commandBuilder.js');

// Load environment variables from env.json if not in production
if (!process.env.TOKEN) {
    const env = require('./env.json');
    process.env.TOKEN = env.TOKEN;
}

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMessageReactions
    ],
    partials: [Partials.Message, Partials.Channel, Partials.Reaction]
});

client.commands = new Map();

client.on('ready', async () => {
    console.log(`Logged in as ${client.user.tag}`);
    console.log('Setting bot activity...');
    try {
        await client.user.setActivity('for QR Codes | tag me!', { type: ActivityType.Watching });
        console.log('Bot activity set successfully.');
    } catch (error) {
        console.error('Error setting bot activity:', error);
    }

    try {
        await registerCommands(client);
        console.log('Commands registered.');
    } catch (error) {
        console.error('Error registering commands:', error);
    }
});

client.on('messageCreate', async function (msg) {
    if (msg.channel.type === ChannelType.DM || msg.author.id === client.user.id) {
        return;
    }

    if (msg.content.includes(client.user.id)) {
        let uptimestr;
        {
            let diff = client.uptime;
            let s = Math.floor(diff / 1000);
            let m = Math.floor(s / 60);
            s = s % 60;
            let h = Math.floor(m / 60);
            m = m % 60;
            let d = Math.floor(h / 24);
            h = h % 24;
            uptimestr = `${d} days ${h} hours ${m} minutes ${s} seconds`;
        }

        const serverCount = client.guilds.cache.size;
        const serverText = serverCount === 1 ? "server" : "servers";

        const embed = new EmbedBuilder()
            .setTitle(`About ${client.user.username}`)
            .setAuthor({ name: `${client.user.username}`, iconURL: client.user.avatarURL() })
            .setColor(msg.member.displayHexColor)
            .setDescription("I find QR codes in messages and delete them! You must give me the __Manage Messages__ permission so that I can do my job most effectively.")
            .setThumbnail(client.user.avatarURL())
            .setTimestamp()
            .addFields({ name: "Statistics", value: `Uptime ${uptimestr}\nProtecting ${serverCount} ${serverText}\nPing: ${client.ws.ping}ms` });

        const sentMessage = await msg.channel.send({ embeds: [embed] });
        setTimeout(() => {
            sentMessage.delete().catch(() => { });
        }, 20000);
    }

    if (msg.member && msg.member.permissions.has(PermissionsBitField.Flags.ManageMessages)) {
        return;
    }

    let deleted = await processMessage(msg);
    if (!deleted) {
        msg.awaitReactions({ max: 1, time: 300000, errors: [] }).then(async function (collected) {
            let deleted = await processMessage(msg);
        });
    }
});

client.on('interactionCreate', async interaction => {
    if (!interaction.isCommand()) return;

    const command = client.commands.get(interaction.commandName);

    if (!command) return;

    try {
        await command.execute(interaction);
    } catch (error) {
        console.error(error);
        await interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true });
    }
});

async function processMessage(msg) {
    let removed = false;
    if (msg.attachments.size > 0) {
        removed = await processAttachments(msg);
        if (removed) return true;
    }
    if (!removed && msg.embeds.length > 0) {
        removed = await processEmbeds(msg);
        if (removed) return true;
    }
    return false;
}

async function processAttachments(msg) {
    for (let attachment of msg.attachments.values()) {
        try {
            let res = await Scanner.scanURL(attachment.url);
            if (res) {
                await deleteMessage(msg);
                console.log(`Deleted a QR code from user: ${msg.author.tag} (ID: ${msg.author.id})`);
                await sendDeletionLog(client, msg);
                return true;
            }
        } catch (error) {
            console.error('Error processing attachment:', error);
        }
    }
    return false;
}

async function processEmbeds(msg) {
    for (let embed of msg.embeds) {
        try {
            let res = await Scanner.scanURL(embed.url);
            if (res) {
                await deleteMessage(msg);
                console.log(`Deleted a QR code from user: ${msg.author.tag} (ID: ${msg.author.id})`);
                await sendDeletionLog(client, msg);
                return true;
            }
        } catch (error) {
            console.error('Error processing embed:', error);
        }
    }
    return false;
}

async function deleteMessage(message) {
    try {
        const response = deleteMsg(message);
        const sentMessage = await message.channel.send(response);
        setTimeout(() => {
            sentMessage.delete().catch(() => { });
        }, 10000);
        await message.delete();
    } catch (error) {
        console.error('Error deleting message:', error);
    }
}

function deleteMsg(message) {
    const response = responses[Math.floor(Math.random() * responses.length)]
        .replace(/{id}/g, `${message.author.id}`)
    return response;
}

client.login(process.env.TOKEN);