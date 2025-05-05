const { Client, GatewayIntentBits, Partials, ActivityType } = require('discord.js');
const chalk = require('chalk');
const client = new Client({
	intents: [
		GatewayIntentBits.Guilds, 
		GatewayIntentBits.GuildMessages, 
		GatewayIntentBits.GuildPresences, 
		GatewayIntentBits.GuildMessageReactions, 
		GatewayIntentBits.DirectMessages,
		GatewayIntentBits.MessageContent
	], 
	partials: [Partials.Channel, Partials.Message, Partials.User, Partials.GuildMember, Partials.Reaction] 
});

const fs = require('fs');
require('dotenv').config();

// Load handlers
fs.readdirSync('./Handlers').forEach((handler) => {
	require(`./Handlers/${handler}`)(client);
});

// Ready event handling
client.on("ready", async () => {
	// Handle slash commands
	await client.loadSlashCommands();

	const activities = [
		{ name: `${client.guilds.cache.size} Servers`, type: ActivityType.Listening },
		{ name: `${client.channels.cache.size} Channels`, type: ActivityType.Playing },
		{ name: `${client.users.cache.size} Users`, type: ActivityType.Watching },
		{ name: `Discord.js v14`, type: ActivityType.Competing }
	];
	const status = [
		'online',
		'dnd',
		'idle'
	];

	let i = 0;
	setInterval(() => {
		if(i >= activities.length) i = 0;
		client.user.setActivity(activities[i]);
		i++;
	}, 5000);

	let s = 0;
	setInterval(() => {
		if(s >= activities.length) s = 0;
		client.user.setStatus(status[s]);
		s++;
	}, 30000);
	console.log(chalk.red(`Logged in as ${client.user.tag}!`));
});

client.login(process.env.TOKEN);