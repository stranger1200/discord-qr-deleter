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
        "webhookUrl": "YOUR_WEBHOOK_URL_HERE",
        "adminId": "YOUR_ADMIN_ID_HERE"
    },
    "permissions": {
        "adminRoleId": "YOUR_ADMIN_ROLE_ID_HERE",
        "adminGuildId": "YOUR_ADMIN_GUILD_ID_HERE"
    }
}
```

Required values:
- `webhookUrl`: Discord webhook URL for error logging
- `adminId`: Your Discord user ID (for error notifications)
- `adminRoleId`: Role ID for admin command access (without admin permission)
- `adminGuildId`: Server ID where admin commands are allowed 

### serverconfig.json
Server configurations are automatically generated when using the `/initconfigs` command in a server. The file structure starts empty:
```json
{
    "servers": {}
}
```

### qrStats.json
This file automatically tracks QR code deletion statistics and starts empty:
```json
{
    "servers": {}
}
```

## Setup

1. Clone the repository
```bash
git clone [your-repo-url]
```

2. Install dependencies
```bash
npm install
```

3. Update the `.env` file with your bot token:
```env
DISCORD_TOKEN=your_bot_token_here
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
