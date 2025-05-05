# Discord QR Code Scanner Bot

A powerful Discord bot designed to scan, detect, and manage QR codes in messages, with comprehensive server configuration options and detailed statistics tracking.

## Features

- **QR Code Detection**: Automatically scans images for QR codes
- **Flexible Configuration**: Per-server settings for QR code handling
- **Role-based Access Control**: Whitelist and blacklist roles for QR code posting
- **Channel Management**: Configure which channels to monitor
- **Detailed Statistics**: Track QR code deletions and user activity
- **Error Handling**: Comprehensive error logging and timeout management
- **Admin Commands**: Full suite of administrative tools

## Commands

### Admin Commands
- `/qrstats [user]` - View QR code deletion statistics
  - Without user parameter: Shows server-wide stats and top 5 users
  - With user parameter: Shows detailed stats for specific user
  - Displays total deletions and last deletion timestamp
  
- `/initconfigs` - Initialize server configurations
  - Creates default configuration for your server
  - Sets up basic QR scanning settings
  - Must be run before using other commands
  
- `/toggleqr` - Toggle QR scanning functionality
  - Enables/disables QR scanning for the entire server
  - Useful for temporary disabling without losing settings
  
- `/qrlog` - Configure QR code logging
  - Set up a logging channel for QR code deletions
  - Configure what information gets logged
  - Enable/disable logging functionality
  
- `/qrfilter` - Manage role and channel filters
  - Set up role whitelist/blacklist
  - Configure channel restrictions
  - Choose between whitelist/blacklist mode for channels
  
- `/ping` - Check bot latency and status

## Configuration Files

### botconfig.json
```json
{
    "errorHandler": {
        "webhookUrl": "YOUR_WEBHOOK_URL_HERE",  // Discord webhook for error logging
        "adminId": "YOUR_ADMIN_ID_HERE"         // Bot admin's Discord user ID
    },
    "permissions": {
        "adminRoleId": "YOUR_ADMIN_ROLE_ID_HERE",  // Role that can use admin commands
        "adminGuildId": "YOUR_ADMIN_GUILD_ID_HERE"  // Server where admin role is valid
    }
}
```

### serverconfig.json
```json
{
    "servers": {
        "EXAMPLE_SERVER_ID": {
            "qrScannerEnabled": true,  // Master toggle for QR scanning
            "qrScanner": {
                "logging": {
                    "enabled": false,              // Toggle logging
                    "channelId": "CHANNEL_ID"      // Where to send QR deletion logs
                },
                "roles": {
                    "whitelistIds": [],  // Users with these roles can always post QR codes
                    "blacklistIds": []   // Users with these roles get QR codes deleted
                },
                "channels": {
                    "mode": "none",   // none/whitelist/blacklist
                    "ids": []        // Channel IDs to whitelist/blacklist
                }
            }
        }
    }
}
```

### qrStats.json
This file automatically tracks QR code deletion statistics:
- Per-server statistics
- Per-user deletion counts
- Timestamps of last deletions
- Total deletion counts

## Setup

1. Clone the repository
```bash
git clone [your-repo-url]
```

2. Install dependencies
```bash
npm install
```

3. Create a `.env` file with your bot token:
```env
DISCORD_TOKEN=your_token_here
```

4. Configure `config/botconfig.json` with your settings (see Configuration Files section)

5. Start the bot
```bash
node index.js
```

## Features in Detail

### QR Code Detection
- Automatically scans all images posted in monitored channels
- Supports multiple QR codes in a single image
- 15-second timeout protection for large images
- Detailed error logging for failed scans

### Role Management
- Whitelist Mode: Users with whitelisted roles can always post QR codes
- Blacklist Mode: QR codes from users with blacklisted roles are automatically deleted
- Role hierarchy support

### Channel Management
- Whitelist Mode: Only scan specified channels
- Blacklist Mode: Scan all channels except specified ones
- None Mode: Scan all channels

### Error Handling
- Comprehensive error logging through webhooks
- Automatic admin notifications for critical errors
- Detailed context in error messages
- Timeout protection for image processing

## Requirements

- Node.js 16.9.0 or higher
- Discord.js v14
- A Discord bot token
- Required permissions:
  - Read Messages
  - Send Messages
  - Manage Messages
  - View Channels
  - Read Message History

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details. 