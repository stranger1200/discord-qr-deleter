const { AttachmentBuilder, MessageFlags, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const Jimp = require('jimp');
const jsQR = require('jsqr');
const QrCode = require('qrcode-reader');
const request = require('request').defaults({ encoding: null });
const { PermissionsBitField } = require('discord.js');
const fs = require('fs');
const path = require('path');

let guildHandler;

// Function to load QR stats
function loadStats() {
    const statsPath = path.join(process.cwd(), 'config', 'qrStats.json');
    try {
        if (!fs.existsSync(statsPath)) {
            const defaultStats = { servers: {} };
            fs.writeFileSync(statsPath, JSON.stringify(defaultStats, null, 4));
            return defaultStats;
        }
        const content = fs.readFileSync(statsPath, 'utf8');
        return JSON.parse(content);
    } catch (error) {
        console.error('Error loading QR stats:', error);
        return { servers: {} };
    }
}

// Function to save QR stats
function saveStats(stats) {
    const statsPath = path.join(process.cwd(), 'config', 'qrStats.json');
    try {
        fs.writeFileSync(statsPath, JSON.stringify(stats, null, 4));
        return true;
    } catch (error) {
        console.error('Error saving QR stats:', error);
        return false;
    }
}

// Function to record QR deletion
function recordDeletion(guildId, userId) {
    const stats = loadStats();
    
    // Initialize server stats if they don't exist
    if (!stats.servers[guildId]) {
        stats.servers[guildId] = {
            totalDeletions: 0,
            users: {}
        };
    }

    // Increment server total
    stats.servers[guildId].totalDeletions++;

    // Initialize and update user stats
    if (!stats.servers[guildId].users[userId]) {
        stats.servers[guildId].users[userId] = {
            deletions: 0,
            lastDeletion: null
        };
    }

    stats.servers[guildId].users[userId].deletions++;
    stats.servers[guildId].users[userId].lastDeletion = new Date().toISOString();

    return saveStats(stats);
}

// Cache of recently scanned URLs to avoid duplicates
const recentScans = new Map();
const SCAN_CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const MAX_CACHE_SIZE = 50;
const MAX_IMAGE_SIZE = 1024; // Maximum width/height for processing

// Track processed messages to prevent duplicates
const processedMessages = new Map();
const MESSAGE_CACHE_TTL = 60 * 1000; // 1 minute

// Configure QR reader
let qr = new QrCode();
qr.callback = function(error, result) {
    if(error) {
        console.error(error);
        return;
    }
    console.log(result);
};

// Helper function to download image with timeout
function downloadBuffer(url) {
    return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
            reject(new Error('Download timeout'));
        }, 15000);

        request.get(url, function (err, res, buffer) {
            clearTimeout(timeout);
            if (err) reject(err);
            else resolve(buffer);
        });
    });
}

// Helper function to optimize image if needed
async function optimizeImage(img) {
    const width = img.bitmap.width;
    const height = img.bitmap.height;
    
    if (width > MAX_IMAGE_SIZE || height > MAX_IMAGE_SIZE) {
        const ratio = Math.min(MAX_IMAGE_SIZE / width, MAX_IMAGE_SIZE / height);
        const newWidth = Math.floor(width * ratio);
        const newHeight = Math.floor(height * ratio);
        return img.resize(newWidth, newHeight);
    }
    return img;
}

