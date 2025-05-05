const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const fs = require('fs');
const path = require('path');

// Function to load server config
function loadServerConfig() {
    const configPath = path.join(process.cwd(), 'config', 'serverconfig.json');
    try {
        if (fs.existsSync(configPath)) {
            const data = fs.readFileSync(configPath, 'utf8');
            if (!data.trim()) {
                throw new Error('Config file is empty');
            }
            return JSON.parse(data);
        }
        // If file doesn't exist, create it with default structure
        const defaultConfig = {
            servers: {}
        };
        fs.writeFileSync(configPath, JSON.stringify(defaultConfig, null, 4));
        return defaultConfig;
    } catch (error) {
        throw new Error(`Failed to load server config: ${error.message}`);
    }
}

// Function to get or create default server settings
function getServerSettings(config, guildId) {
    if (!config) {
        throw new Error('Invalid config provided');
    }
    if (!guildId) {
        throw new Error('No guild ID provided');
    }
    
    if (!config.servers[guildId]) {
        config.servers[guildId] = {
            qrScannerEnabled: true,
            qrScanner: {
                roles: {
                    whitelistIds: [], // Roles that can post QRs
                    blacklistIds: []  // Roles that can't post QRs
                },
                channels: {
                    mode: "none",
                    ids: []
                }
            }
        };
    }

    // Migrate old role config if needed
    if (config.servers[guildId].qrScanner.roles.mode !== undefined) {
        const oldMode = config.servers[guildId].qrScanner.roles.mode;
        const oldIds = config.servers[guildId].qrScanner.roles.ids || [];
        
        if (oldMode === 'whitelist') {
            config.servers[guildId].qrScanner.roles.whitelistIds = oldIds;
        } else if (oldMode === 'blacklist') {
            config.servers[guildId].qrScanner.roles.blacklistIds = oldIds;
        }

        // Remove old properties
        delete config.servers[guildId].qrScanner.roles.mode;
        delete config.servers[guildId].qrScanner.roles.ids;
    }

    return config.servers[guildId];
}

// Function to save server config
function saveServerConfig(config) {
    if (!config) {
        throw new Error('No config provided to save');
    }
    
    const configPath = path.join(process.cwd(), 'config', 'serverconfig.json');
    try {
        fs.writeFileSync(configPath, JSON.stringify(config, null, 4));
    } catch (error) {
        throw new Error(`Failed to save server config: ${error.message}`);
    }
}

