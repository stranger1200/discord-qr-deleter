# QR Deleter
*Note: This uses the latest version of discord.js (Version 14 currently)*

## Features
Deletes QR codes automiatcally from not staff-members of the server (checked by Manage Messages permission). Will log all deletions to bot console.

## How to Use
This bot begins working as soon as it has been added to a server. It scans all attachments and embedded images. It will also present this information alongside total server count and ping when tagged.

## Settings 
The bot has one confirgurable setting, which is to enable a logging channel for the bot whenever it deletes a message. You can use the slash command `/setlogchannel` and specify either a channel to set the logging channel or "none" to remove it. You will need the `Administrator` permission to see this command.

## Running the bot
If you would like to run this bot, follow these instructions. 

1. Download and install [Node.JS](https://nodejs.org/en/)
2. Download this repository as a zip.
3. Unzip the downloaded archive
4. In the root folder, create `env.json` and fill it with the following contents: 
```json
{
  "TOKEN": "your-bot-token-here"
}
```
5. Open a new terminal window at the root folder and run `npm install`
6. Run `node index.js` to start the bot. 
