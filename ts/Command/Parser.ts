import { Command } from "../Command";
import { GenericBot } from "../GenericBot";
import * as Discord from "discord.js";
import * as Events from "events";

export class Parser extends Events.EventEmitter implements Parser.Like {
	public readonly command: Command;
	private readonly publishedEvents: Set<string>;

	constructor(command: Command, { enabledCommands }: Parser.Options) {
		super();
		this.command = command;
		this.publishedEvents = new Set<string>(enabledCommands);
	}

	public parse(message: Discord.Message): void {
		if (message.author.equals(this.command.bot.client.user))
			return;
		else if (!(message.channel instanceof Discord.DMChannel) && !(message.channel instanceof Discord.GroupDMChannel) && !(message.channel instanceof Discord.TextChannel))
			return;
		else if (!(message.channel instanceof Discord.DMChannel) && !message.content.startsWith(this.command.trigger))
			return;
		const parsed: Parser.ParsedCommand = { args: undefined, bot: this.command.bot, channel: <Command.TextBasedChannel>message.channel, command: undefined, message, requester: message.author };
		const triggerLength: number = (parsed.channel instanceof Discord.DMChannel) ? 0 : this.command.trigger.length;
		parsed.command = message.content.slice(triggerLength).split(" ")[0].toLowerCase();
		parsed.args = message.content.slice(parsed.command.length + triggerLength + 1).replace(/[^\S ]/g, " ").replace(/\s{2,}/g, " ").trim();

		if (this.publishedEvents.has("any"))
			super.emit("any", parsed);

		if (this.publishedEvents.has(parsed.command))
			super.emit(parsed.command, parsed);
	}
}

export namespace Parser {
	export interface Constructor {
		prototype: Like;

		new?(command: Command, options: Options): Like;
	}

	export interface Like {
		readonly command: Command;
		constructor: Constructor;

		parse(message: Discord.Message): void;
	}

	export interface Options {
		enabledCommands?: Iterable<string>;
	}

	export interface ParsedCommand {
		args: string;
		bot: GenericBot;
		channel?: Command.TextBasedChannel;
		command: string;
		message: Discord.Message;
		requester?: Discord.User;
	}
}