const { PermissionFlagsBits, EmbedBuilder } = require('discord.js');

module.exports = {
    name: 'uptime',
    description: 'Display the bot\'s uptime',
    options: [],
    defaultMemberPermissions: PermissionFlagsBits.ManageMessages,

    async run(client, interaction) {
        try {
            const uptime = process.uptime();
            const days = Math.floor(uptime / 86400);
            const hours = Math.floor((uptime % 86400) / 3600);
            const minutes = Math.floor((uptime % 3600) / 60);
            const seconds = Math.floor(uptime % 60);

            const embed = new EmbedBuilder()
                .setColor(0x8ABA3B)
                .setTitle('Bot Uptime')
                .setDescription(`I've been online for:\n${days} days, ${hours} hours, ${minutes} minutes, ${seconds} seconds`)
                .setFooter({ text: 'Bot Status' })
                .setTimestamp();

            await interaction.reply({ embeds: [embed] });
        } catch (error) {
            if (client.handleError) {
                await client.handleError(interaction, error, 'uptime command');
            } else {
                console.error('Error in uptime command:', error);
                await interaction.reply({
                    content: 'An error occurred while retrieving the uptime.',
                    ephemeral: true
                });
            }
        }
    }
}; 