const { SlashCommandBuilder } = require('@discordjs/builders');
const { setLogChannel } = require('../database.js'); // Adjusted to the correct path

module.exports = {
    data: new SlashCommandBuilder()
        .setName('setlogchannel')
        .setDescription('Set or remove the logging channel for QR code deletions')
        .addStringOption(option => 
            option.setName('channel')
                .setDescription('The name or ID of the channel to send logs to or type "none" to remove the logging channel')
                .setRequired(true)
        ),
    async execute(interaction) {
        const channelInput = interaction.options.getString('channel');

        if (channelInput.toLowerCase() === 'none') {
            setLogChannel(interaction.guild.id, null);
            return interaction.reply({ content: 'Logging channel has been removed.', ephemeral: true });
        }

        // Try to get the channel by ID or mention
        let channel;
        try {
            channel = await interaction.guild.channels.fetch(channelInput.replace(/\D/g, '')); // Remove non-digit characters
        } catch (error) {
            return interaction.reply({ content: 'Invalid channel ID or mention.', ephemeral: true });
        }

        if (!channel || !channel.isTextBased()) {
            return interaction.reply({ content: 'Please provide a valid text channel ID or mention.', ephemeral: true });
        }

        setLogChannel(interaction.guild.id, channel.id);
        await interaction.reply({ content: `Logging channel set to ${channel}.`, ephemeral: true });
    },
};