// Helper function to process image with timeout
async function processImageWithTimeout(buffer, attachment, message) {
    return new Promise(async (resolve, reject) => {
        const timeout = setTimeout(() => {
            const timeoutError = new Error('Image processing timeout');
            timeoutError.details = {
                type: 'timeout',
                imageUrl: attachment.url,
                messageId: message.id,
                channelId: message.channel.id,
                channelName: message.channel.name,
                guildId: message.guild.id,
                guildName: message.guild.name,
                authorId: message.author.id,
                authorTag: message.author.tag,
                timestamp: new Date().toISOString()
            };
            reject(timeoutError);
        }, 15000);

        try {
            const img = await Jimp.read(buffer);
            const optimizedImg = await optimizeImage(img);
            
            // Try scanning with jsQR first
            const code = jsQR(
                optimizedImg.bitmap.data,
                optimizedImg.bitmap.width,
                optimizedImg.bitmap.height,
                { inversionAttempts: "dontInvert" } // Only try normal scan first
            );

            if (code) {
                clearTimeout(timeout);
                resolve({ type: 'jsQR', result: code.data });
                return;
            }

            // If no QR found, try with inversion
            const invertedCode = jsQR(
                optimizedImg.bitmap.data,
                optimizedImg.bitmap.width,
                optimizedImg.bitmap.height,
                { inversionAttempts: "onlyInvert" }
            );

            if (invertedCode) {
                clearTimeout(timeout);
                resolve({ type: 'jsQR', result: invertedCode.data });
                return;
            }

            // If still no QR found, try with qrcode-reader as backup
            const qr = new QrCode();
            await new Promise((resolveQr) => {
                qr.callback = (err, value) => {
                    if (err) {
                        resolveQr(null);
                    } else if (value?.result) {
                        resolveQr(value.result);
                    } else {
                        resolveQr(null);
                    }
                };
                qr.decode(optimizedImg.bitmap);
            }).then((result) => {
                clearTimeout(timeout);
                if (result) {
                    resolve({ type: 'qrcode-reader', result });
                } else {
                    resolve(null);
                }
            });

            // Explicitly clean up when done
            buffer = null;
        } catch (error) {
            clearTimeout(timeout);
            reject(error);
        }
    });
}

// Helper function to log QR details
async function logQR(client, messageData, attachmentBuffer, qrContent, serverConfig) {
    try {
        if (!serverConfig.qrScanner.logging.enabled || !serverConfig.qrScanner.logging.channelId) return;

        const logChannel = await client.channels.fetch(serverConfig.qrScanner.logging.channelId).catch(() => null);
        if (!logChannel) return;

        const attachmentFile = new AttachmentBuilder(attachmentBuffer, { name: 'qr_image.png' });

        // Get user's total deletions
        const stats = loadStats();
        const userStats = stats.servers[messageData.guild.id]?.users[messageData.author.id] || { deletions: 0 };
        const deletionText = userStats.deletions === 1 ? '1 total deletion' : `${userStats.deletions} total deletions`;

        const embed = new EmbedBuilder()
            .setColor(0xFF0000)
            .setTitle('QR Code Deleted')
            .addFields(
                { name: 'Author', value: `${messageData.author.bot ? messageData.author.tag : messageData.author.username}\n<@${messageData.author.id}>\n\`${messageData.author.id}\``, inline: true },
                { name: 'Channel', value: `${messageData.channel.name}\n<#${messageData.channel.id}>\n\`${messageData.channel.id}\``, inline: true }
            )
            .setImage('attachment://qr_image.png')
            .setFooter({ text: `This user has ${deletionText}` });

        // Add message content if it exists
        if (messageData.content.trim()) {
            embed.addFields({ name: 'Message Content', value: messageData.content });
        }

        // Add QR content and message link
        embed.addFields(
            { name: 'QR Content', value: qrContent },
            { name: 'Message Link', value: messageData.url }
        )
        .setTimestamp(messageData.timestamp);

        // Create button for copying user ID
        const button = new ButtonBuilder()
            .setCustomId(`userid_${messageData.author.id}`)
            .setLabel('User ID')
            .setStyle(ButtonStyle.Secondary);

        const row = new ActionRowBuilder().addComponents(button);

        try {
            await logChannel.send({ embeds: [embed], files: [attachmentFile], components: [row] });
        } catch (error) {
            if (error.code === 50013) {
                await client.handleError(messageData, error, 'QR Scanner - Missing Log Channel Permissions', {
                    type: 'qrScanner',
                    messageId: messageData.id,
                    channelId: messageData.channel.id,
                    guildId: messageData.guild.id,
                    authorId: messageData.author.id,
                    logChannelId: logChannel.id
                });
            } else {
                throw error;
            }
        }
    } catch (error) {
        console.error('Error logging QR:', error);
        if (client.handleError) {
            await client.handleError(messageData, error, 'QR Scanner - General Error', {
                type: 'qrScanner',
                messageId: messageData.id,
                channelId: messageData.channel.id,
                guildId: messageData.guild.id,
                authorId: messageData.author.id
            });
        }
    }
}

