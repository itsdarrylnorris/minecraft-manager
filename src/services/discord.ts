import { Client, Collection, Message, WebhookClient } from 'discord.js'
import fs from 'fs'
import { readdir } from 'fs/promises'
import os from 'os'
import { executeShellScript, logging } from '../utils'
require('dotenv').config()

//TODO: Add the appropriate messages everywhere
// TODO: Fix interfaces

/**
 * Interface of Discord.
 */
interface DiscordOptionsInterface {
  message: Message

  // Webhook string
  discord: MinecraftDiscordInterface | undefined

  // Path of the location where all the files lives
  path: string | undefined

  // Path of all Minecraft Log Files
  log_file: string | undefined

  // Strings of whatever we are going to be posting at
  strings: DiscordStringsInterface
}

/**
 * Interface of Discord, it contains any information related to discord.
 */
interface MinecraftDiscordInterface {
  webhook: string | undefined
  discord_info: WebhookInterface
}

interface WebhookInterface {
  send: any
  id: string
  token: string
}

interface DiscordStringsInterface {
  sending_discord_message: string | undefined
}

/**
 * Discord
 */
class Discord {
  // Options config
  private options: DiscordOptionsInterface | any

  private client: Client

  private discord_screen_name: string = 'Discord'

  /**
   * Constructor
   * @param options
   */
  constructor(options: DiscordOptionsInterface | any) {
    const client = new Client()
    client.commands = new Collection()
    this.client = client
    if (options && options.path) {
      this.options = options
    } else {
      this.options = {
        path: process.env.OPTIONS_PATH || os.homedir() + '/MinecraftServer/',
        log_file: process.env.LOG_FILE || os.homedir() + '/MinecraftServer/discord.log',
        whitelist_file: process.env.LOG_FILE || os.homedir() + '/MinecraftServer/whitelist.json',
        old_whitelist_file: process.env.LOG_FILE || os.homedir() + '/MinecraftServer/old-whitelist.json',
        discord_client:
          process && process.env && process.env.DISCORD_CLIENT ? process.env.DISCORD_CLIENT.toString() : '',
        discord_role: process && process.env && process.env.DISCORD_ROLE ? process.env.DISCORD_ROLE.toString() : '',
        discord_command:
          process && process.env && process.env.DISCORD_COMMAND ? process.env.DISCORD_COMMAND.toString() : '',
        discord_id: process && process.env && process.env.DISCORD_ID ? process.env.DISCORD_ID.toString() : '',
        discord_token: process && process.env && process.env.DISCORD_TOKEN ? process.env.DISCORD_TOKEN.toString() : '',
        strings: {
          sending_discord_message: process.env.options_sending_discord_message || 'Sending this message to Discord.',
          error_discord_message:
            process.env.options_error_discord_message || 'Something went wrong when sending the Discord message.',
          successful_command: process.env.options_successful_command || 'Sent command successfully.',
          error_command: process.env.options_error_command || 'There was an error when trying to execute that command.',
          invalid_permission_command:
            process.env.options_invalid_permission_command || 'You are not allowed to use this command.',
          help_command_message:
            process.env.options_help_command_message ||
            'Available Commands: mbm start server, mbm stop server, mbm restart server, mbm help, mbm add [Gamertag], mbm remove [Gamertag]',
          command_entered_message: process.env.options_command_entered_message || 'Command entered by: ',
          successful_added_user_message:
            process.env.options_successful_added_user_message ||
            ' has been added to the server. Restart the server to complete the adding process.',
          successful_removed_user_message:
            process.env.options_successful_removed_user_message ||
            ' has been removed from the server. Restart the server to complete the removal process.',
          error_with_reading_file: process.env.options_error_with_reading_file || 'Could not read whitelist.json file.',
          start_command: 'start server',
          stop_command: 'stop server',
          restart_command: 'restart server',
          help_command: 'help',
          add_command: 'add',
          remove_command: 'remove',
        },
      }
    }
  }

  /**
   * Sends a message to Discord.
   *
   * @param string String message for Discord.
   */
  async sendMessageToDiscord(string: string): Promise<void> {
    logging(this.options.strings.sending_discord_message, string)
    try {
      const webhook: WebhookInterface = new WebhookClient(this.options.discord_id, this.options.discord_token)
      await webhook.send(`[${os.hostname()}] ${string}`)
    } catch (error) {
      logging(this.options.strings.error_discord_message, error)
    }
  }

