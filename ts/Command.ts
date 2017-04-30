import { Collection as CommandCollection } from "./Collection";
import { Defaults as CommandDefaults } from "./Command/Defaults";
import { Parser as CommandParser } from "./Command/Parser";
import * as Discord from "discord.js";
import { GenericBot } from "./GenericBot";
import { RichEmbed } from "./RichEmbed";

export class Command implements Command.Like {
	public readonly bot: GenericBot;
	private readonly commands: Command.Collection;
	public readonly parser: Command.Parser;
	public readonly trigger: string;

	constructor(bot: GenericBot, { commands, trigger = "!" }: Command.Options) {
		[this.bot, this.commands, this.trigger] = [bot, commands, trigger];
		this.parser = new Command.Parser(this, { enabledCommands: (commands == undefined) ? Command.defaults : commands.keySet() });
	}

	public hookCommands(commands: Command.Collection = this.commands): this {
		if (commands != undefined) {
			for (const command of commands)
				if (!command.value.command && !command.value.alias)
					command.value.command = Command.Defaults[command.key];

			for (const command of commands) {
				if (command.value.alias)
					command.value.command = commands[command.value.alias].command;
				this.parser.on(command.key, (parsedCommand: Command.Parser.ParsedCommand): any => Promise.resolve(command.value.command.call(undefined, parsedCommand)).catch(console.error));
			}
		}
		return this;
	}
}

export namespace Command {
	export import Defaults = CommandDefaults;
	export import Parser = CommandParser;
	export const defaults: Set<string> = new Set<string>(Array.of("4chan", "db", "google", "ping", "topic", "uptime"));

	export type TextBasedChannel = Discord.DMChannel | Discord.GroupDMChannel | Discord.TextChannel;

	export interface Generic {
		// bot: GenericBot;
		// channel: GenericBot.Command.TextBasedChannel;
	}

	export interface HookOptions {
		alias?: string;
		command?: (parsedCommand: Parser.ParsedCommand) => any;
		default?: boolean;
	}

	export interface Constructor { new(bot: GenericBot, options: Options): Command; }

	export interface Like {
		bot: GenericBot;
		parser: Parser;
		trigger: string;

		hookCommands(commands?: Collection): this;
	}

	export interface Options {
		commands?: Collection;
		trigger: string;
	}

	export class Collection extends CommandCollection<string, HookOptions> {}
}