async function handleQRCode(message, qrResult, client, scanDuration, qrAttachmentBuffer) {
    try {
        // Check if we've already processed this message
        if (processedMessages.has(message.id)) {
            return;
        }
        
        // Mark message as processed
        processedMessages.set(message.id, Date.now());
        
        // Clean up old processed messages every 100 entries
        if (processedMessages.size > 100) {
            const now = Date.now();
            for (const [id, timestamp] of processedMessages.entries()) {
                if (now - timestamp > MESSAGE_CACHE_TTL) {
                    processedMessages.delete(id);
                }
            }
        }
        
        const guildId = message.guild.id;
        const config = guildHandler.loadServerConfig();
        const serverConfig = config.servers[guildId];

        if (!serverConfig?.qrScannerEnabled) return;

        // Cache necessary data before deletion
        const messageData = {
            content: message.content,
            author: {
                id: message.author.id,
                username: message.author.username,
                bot: message.author.bot,
                tag: message.author.tag
            },
            channel: {
                id: message.channel.id,
                name: message.channel.name
            },
            guild: {
                id: message.guild.id,
                name: message.guild.name
            },
            url: message.url,
            timestamp: message.createdTimestamp
        };

        // Send response message and delete QR message
        let responseMessage;
        try {
            if (qrResult.includes('https://link.squadbusters.com/en/JoinPinata')) {
                responseMessage = await message.channel.send({
                    content: `<@${message.author.id}> You got busted! Please use our <@1254477771875422330> bot to post invites. Need help? Check out <#1260149539675963403>!`,
                    allowedMentions: { users: [message.author.id] }
                });
            } else {
                responseMessage = await message.channel.send({
                    content: `<@${message.author.id}> You got busted! Posting QR codes is not permitted here.`,
                    allowedMentions: { users: [message.author.id] }
                });
            }

            await message.delete().catch(err => {
                console.error('Failed to delete message:', err);
            });

            // Delete response message after 15 seconds
            if (responseMessage) {
                setTimeout(() => {
                    responseMessage.delete().catch(err => {
                        console.error('Failed to delete response message:', err);
                    });
                }, 15000);
            }

            // Handle logging and stats in parallel
            Promise.all([
                // Log to channel if enabled and channel exists
                (serverConfig.qrScanner.logging?.enabled && serverConfig.qrScanner.logging?.channelId) ? 
                    (async () => {
                        await logQR(client, messageData, qrAttachmentBuffer, qrResult, serverConfig);
                    })() : Promise.resolve(),
                // Record deletion stats
                (async () => {
                    await recordDeletion(guildId, message.author.id);
                })()
            ]).catch(error => {
                console.error('Error in parallel processing:', error);
                if (client.handleError) {
                    client.handleError(message, error, 'QR parallel processing');
                }
            });

        } catch (error) {
            if (error.code !== 10008) {
                throw error;
            }
        }
    } catch (error) {
        client.handleError(message, error, 'QR code handling');
    }
}

// Improve cache management
function cleanupCaches() {
    const now = Date.now();
    
    // Clean up processedMessages cache
    for (const [id, timestamp] of processedMessages.entries()) {
        if (now - timestamp > MESSAGE_CACHE_TTL) {
            processedMessages.delete(id);
        }
    }
    
    // Clean up recentScans cache
    for (const [url, data] of recentScans.entries()) {
        if (now - data.timestamp > SCAN_CACHE_TTL) {
            recentScans.delete(url);
        }
    }
}

// Run cleanup every 5 minutes
setInterval(cleanupCaches, 5 * 60 * 1000);

