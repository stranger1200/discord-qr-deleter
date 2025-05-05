const { MessageFlags } = require('discord.js');

module.exports = (client) => {
    // Initialize button collection
    client.buttons = new Map();

    // Handle button interactions
    client.on('interactionCreate', async interaction => {
        if (!interaction.isButton()) return;

        const button = client.buttons.get(interaction.customId);
        if (!button) return;

        try {
            await button.run(client, interaction);
        } catch (error) {
            if (client.handleError) {
                await client.handleError(interaction, error, `button "${interaction.customId}"`);
            } else {
                console.error('Error in button interaction:', error);
                try {
                    await interaction.reply({
                        content: 'An error occurred while processing this button.',
                        flags: MessageFlags.Ephemeral
                    });
                } catch (replyError) {
                    console.error('Failed to send error response:', replyError);
                }
            }
        }
    });
}; 