module.exports = {
    name: 'qrfilter',
    description: 'Manage QR scanner filters for roles and channels',
    options: [
        {
            name: 'role',
            description: 'Manage role filtering',
            type: 1, // SUB_COMMAND
            options: [
                {
                    name: 'type',
                    description: 'Type of role filter to manage',
                    type: 3, // STRING
                    required: true,
                    choices: [
                        { name: 'Blacklist (QR codes from these roles will be deleted)', value: 'blacklist' },
                        { name: 'Whitelist (Only these roles can post QR codes)', value: 'whitelist' },
                        { name: 'Clear (Remove all role filters)', value: 'clear' }
                    ]
                },
                {
                    name: 'roles',
                    description: 'Roles to add to the filter (mention roles or use IDs, space separated)',
                    type: 3, // STRING
                    required: false
                }
            ]
        },
        {
            name: 'channel',
            description: 'Manage channel filtering',
            type: 1, // SUB_COMMAND
            options: [
                {
                    name: 'mode',
                    description: 'Filter mode for channels',
                    type: 3, // STRING
                    required: true,
                    choices: [
                        { name: 'None (Check all channels)', value: 'none' },
                        { name: 'Whitelist (Only allow QR codes in these channels)', value: 'whitelist' },
                        { name: 'Blacklist (Delete QR codes in these channels)', value: 'blacklist' }
                    ]
                },
                {
                    name: 'channels',
                    description: 'Channels to add to the filter (mention channels or use IDs, space separated)',
                    type: 3, // STRING
                    required: false
                }
            ]
        },
        {
            name: 'list',
            description: 'List current filter settings',
            type: 1 // SUB_COMMAND
        }
    ],

    async run(client, interaction) {
        try {
            // Load current config
            const config = loadServerConfig();
            
            // Get or create server settings
            const guildId = interaction.guild.id;
            const serverSettings = getServerSettings(config, guildId);
            
            const subcommand = interaction.options.getSubcommand();

            if (subcommand === 'list') {
                let response = '**Current QR Scanner Filters:**\n\n';
                
                // Role settings
                response += '**Roles:**\n';
                if (serverSettings.qrScanner.roles.blacklistIds?.length > 0) {
                    response += 'Blacklisted (QR codes will be deleted): ' + 
                        serverSettings.qrScanner.roles.blacklistIds.map(id => `<@&${id}>`).join(', ') + '\n';
                }
                if (serverSettings.qrScanner.roles.whitelistIds?.length > 0) {
                    response += 'Whitelisted (Can post QR codes): ' + 
                        serverSettings.qrScanner.roles.whitelistIds.map(id => `<@&${id}>`).join(', ') + '\n';
                }
                if (!serverSettings.qrScanner.roles.whitelistIds?.length && 
                    !serverSettings.qrScanner.roles.blacklistIds?.length) {
                    response += 'No role filters configured\n';
                }
                
                // Channel settings
                const channelMode = serverSettings.qrScanner.channels.mode;
                response += `\n**Channels:** ${channelMode}${channelMode === 'none' ? ' (Checking all channels)' : ''}\n`;
                if (channelMode === 'whitelist' && serverSettings.qrScanner.channels.ids.length > 0) {
                    response += 'QR codes allowed in: ';
                    response += serverSettings.qrScanner.channels.ids
                        .map(id => `<#${id}>`)
                        .join(', ');
                } else if (channelMode === 'blacklist' && serverSettings.qrScanner.channels.ids.length > 0) {
                    response += 'QR codes deleted in: ';
                    response += serverSettings.qrScanner.channels.ids
                        .map(id => `<#${id}>`)
                        .join(', ');
                }
                
                return await interaction.reply({ content: response });
            }

            if (subcommand === 'role') {
                const type = interaction.options.getString('type');
                const itemsString = interaction.options.getString('roles');

                if (type === 'clear') {
                    serverSettings.qrScanner.roles.whitelistIds = [];
                    serverSettings.qrScanner.roles.blacklistIds = [];
                    saveServerConfig(config);
                    return await interaction.reply({ content: 'Cleared all role filters.' });
                }

                const targetList = type === 'whitelist' ? 'whitelistIds' : 'blacklistIds';

                if (!itemsString) {
                    // Clear just this list type
                    serverSettings.qrScanner.roles[targetList] = [];
                    saveServerConfig(config);
                    return await interaction.reply({ 
                        content: `Cleared all ${type}ed roles.`
                    });
                }

                // Check for @everyone mention
                if (itemsString.includes('@everyone')) {
                    // Use the guild's id as @everyone role id
                    const everyoneRoleId = interaction.guild.id;
                    serverSettings.qrScanner.roles[targetList] = [everyoneRoleId];
                    saveServerConfig(config);
                    return await interaction.reply({ 
                        content: `Updated ${type} to affect everyone in the server.`
                    });
                }

                // Extract IDs from mentions and raw IDs
                const mentionPattern = /<@&(\d+)>/g;
                const mentionMatches = [...itemsString.matchAll(mentionPattern)];
                const mentionIds = mentionMatches.map(match => match[1]);
                
                // Split the string by spaces and filter for raw IDs (numbers only)
                const rawIds = itemsString.split(/\s+/).filter(item => /^\d+$/.test(item));
                
                // Combine both sets of IDs and remove duplicates
                const newIds = [...new Set([...mentionIds, ...rawIds])];

                if (newIds.length === 0) {
                    return await interaction.reply({ 
                        content: 'Please provide valid roles using mentions or role IDs, or use "@everyone" to affect all members.',
                        flags: MessageFlags.Ephemeral
                    });
                }

                // Validate that all IDs exist in the guild
                const guild = interaction.guild;
                const invalidIds = [];
                for (const id of newIds) {
                    const role = await guild.roles.fetch(id).catch(() => null);
                    if (!role) invalidIds.push(id);
                }

                if (invalidIds.length > 0) {
                    return await interaction.reply({ 
                        content: 'Some of the roles provided were not found in the server. Please check the roles and try again.',
                        flags: MessageFlags.Ephemeral
                    });
                }

                // Add new IDs to existing ones
                const existingIds = serverSettings.qrScanner.roles[targetList] || [];
                serverSettings.qrScanner.roles[targetList] = [...new Set([...existingIds, ...newIds])];

                // Save changes
                saveServerConfig(config);

                const mentions = serverSettings.qrScanner.roles[targetList]
                    .map(id => `<@&${id}>`)
                    .join(', ');

                return await interaction.reply({ 
                    content: `Updated ${type} roles: ${mentions}`
                });
            }

            if (subcommand === 'channel') {
                const mode = interaction.options.getString('mode');
                const itemsString = interaction.options.getString('channels');

                // Update mode
                serverSettings.qrScanner.channels.mode = mode;

                // If mode is 'none', clear all channel filters
                if (mode === 'none') {
                    serverSettings.qrScanner.channels.ids = [];
                    saveServerConfig(config);
                    return await interaction.reply({ 
                        content: 'Cleared all channel filters and set mode to none (checking all channels).'
                    });
                }

                // Handle adding/removing items
                if (itemsString) {
                    // Extract IDs from mentions and raw IDs
                    const mentionPattern = /<#(\d+)>/g;
                    const mentionMatches = [...itemsString.matchAll(mentionPattern)];
                    const mentionIds = mentionMatches.map(match => match[1]);
                    
                    // Split the string by spaces and filter for raw IDs (numbers only)
                    const rawIds = itemsString.split(/\s+/).filter(item => /^\d+$/.test(item));
                    
                    // Combine both sets of IDs and remove duplicates
                    const newIds = [...new Set([...mentionIds, ...rawIds])];

                    if (newIds.length === 0) {
                        return await interaction.reply({ 
                            content: 'Please provide valid channels using mentions or channel IDs.',
                            flags: MessageFlags.Ephemeral
                        });
                    }

                    // Validate that all IDs exist in the guild
                    const guild = interaction.guild;
                    const invalidIds = [];
                    for (const id of newIds) {
                        const channel = await guild.channels.fetch(id).catch(() => null);
                        if (!channel) invalidIds.push(id);
                    }

                    if (invalidIds.length > 0) {
                        return await interaction.reply({ 
                            content: 'Some of the channels provided were not found in the server. Please check the channels and try again.',
                            flags: MessageFlags.Ephemeral
                        });
                    }

                    // Add new IDs to existing ones
                    const existingIds = serverSettings.qrScanner.channels.ids;
                    serverSettings.qrScanner.channels.ids = [...new Set([...existingIds, ...newIds])];
                } else {
                    // No items provided - clear the list but keep the mode
                    serverSettings.qrScanner.channels.ids = [];
                }

                // Save changes
                saveServerConfig(config);

                let response = `Updated channel filter mode to: ${mode}${mode === 'none' ? ' (Checking all channels)' : ''}`;
                if (serverSettings.qrScanner.channels.ids.length > 0) {
                    const mentions = serverSettings.qrScanner.channels.ids
                        .map(id => `<#${id}>`)
                        .join(', ');
                    response += `\nConfigured channels: ${mentions}`;
                } else if (mode !== 'none') {
                    response += '\nNo channels configured - filter will apply to none';
                }

                await interaction.reply({ content: response });
            }
        } catch (error) {
            if (client.handleError) {
                await client.handleError(interaction, error, 'qrfilter command');
            } else {
                console.error('Error in qrfilter command:', error);
                try {
                    await interaction.reply({
                        content: 'An error occurred while processing the command.',
                        flags: MessageFlags.Ephemeral
                    });
                } catch (replyError) {
                    console.error('Failed to send error response:', replyError);
                }
            }
        }
    }
}; 