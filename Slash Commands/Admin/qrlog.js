const { SlashCommandBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

module.exports = {
    name: 'qrlog',
    description: 'Set or remove the QR code logging channel',
    options: [
        {
            name: 'channel',
            description: 'The channel to log QR codes in (leave empty to remove logging)',
            type: 7, // CHANNEL
            required: false,
            channel_types: [0] // Text channels only
        }
    ],

    async run(client, interaction) {
        try {
            const channel = interaction.options.getChannel('channel');
            const guildHandler = require('../../Handlers/guildHandler')(client);
            const config = guildHandler.loadServerConfig();
            const serverConfig = guildHandler.createDefaultSettings();

            // Ensure server exists in config
            if (!config.servers[interaction.guild.id]) {
                config.servers[interaction.guild.id] = serverConfig;
            }

            // Update logging settings
            if (channel) {
                // Set new logging channel
                config.servers[interaction.guild.id].qrScanner.logging = {
                    enabled: true,
                    channelId: channel.id
                };

                await interaction.reply(`QR code logging has been set to ${channel}`);
            } else {
                // Remove logging channel
                config.servers[interaction.guild.id].qrScanner.logging = {
                    enabled: false,
                    channelId: null
                };

                await interaction.reply('QR code logging has been disabled');
            }

            // Save the updated config
            guildHandler.saveServerConfig(config);

        } catch (error) {
            if (client.handleError) {
                await client.handleError(interaction, error, 'qrlog command');
            } else {
                console.error('Error in qrlog command:', error);
                await interaction.reply({
                    content: 'An error occurred while processing the command.',
                    ephemeral: true
                });
            }
        }
    }
}; 