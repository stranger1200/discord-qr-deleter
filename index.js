const { Client, GatewayIntentBits, Partials, ActivityType } = require('discord.js');
const chalk = require('chalk');
const client = new Client({
	intents: [
		GatewayIntentBits.Guilds,
		GatewayIntentBits.GuildMessages,
		GatewayIntentBits.MessageContent
	],
	partials: [Partials.Message]
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

	// Find the largest server by member count
	const largestServer = client.guilds.cache.reduce((prev, current) => 
		(prev.memberCount > current.memberCount) ? prev : current
	);

	const activities = [
		{ name: `QR Codes`, type: ActivityType.Custom, state: 'Busting QR Codes' },
		{ name: `${largestServer.memberCount} members`, type: ActivityType.Watching }
	];

	// Set initial status
	client.user.setActivity(activities[0].state, { type: activities[0].type });

	let i = 0;
	setInterval(() => {
		i = (i + 1) % activities.length;
		if (activities[i].type === ActivityType.Custom) {
			client.user.setActivity(activities[i].state, { type: activities[i].type });
		} else {
			client.user.setActivity(activities[i]);
		}
	}, 300000); // 5 minutes in milliseconds

	client.user.setStatus('online');
	console.log(chalk.red(`Logged in as ${client.user.tag}!`));
});

client.login(process.env.TOKEN);
