const { SlashCommandBuilder } = require('discord.js');
const config = require('../../config/botconfig.json');

module.exports = {
    name: 'initconfigs',
    description: 'Initialize configurations for all servers (Admin Only)',

    async run(client, interaction) {
        // Check if the user is the admin
        if (interaction.user.id !== config.errorHandler.adminId) {
            return await interaction.reply({
                content: 'This command can only be used by the bot administrator.',
                ephemeral: true
            });
        }

        // Get the guild handler functions
        const guildHandler = require('../../Handlers/guildHandler')(client);
        
        // Load or create base config
        let serverConfig = guildHandler.loadServerConfig();
        if (!serverConfig) {
            serverConfig = { servers: {} };
        }

        // Ensure servers object exists
        if (!serverConfig.servers) {
            serverConfig.servers = {};
        }

        let initialised = 0;
        let skipped = 0;
        let failed = 0;

        // Process all guilds
        await interaction.deferReply();
        
        try {
            for (const guild of client.guilds.cache.values()) {
                if (!serverConfig.servers[guild.id]) {
                    // Add default settings for the guild
                    serverConfig.servers[guild.id] = guildHandler.createDefaultSettings();
                    initialised++;
                } else {
                    skipped++;
                }
            }

            // Save the updated config
            if (!guildHandler.saveServerConfig(serverConfig)) {
                return await interaction.editReply({
                    content: 'Failed to save configuration changes. Check the logs for more details.',
                    ephemeral: true
                });
            }

            // Send response
            const response = [
                '**Server Configuration Initialization Complete**',
                `✅ Initialised: ${initialised} servers`,
                `⏭️ Skipped: ${skipped} servers (already configured)`,
                `❌ Failed: ${failed} servers`
            ].join('\n');

            await interaction.editReply({ content: response });
        } catch (error) {
            console.error('Error in initconfigs command:', error);
            await interaction.editReply({
                content: 'An error occurred while initializing configurations. Check the logs for more details.',
                ephemeral: true
            });
        }
    }
}; 