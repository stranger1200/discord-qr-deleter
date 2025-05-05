const { MessageFlags, EmbedBuilder } = require('discord.js');

module.exports = {
    name: 'qrstats',
    description: 'View QR code deletion statistics',
    options: [
        {
            name: 'user',
            description: 'User to check stats for (mention or ID)',
            type: 3, // STRING
            required: false
        }
    ],

    async run(client, interaction) {
        try {
            const userInput = interaction.options.getString('user');
            const guildId = interaction.guild.id;
            
            // Get stats from QR Scanner
            const qrScanner = require('../../Handlers/qrScanner')(client);
            const stats = qrScanner.loadStats();
            const serverStats = stats.servers[guildId] || { totalDeletions: 0, users: {} };

            if (userInput) {
                // Try to get user from mention or ID
                let userId = userInput.replace(/[<@!>]/g, ''); // Remove mention formatting if present
                let user;

                try {
                    user = await client.users.fetch(userId);
                } catch {
                    return await interaction.reply({
                        content: 'Invalid user mention or ID provided.',
                        flags: MessageFlags.Ephemeral
                    });
                }

                const userStats = serverStats.users[userId] || { deletions: 0, lastDeletion: null };
                const timestamp = userStats.lastDeletion ? Math.floor(new Date(userStats.lastDeletion).getTime() / 1000) : null;

                const embed = new EmbedBuilder()
                    .setColor(0x8ABA3B)
                    .setAuthor({
                        name: `QR Code Stats for ${user.tag}`,
                        iconURL: user.displayAvatarURL({ dynamic: true })
                    })
                    .addFields(
                        { name: 'User', value: `<@${userId}> (${userId})` }
                    );

                if (userStats.deletions > 0) {
                    if (timestamp) {
                        embed.addFields({
                            name: 'Last Deletion',
                            value: `<t:${timestamp}:F>\n(<t:${timestamp}:R>)`
                        });
                    }
                    embed.setFooter({ text: `Total QR codes deleted: ${userStats.deletions}` });
                } else {
                    embed.addFields({
                        name: 'Status',
                        value: 'No QR codes deleted for this user'
                    });
                }

                embed.setTimestamp();

                await interaction.reply({ 
                    embeds: [embed],
                    allowedMentions: { users: [] }
                });
            } else {
                // Get overall server stats
                const topUsers = Object.entries(serverStats.users)
                    .sort(([, a], [, b]) => b.deletions - a.deletions)
                    .slice(0, 5);

                const embed = new EmbedBuilder()
                    .setColor(0x8ABA3B)
                    .setTitle('Server QR Code Statistics')
                    .setFooter({ text: `Total QR codes deleted: ${serverStats.totalDeletions}` });

                if (topUsers.length > 0) {
                    const topUsersList = [];
                    for (const [userId, stats] of topUsers) {
                        const user = await client.users.fetch(userId).catch(() => null);
                        const username = user ? user.tag : 'Unknown User';
                        const timestamp = stats.lastDeletion ? Math.floor(new Date(stats.lastDeletion).getTime() / 1000) : null;
                        
                        topUsersList.push(
                            `${username} (<@${userId}>)\n` +
                            `• Deletions: ${stats.deletions}\n` +
                            `• Last Deletion: ${timestamp ? `<t:${timestamp}:F> (<t:${timestamp}:R>)` : 'Never'}`
                        );
                    }
                    embed.addFields({
                        name: 'Top Users',
                        value: topUsersList.join('\n\n')
                    });
                } else {
                    embed.addFields({
                        name: 'Top Users',
                        value: 'No deletions recorded yet'
                    });
                }

                embed.setTimestamp();

                await interaction.reply({ 
                    embeds: [embed],
                    allowedMentions: { users: [] }
                });
            }
        } catch (error) {
            if (client.handleError) {
                await client.handleError(interaction, error, 'qrstats command');
            } else {
                console.error('Error in qrstats command:', error);
                await interaction.reply({
                    content: 'An error occurred while retrieving QR stats.',
                    flags: MessageFlags.Ephemeral
                });
            }
        }
    }
}; 