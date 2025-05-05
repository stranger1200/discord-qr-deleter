const fs = require('fs');
const path = require('path');

function loadServerConfig() {
    const configDir = path.join(process.cwd(), 'config');
    const configPath = path.join(configDir, 'serverconfig.json');
    
    try {
        // Ensure config directory exists
        if (!fs.existsSync(configDir)) {
            fs.mkdirSync(configDir, { recursive: true });
        }

        // If file exists but is empty or invalid, treat it as non-existent
        let config = null;
        if (fs.existsSync(configPath)) {
            const content = fs.readFileSync(configPath, 'utf8');
            if (content.trim()) {
                try {
                    config = JSON.parse(content);
                } catch (parseError) {
                    console.error('Error parsing server config:', parseError);
                }
            }
        }

        // If no valid config exists, create default
        if (!config) {
            config = {
                servers: {}
            };
            fs.writeFileSync(configPath, JSON.stringify(config, null, 4));
        }

        return config;
    } catch (error) {
        console.error('Error loading server config:', error);
        return null;
    }
}

function saveServerConfig(config) {
    const configDir = path.join(process.cwd(), 'config');
    const configPath = path.join(configDir, 'serverconfig.json');
    
    try {
        // Ensure config directory exists
        if (!fs.existsSync(configDir)) {
            fs.mkdirSync(configDir, { recursive: true });
        }

        fs.writeFileSync(configPath, JSON.stringify(config, null, 4));
        return true;
    } catch (error) {
        console.error('Error saving server config:', error);
        return false;
    }
}

function createDefaultSettings() {
    return {
        qrScannerEnabled: true,
        qrScanner: {
            roles: {
                whitelistIds: [], // Roles that can post QRs
                blacklistIds: []  // Roles that can't post QRs
            },
            channels: {
                mode: "none",
                ids: []
            },
            logging: {
                enabled: false,
                channelId: null
            }
        }
    };
}

module.exports = (client) => {
    // Handle guild joins
    client.on('guildCreate', async (guild) => {
        const config = loadServerConfig();
        if (!config) {
            console.error(`Failed to load configuration when joining guild ${guild.id}`);
            return;
        }

        // Add default settings for the new guild if they don't exist
        if (!config.servers[guild.id]) {
            config.servers[guild.id] = createDefaultSettings();

            // Save the updated config
            if (!saveServerConfig(config)) {
                console.error(`Failed to save configuration for new guild ${guild.id}`);
                return;
            }

            console.log(`Successfully initialised configuration for new guild: ${guild.name} (${guild.id})`);
        }
    });

    // Handle guild removals
    client.on('guildDelete', async (guild) => {
        const config = loadServerConfig();
        if (!config) {
            console.error(`Failed to load configuration when leaving guild ${guild.id}`);
            return;
        }

        // Remove the guild's settings if they exist
        if (config.servers[guild.id]) {
            delete config.servers[guild.id];

            // Save the updated config
            if (!saveServerConfig(config)) {
                console.error(`Failed to remove configuration for guild ${guild.id}`);
                return;
            }

            console.log(`Successfully removed configuration for guild: ${guild.name} (${guild.id})`);
        }
    });

    // Export functions for use in other files
    return {
        loadServerConfig,
        saveServerConfig,
        createDefaultSettings
    };
}; 