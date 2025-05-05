const { SlashCommandBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

// Function to save server config
function saveServerConfig(config) {
    const configPath = path.join(process.cwd(), 'config', 'serverconfig.json');
    try {
        fs.writeFileSync(configPath, JSON.stringify(config, null, 4));
    } catch (error) {
        console.error('Error saving server config:', error);
        throw error; // Propagate error to command handler
    }
}

module.exports = {
    name: 'toggleqr',
    description: 'Toggle QR code scanning functionality',
    data: new SlashCommandBuilder()
        .setName('toggleqr')
        .setDescription('Toggle QR code scanning functionality'),

    async run(client, interaction) {
        try {
            const guildHandler = require('../../Handlers/guildHandler')(client);
            const config = guildHandler.loadServerConfig();
            const guildId = interaction.guild.id;

            // Ensure server exists in config
            if (!config.servers[guildId]) {
                config.servers[guildId] = guildHandler.createDefaultSettings();
            }

            // Toggle the QR scanner state for this server
            config.servers[guildId].qrScannerEnabled = !config.servers[guildId].qrScannerEnabled;

            // Save the updated config
            guildHandler.saveServerConfig(config);

            // Respond with the new state
            await interaction.reply({
                content: `QR code scanning has been ${config.servers[guildId].qrScannerEnabled ? 'enabled' : 'disabled'} for this server.`
            });
        } catch (error) {
            if (client.handleError) {
                await client.handleError(interaction, error, 'toggleqr command');
            } else {
                console.error('Error in toggleqr command:', error);
                await interaction.reply({
                    content: 'An error occurred while processing the command.',
                    ephemeral: true
                });
            }
        }
    }
}; 