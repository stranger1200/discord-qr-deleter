const fs = require('fs');
const chalk = require('chalk');
const { Routes } = require('discord-api-types/v9');
const { REST } = require('@discordjs/rest');
const { PermissionsBitField } = require('discord.js');
const AsciiTable = require('ascii-table');
const config = require('../config/botconfig.json');

const TOKEN = process.env.TOKEN;
const rest = new REST({ version: '9' }).setToken(TOKEN);

// Function to handle all slash command operations
module.exports = (client) => {
	// Set up the commands collection when the handler is first loaded
	client.slashCommands = new Map();

	// Handle slash command interactions
	client.on('interactionCreate', async interaction => {
		// Handle slash commands
		if (!interaction.isChatInputCommand() && !interaction.isContextMenuCommand()) return;

		const command = client.slashCommands.get(interaction.commandName);
		if (!command) return;

		try {
			// Check if command is in Admin category and verify permissions
			const commandPath = command.filePath || '';
			if (commandPath.includes('Admin')) {
				const { adminRoleId, adminGuildId } = config.permissions;
				const isAdmin = interaction.user.id === config.errorHandler.adminId;
				const hasAdminRole = interaction.guild.id === adminGuildId && interaction.member.roles.cache.has(adminRoleId);

				if (!isAdmin && !hasAdminRole) {
					return await interaction.reply({
						content: 'You do not have permission to use this command.',
						ephemeral: true
					});
				}
			}

			if (command.run) {
				await command.run(client, interaction);
			} else if (command.execute) {
				await command.execute(interaction);
			} else {
				throw new Error(`Command ${interaction.commandName} has no run or execute function`);
			}
		} catch (error) {
			await client.handleError(interaction, error, `command "${interaction.commandName}"`);
		}
	});

	// This function will be called by the ready event
	client.loadSlashCommands = async () => {
		try {
			// Create tables for both command types
			const slashTable = new AsciiTable()
				.setHeading('Slash Commands', 'Stats')
				.setBorder('|', '=', "0", "0");
			
			const contextTable = new AsciiTable()
				.setHeading('Context Menu', 'Stats')
				.setBorder('|', '=', "0", "0");

			// Register all slash commands
			const slashCommands = []; 
			const contextMenuCommands = [];

			// Load regular slash commands
			if (fs.existsSync('./Slash Commands/')) {
				const commandFolders = fs.readdirSync('./Slash Commands/').filter(folder => 
					folder !== 'Context Menu' && 
					fs.existsSync(`./Slash Commands/${folder}`) && 
					fs.lstatSync(`./Slash Commands/${folder}`).isDirectory()
				);

				for (const dir of commandFolders) {
					const commandFiles = fs.readdirSync(`./Slash Commands/${dir}`).filter(file => file.endsWith('.js'));

					for (const file of commandFiles) {
						try {
							const slashCommand = require(`../Slash Commands/${dir}/${file}`);
							if (!slashCommand?.name) {
								slashTable.addRow(file, '⛔');
								continue;
							}

							// Store the file path for permission checking
							slashCommand.filePath = `${dir}/${file}`;

							// Handle admin folder permissions - removing default admin requirement
							if (dir === 'Admin') {
								if (!slashCommand.data) {
									slashCommand.data = {
										name: slashCommand.name,
										description: slashCommand.description,
										type: slashCommand.type,
										options: slashCommand.options
									};
								}
							}

							// Prepare command for registration
							const commandData = {
								name: slashCommand.name,
								description: slashCommand.description,
								type: slashCommand.type,
								options: slashCommand.options ? slashCommand.options : null,
								default_permission: slashCommand.default_permission ? slashCommand.default_permission : null,
								default_member_permissions: slashCommand.default_member_permissions ? 
									PermissionsBitField.resolve(slashCommand.default_member_permissions).toString() : 
									null
							};

							slashCommands.push(commandData);
							client.slashCommands.set(slashCommand.name, slashCommand);
							slashTable.addRow(slashCommand.name, '✅');
							
							// Clear the require cache to ensure we get fresh command data
							delete require.cache[require.resolve(`../Slash Commands/${dir}/${file}`)];
						} catch (error) {
							slashTable.addRow(file, '⛔');
							console.error(`Error loading command ${file}:`, error);
						}
					}
				}
			}

			// Load context menu commands if the directory exists
			const contextMenuPath = './Slash Commands/Context Menu';
			if (fs.existsSync(contextMenuPath)) {
				const contextFiles = fs.readdirSync(contextMenuPath).filter(file => file.endsWith('.js'));
				
				for (const file of contextFiles) {
					try {
						const contextCommand = require(`../Slash Commands/Context Menu/${file}`);
						if (!contextCommand?.data?.name || !contextCommand?.data?.type) {
							contextTable.addRow(file, '⛔');
							continue;
						}

						contextMenuCommands.push(contextCommand.data);
						client.slashCommands.set(contextCommand.data.name, contextCommand);
						contextTable.addRow(contextCommand.data.name, '✅');
						
						// Clear the require cache for context menu commands too
						delete require.cache[require.resolve(`../Slash Commands/Context Menu/${file}`)];
					} catch (error) {
						contextTable.addRow(file, '⛔');
						console.error(`Error loading context menu command ${file}:`, error);
					}
				}
			}

			// Only display tables if they have content
			if (slashCommands.length > 0) {
				console.log(chalk.blue(slashTable.toString()));
			}
			if (contextMenuCommands.length > 0) {
				console.log(chalk.magenta(contextTable.toString()));
			}

			// Combine all commands for registration
			const allCommands = [...slashCommands, ...contextMenuCommands];

			// Only register if we have commands
			if (allCommands.length > 0) {
				await rest.put(
					process.env.GUILD_ID ?
					Routes.applicationGuildCommands(client.user.id, process.env.GUILD_ID) :
					Routes.applicationCommands(client.user.id), 
					{ body: allCommands }
				);
				console.log(chalk.green('Commands registered successfully!'));
			} else {
				console.log(chalk.yellow('No commands to register'));
			}
			
		} catch (error) {
			console.error(chalk.red('Error while handling slash commands:'));
			console.error(error);
		}
	};
};
