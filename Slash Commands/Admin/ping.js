const { SlashCommandBuilder } = require('discord.js');

module.exports = {
	name: 'ping',
	description: "Check bot's ping",
	// Using the builder for better structure
	data: new SlashCommandBuilder()
		.setName('ping')
		.setDescription("Check bot's ping"),
	
	async run(client, interaction) {
		try {
			await interaction.reply(`🏓 Pong! Latency: **${Math.round(client.ws.ping)}ms**`);
		} catch (error) {
			throw error; // This will be caught by the error handler
		}
	}
};