module.exports = (client) => {
    // Initialize the guild handler
    guildHandler = require('./guildHandler')(client);

    // Handle button interactions
    client.on('interactionCreate', async interaction => {
        if (!interaction.isButton()) return;
        
        if (interaction.customId.startsWith('userid_')) {
            const userId = interaction.customId.split('_')[1];
            await interaction.reply({ 
                content: userId, 
                flags: MessageFlags.Ephemeral 
            });
        }
    });

    client.on('messageCreate', async (message) => {
        // Ignore bot messages
        if (message.author.bot) return;

        try {
            // Check if we've already processed this message
            if (processedMessages.has(message.id)) {
                return;
            }
            
            // Load server config
            const config = guildHandler.loadServerConfig();
            if (!config || !config.servers[message.guild.id]) return;

            const serverConfig = config.servers[message.guild.id];
            
            // Check if QR scanner is enabled for this server
            if (!serverConfig.qrScannerEnabled) return;

            // Check role filters
            const memberRoles = message.member.roles.cache;
            
            // Check if user has any whitelisted role - they can always post
            const hasWhitelistedRole = serverConfig.qrScanner.roles.whitelistIds?.some(id => memberRoles.has(id));
            if (hasWhitelistedRole) {
                return; // Allow the message to stay
            }

            // Check if user has any blacklisted role - their QRs get deleted
            const hasBlacklistedRole = serverConfig.qrScanner.roles.blacklistIds?.some(id => memberRoles.has(id));
            if (!hasBlacklistedRole) {
                return; // Allow the message to stay if not blacklisted
            }

            // Check channel filters
            if (serverConfig.qrScanner.channels.mode !== 'none') {
                const channelId = message.channel.id;
                const isListedChannel = serverConfig.qrScanner.channels.ids.includes(channelId);
                
                // In whitelist mode: allow listed channels
                // In blacklist mode: delete in listed channels
                if ((serverConfig.qrScanner.channels.mode === 'whitelist' && isListedChannel) ||
                    (serverConfig.qrScanner.channels.mode === 'blacklist' && !isListedChannel)) {
                    return; // Allow the message to stay
                }
            }

            // Check if message has attachments
            if (message.attachments.size > 0) {
                let qrFound = false;
                let qrAttachmentBuffer = null;
                let qrContent = null;
                
                // Loop through all attachments
                for (const [_, attachment] of message.attachments) {
                    // Check if it's an image
                    if (!attachment.contentType?.startsWith('image/')) continue;
                    
                    // If we already found a QR code in this message, stop processing
                    if (qrFound) break;

                    try {
                        // Check cache first
                        if (recentScans.has(attachment.url)) {
                            const cachedResult = recentScans.get(attachment.url);
                            if (Date.now() - cachedResult.timestamp < SCAN_CACHE_TTL) {
                                if (cachedResult.result) {
                                    qrFound = true;
                                    qrContent = cachedResult.result;
                                    
                                    // Download the QR image for logging
                                    try {
                                        qrAttachmentBuffer = await downloadBuffer(attachment.url);
                                    } catch (error) {
                                        console.error('Failed to cache attachment:', error);
                                    }
                                    
                                    await handleQRCode(message, qrContent, client, 0, qrAttachmentBuffer);
                                    break; // Exit the loop after handling
                                }
                                continue;
                            }
                            recentScans.delete(attachment.url);
                        }

                        // Download and process the image
                        const buffer = await downloadBuffer(attachment.url);
                        
                        try {
                            const result = await processImageWithTimeout(buffer, attachment, message);
                            
                            if (result) {
                                qrFound = true;
                                qrContent = result.result;
                                qrAttachmentBuffer = buffer; // Save the buffer of the image with the QR code
                                
                                console.log('QR Code detected!');
                                console.log('Message URL:', message.url);
                                console.log('Message content:', message.content);
                                console.log('Image URL:', attachment.url);
                                console.log('QR Code content:', result.result);
                                console.log('Channel:', message.channel.name);
                                console.log('Author:', message.author.tag);
                                console.log('-------------------');

                                // Cache the result
                                if (recentScans.size >= MAX_CACHE_SIZE) {
                                    const oldestKey = recentScans.keys().next().value;
                                    recentScans.delete(oldestKey);
                                }
                                recentScans.set(attachment.url, {
                                    result: result.result,
                                    timestamp: Date.now()
                                });

                                // Handle QR code
                                await handleQRCode(message, qrContent, client, 0, qrAttachmentBuffer);
                                break; // Exit the loop after handling
                            }
                        } catch (error) {
                            if (error.details?.type === 'timeout') {
                                console.error('Image processing timeout:', error.details);
                                await client.handleError(message, error, 'QR Scanner - Processing Timeout', {
                                    type: 'qrScanner',
                                    ...error.details
                                });
                            } else {
                                throw error;
                            }
                        }
                    } catch (error) {
                        if (!error.details?.type === 'timeout') {
                            console.error('Error in QR Scanner:', error);
                            await client.handleError(message, error, 'QR Scanner - General Error', {
                                type: 'qrScanner',
                                messageId: message.id,
                                channelId: message.channel.id,
                                guildId: message.guild.id,
                                authorId: message.author.id
                            });
                        }
                    }
                }
            }
        } catch (error) {
            console.error('Error in QR Scanner:', error);
            await client.handleError(message, error, 'QR Scanner - Critical Error', {
                type: 'qrScanner',
                messageId: message.id,
                channelId: message.channel.id,
                guildId: message.guild.id,
                authorId: message.author.id
            });
        }
    });

    // Export stats functions for the qrstats command
    return {
        loadStats,
        recordDeletion
    };
};
