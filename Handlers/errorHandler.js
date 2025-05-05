const { EmbedBuilder, AttachmentBuilder, MessageFlags, WebhookClient } = require('discord.js');
const chalk = require('chalk');
const config = require('../config/botconfig.json');

const handleError = async (interaction, error, context = '') => {
    console.error(error);

    // Handle expired interactions first
    if (error.code === 10062) return;

    // Get error details
    const errorDetails = error.stack || error.toString();
    const DISCORD_EMBED_LIMIT = 4096;

    // Log to webhook if it's not an expired interaction
    if (error.code !== 10062 && config.errorHandler.webhookUrl) {
        try {
            const webhook = new WebhookClient({ url: config.errorHandler.webhookUrl });
            const errorEmbed = new EmbedBuilder()
                .setColor('#FF0000')
                .setTitle(`Error in ${context || 'Unknown Location'}`)
                .setTimestamp();

            // Add detailed information if available
            if (error.details) {
                const details = [];
                if (error.details.guildName) details.push(`**Server:** \`${error.details.guildName}\` (\`${error.details.guildId}\`)`);
                if (error.details.channelName) details.push(`**Channel:** \`${error.details.channelName}\` (\`${error.details.channelId}\`)`);
                if (error.details.authorTag) details.push(`**User:** \`${error.details.authorTag}\` (\`${error.details.authorId}\`)`);
                if (error.details.messageId) details.push(`**Message ID:** \`${error.details.messageId}\``);
                if (error.details.imageUrl) details.push(`**Image URL:** \`${error.details.imageUrl}\``);
                if (error.details.type) details.push(`**Error Type:** \`${error.details.type}\``);
                if (error.details.timestamp) details.push(`**Timestamp:** \`${error.details.timestamp}\``);

                if (details.length > 0) {
                    errorEmbed.addFields({ name: 'Error Context', value: details.join('\n') });
                }
            }

            if (errorDetails.length > DISCORD_EMBED_LIMIT) {
                const buffer = Buffer.from(errorDetails, 'utf-8');
                const attachment = new AttachmentBuilder(buffer, { name: 'error.txt' });
                errorEmbed.addFields({ name: 'Stack Trace', value: 'Error details attached in file due to length' });
                await webhook.send({
                    content: `<@${config.errorHandler.adminId}>`,
                    embeds: [errorEmbed],
                    files: [attachment]
                });
            } else {
                errorEmbed.addFields({ name: 'Stack Trace', value: `\`\`\`${errorDetails}\`\`\`` });
                await webhook.send({
                    content: `<@${config.errorHandler.adminId}>`,
                    embeds: [errorEmbed]
                });
            }
            
            // Destroy the webhook client after use
            webhook.destroy();
        } catch (logError) {
            console.error(chalk.red('Failed to send error to webhook:'), logError);
        }
    }

    // Only show user messages for slash commands (interaction.isCommand())
    if (interaction.isCommand?.()) {
        const discordErrorMessages = {
            50013: 'The bot lacks necessary permissions.',
            50001: 'Missing access to the channel.',
            50035: 'Invalid form body or invalid data sent.',
            50006: 'Cannot send an empty message.',
            50007: 'Cannot send messages to this user.',
            50008: 'Cannot send messages in this channel.',
            50024: 'Cannot execute action on this channel type.'
        };

        const response = discordErrorMessages[error.code] || 'An unexpected error occurred. Please try again later.';

        try {
            if (interaction.deferred) {
                await interaction.editReply({ 
                    content: response,
                    components: [],
                    flags: MessageFlags.Ephemeral
                }).catch(() => {});
            } else if (!interaction.replied) {
                await interaction.reply({ 
                    content: response,
                    flags: MessageFlags.Ephemeral
                }).catch(() => {});
            }
        } catch (replyError) {
            console.error(chalk.red('Failed to send error response to user:'), replyError);
        }
    }

    return false;
};

// Export a function that sets up the error handler
module.exports = (client) => {
    client.handleError = handleError;
}; 