  /**
   * Start Discord
   */
  async startDiscord() {
    try {
      // Wakes up Discord Bot
      this.startBot()

      // Starts the Discord commands
      await this.startCommands()

      // Logging into Discord Client
      await this.loginClient()
    } catch (e) {
      logging('Error with starting Discord', e)
    }
  }

  /**
   * Wakes up Bot
   */
  startBot() {
    this.client.once('ready', () => {
      executeShellScript(
        `cd ${this.options.path} && screen -L -Logfile discord.log -dmS ${this.discord_screen_name} /bin/zsh -c "LD_LIBRARY_PATH=${this.options.path} ${this.options.log_file}"`,
      )
      logging('Bot is online.')
    })
  }

  /**
   * Starts the Discord commands
   */
  async startCommands() {
    this.client.on('message', async (message: Message) => {
      if (message.author.bot) return

      const command: string = message.content.toLowerCase()
      let author: string = message.author.username
      let splitDiscordRole: string = this.options.discord_role.split(',')

      // Command 1: Start Server Command
      // mbm start server
      if (
        command === `${this.options.discord_command} ${this.options.strings.start_command}` &&
        message.member!.roles.cache.some((r: { name: string }) => splitDiscordRole.includes(r.name))
      ) {
        try {
          logging(this.options.strings.command_entered_message + author, command)
          executeShellScript(`cd ${this.options.path} && ${this.options.discord_command} -s`)
          message.channel.send(this.options.strings.successful_command)
        } catch (error) {
          logging(error)
          message.channel.send(this.options.strings.error_command)
        }
      }
      // Command 2: Stop Server Command
      // mbm stop server
      else if (
        command === `${this.options.discord_command} ${this.options.strings.stop_command}` &&
        message.member!.roles.cache.some((r: { name: string }) => splitDiscordRole.includes(r.name))
      ) {
        logging(this.options.strings.command_entered_message + author, command)
        executeShellScript(`cd ${this.options.path} && ${this.options.discord_command} -st`)
        try {
          message.channel.send(this.options.strings.successful_command)
        } catch (error) {
          logging(error)
          message.channel.send(this.options.strings.error_command)
        }
      }
      // Command 3: Restart Server Command
      // mbm restart server
      else if (
        command === `${this.options.discord_command} ${this.options.strings.restart_command}` &&
        message.member!.roles.cache.some((r: { name: string }) => splitDiscordRole.includes(r.name))
      ) {
        logging(this.options.strings.command_entered_message + author, command)
        executeShellScript(`cd ${this.options.path} && ${this.options.discord_command} -r`)
        try {
          message.channel.send(this.options.strings.successful_command)
        } catch (error) {
          logging(error)
          message.channel.send(this.options.strings.error_command)
        }
      }
      // Command 4: Help Command - List available Discord commands
      // mbm help
      else if (
        command === `${this.options.discord_command} ${this.options.strings.help_command}` &&
        message.member!.roles.cache.some((r: { name: string }) => splitDiscordRole.includes(r.name))
      ) {
        try {
          message.channel.send(this.options.strings.help_command_message)
        } catch (error) {
          logging(error)
          message.channel.send(this.options.strings.error_command)
        }
      }
      // Command 5: Add user to server
      // mbm add [Gamertag]
      else if (
        command.includes(this.options.discord_command && this.options.strings.add_command) &&
        message.member!.roles.cache.some((r: { name: string }) => splitDiscordRole.includes(r.name))
      ) {
        let split: string[] = message.toString().split(' ')
        let splitCommand: string = split && split[0] ? split[0] : ''
        let splitAdd: string = split && split[1] ? split[1] : ''
        let splitUser: string = split && split[2] ? split[2] : ''

        if (splitCommand && splitAdd && splitUser) {
          logging(this.options.strings.command_entered_message + author, message.content)
          try {
            let date: Date = new Date()

            // Backup whitelist.json file
            executeShellScript(
              `cd ${this.options.path} && git add ${
                this.options.whitelist_file
              } && git commit -m "Automatic Backup: ${date.toISOString()}" && git push`,
            )

            // Deletes old-whitelist.json file if available.
            let files: Array<string> = await readdir(this.options.path)
            if (files.filter((item) => item.includes(this.options.old_whitelist_file))) {
              executeShellScript(`cd ${this.options.download_path} && ` + `rm ${this.options.old_whitelist_file}`)
            }

            // Make a copy of the whitelist.json file, renamed as old-whitelist.json file
            executeShellScript(
              `cd ${this.options.path} && ` + `cp ${this.options.whitelist_file} ${this.options.old_whitelist_file}`,
            )

            let whitelistTable = [{}]
            let whitelistFile: string = this.options.whitelist_file
            let ignoresPlayerLimit: boolean = false
            let name: string = splitUser
            // @TODO: Use the actual xuid
            let xuid = '2535428286950419'

            // Read whitelist.json file and edit it if it exists
            fs.readFile(this.options.whitelist_file, 'utf8', function readFileCallback(this: any, error, data) {
              if (error) {
                logging(this.options.strings.error_with_reading_file, error)
                message.channel.send(this.options.strings.error_command)
              } else {
                whitelistTable = JSON.parse(data)
                whitelistTable.push({ ignoresPlayerLimit, name, xuid })
                let whitelistJSON: string = JSON.stringify(whitelistTable)
                fs.writeFile(whitelistFile, whitelistJSON, 'utf8', (error) => {
                  if (error) {
                    message.channel.send(this.options.strings.error_command)
                    throw error
                  }
                })
              }
            })
          } catch (error) {
            logging(error)
            message.channel.send(this.options.strings.error_command)
          }
        } else {
          logging(author + ' ' + this.options.strings.error_command)
          message.channel.send(this.options.strings.error_command)
        }
      }
      // Command 6: Remove user to server
      // mbm remove [Gamertag]
      else if (
        command.includes(this.options.discord_command && this.options.strings.remove_command) &&
        message.member!.roles.cache.some((r: { name: string }) => splitDiscordRole.includes(r.name))
      ) {
        let split: string[] = message.toString().split(' ')
        let splitCommand: string = split && split[0] ? split[0] : ''
        let splitRemove: string = split && split[1] ? split[1] : ''
        let splitUser: string = split && split[2] ? split[2] : ''

        if (splitCommand && splitRemove && splitUser) {
          logging(this.options.strings.command_entered_message + author, message.content)
          try {
            let date: Date = new Date()

            // Backup whitelist.json file
            executeShellScript(
              `cd ${this.options.path} && git add ${
                this.options.whitelist_file
              } && git commit -m "Automatic Backup: ${date.toISOString()}" && git push`,
            )

            // Deletes old-whitelist.json file if available.
            let files: Array<string> = await readdir(this.options.path)
            if (files.filter((item) => item.includes(this.options.old_whitelist_file))) {
              executeShellScript(`cd ${this.options.download_path} && ` + `rm ${this.options.old_whitelist_file}`)
            }

            // Make a copy of the whitelist.json file, renamed as old-whitelist.json file
            executeShellScript(
              `cd ${this.options.path} && ` + `cp ${this.options.whitelist_file} ${this.options.old_whitelist_file}`,
            )

            let whitelistFile: string = this.options.whitelist_file

            // Read whitelist.json file and edit it if it exists
            fs.readFile(this.options.whitelist_file, 'utf8', function readFileCallback(this: any, error, data) {
              if (error) {
                logging(this.options.strings.error_with_reading_file, error)
              } else {
                let whitelistData = JSON.parse(data)
                let userNames: string[] = []

                whitelistData.forEach(function (whitelistData: { name: string }) {
                  userNames.push(whitelistData.name)
                })

                if (userNames.includes(splitUser)) {
                  let updatedData: string[] = whitelistData.filter(
                    (whitelistData: { name: string }) => whitelistData.name !== splitUser,
                  )
                  let whitelistJSON: string = JSON.stringify(updatedData)

                  fs.writeFile(whitelistFile, whitelistJSON, 'utf8', (error) => {
                    if (error) {
                      message.channel.send(this.options.strings.error_command)
                      throw error
                    }
                  })
                }
              }
            })
          } catch (error) {
            logging(error)
            message.channel.send(this.options.strings.error_command)
          }
        } else {
          logging(author + ' ' + this.options.strings.error_command)
          message.channel.send(this.options.strings.error_command)
        }
      }
      // Send message back to channel with an error
      else {
        message.reply(this.options.strings.invalid_permission_command)
      }
    })
  }

  /**
   * Logging into Discord Client
   */
  async loginClient() {
    this.client.login(this.options.discord_client)
  }
}
export default Discord
