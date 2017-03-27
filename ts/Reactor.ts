import { Channel } from "./Reactor/Channel";
import { Collection } from "./Collection";
import * as Discord from "discord.js";
import { GenericBot } from "./GenericBot";
import { Reactions } from "./Reactor/Reactions";
import { RichEmbed } from "./RichEmbed";

export class Reactor implements Reactor.Like {
	public readonly bot: GenericBot;
	public readonly channels: Collection<string, Channel>;

	constructor(bot: GenericBot) { [this.bot, this.channels] = [bot, new Collection<string, Channel>()]; }

	public add(embed: RichEmbed): this {
		const key: string = embed.message.channel.id;

		if (!this.channels.has(key))
			this.channels.set(key, new Channel(key, this));
		this.channels.get(key).set(embed);
		Object.defineProperty(this, "bot", { enumerable: false });
		return this;
	}

	public onMessageDelete(message: Discord.Message): void {
		if (!message || !this.channels.has(message.channel.id) || !this.channels.get(message.channel.id).has(message.id))
			return;
		this.channels.get(message.channel.id).delete(message.id);
	}

	public onMessageDeleteBulk(messages: Discord.Collection<string, Discord.Message>): void {
		if (!messages)
			return;
		messages.array().forEach((message: Discord.Message): void => this.onMessageDelete(message));
	}

	private async onMessageReaction(type: "add" | "remove", reaction: Discord.MessageReaction, user?: Discord.User): Promise<Discord.Message> {
		if (!reaction || !reaction.message || !this.channels.has(reaction.message.channel.id) || !this.channels.get(reaction.message.channel.id).has(reaction.message.id) || !Reactions.emoticons.some((emoticon: string): boolean => emoticon === reaction.emoji.name))
			return undefined;
		const channel: Channel = this.channels.get(reaction.message.channel.id);
		const reactions: Reactions = channel.get(reaction.message.id);
		const users: Discord.Collection<string, Discord.User> = await reaction.fetchUsers();

		if (!reactions.enabled || type === "add" && reaction.users.array().length === 1)
			return undefined;
		let result: Discord.Message;

		switch (reaction.emoji.name) {
			case Reactions.emoticons.get("next"):
				result = await reactions.embed.next().update();
				break;
			case Reactions.emoticons.get("prev"):
				result = await reactions.embed.prev().update();
				break;
			case Reactions.emoticons.get("stop"):
				await reactions.clear();
				return reactions.embed.message;
			case Reactions.emoticons.get("delete"):
				return reactions.embed.message.delete();
		}
		channel.clearReactionDestructor(reaction.message.id);
		channel.setReactionDestructor(reaction.message.id);
		return result;
	}

	public onMessageReactionAdd(reaction: Discord.MessageReaction, user?: Discord.User): void { this.onMessageReaction("add", reaction, user).catch(console.error); }
	public onMessageReactionRemove(reaction: Discord.MessageReaction, user?: Discord.User): void { this.onMessageReaction("remove", reaction, user).catch(console.error); }
}

export namespace Reactor {
	export interface Command {
		bot: GenericBot;
		channel: GenericBot.Command.TextBasedChannel;
		embeds: Array<RichEmbed.Options>;
		parsedCommand: GenericBot.Command.Parser.ParsedCommand;

		send(): Promise<RichEmbed>;
	}

	export interface Constructor {
		prototype: Like;
	}

	export interface Like {
		readonly bot: GenericBot;
		readonly channels: Collection<string, Channel>;
		constructor: Constructor;

		add(embed: RichEmbed): this;
		onMessageDelete(message: Discord.Message): void;
		onMessageDeleteBulk(messages: Discord.Collection<string, Discord.Message>): void;
		onMessageReactionAdd(reaction: Discord.MessageReaction, user?: Discord.User): void;
		onMessageReactionRemove(reaction: Discord.MessageReaction, user?: Discord.User): void;
	}
}