import { Collection } from "./Collection";
import * as Discord from "discord.js";
import { GenericBot } from "./GenericBot";
import { RichEmbed } from "./RichEmbed";

// seperate this out, does RichEmbed belong in here?  maybe just as Embed? 
// more logical structure?
// finish constructor and like interfaces

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

class Channel implements Channel.Like {
	public readonly channelId: string;
	public readonly reactions: Collection<string, Reactions>;
	public readonly reactor: Reactor;

	constructor(channelId: string, reactor: Reactor) {
		[this.channelId, this.reactions, this.reactor] = [channelId, new Collection<string, Reactions>(), reactor];
		Object.defineProperty(this, "reactor", { enumerable: false });
	}

	public clearReactionDestructor(messageId: string): void { this.reactions.get(messageId).clearDestruct(); }

	public delete(messageId: string): boolean {
		this.clearReactionDestructor(messageId);
		return this.reactions.delete(messageId);
	}

	public get(messageId: string): Reactions { return this.reactions.get(messageId); }
	public has(messageId: string): boolean { return this.reactions.has(messageId); }

	private reactionDestructor: (key: string) => Promise<void> = async (key: string): Promise<void> => {
		await this.reactions.get(key).clear();
		await this.reactions.delete(key);
	}

	public set(embed: RichEmbed): this {
		const key: string = embed.message.id;
		this.reactions.set(key, new Reactions(embed, this)).get(key).add().catch(console.error);
		this.setReactionDestructor(key);
		return this;
	}

	public setReactionDestructor(key: string): void { this.reactions.get(key).timer = this.reactor.bot.client.setTimeout((): Promise<void> => this.reactionDestructor(key).catch(console.error), Channel.messageTtlMinutes * 60 * 1000); }
}

namespace Channel {
	export const messageTtlMinutes: number = 5;

	export interface Constructor {
		prototype: Like;
	}

	export interface Like {
		readonly channelId: string;
		constructor: Constructor;
		readonly reactions: Collection<string, Reactions>;
		readonly reactor: Reactor;

		clearReactionDestructor(messageId: string): void;
		delete(messageId: string): boolean;
		get(messageId: string): Reactions;
		has(messageId: string): boolean;
		set(embed: RichEmbed): this;
		setReactionDestructor(key: string): void;
	}
}

class Reactions implements Reactions.Like {
	public readonly channel: Channel;
	public readonly embed: RichEmbed;
	public reactions: Collection<string, Discord.MessageReaction>;
	public enabled: boolean;
	public timer: NodeJS.Timer;

	constructor(embed: RichEmbed, channel: Channel) {
		[this.channel, this.embed, this.enabled] = [channel, embed, false];
		Object.defineProperty(this, "channel", { enumerable: false });
	}

	public async add() {
		this.reactions = new Collection<string, Discord.MessageReaction>();

		for (const emoticon of Reactions.emoticons)
			this.reactions.set(emoticon.key, await this.embed.message.react(emoticon.value));
		this.enabled = true;
	}

	public async clear() {
		this.enabled = false;
		this.embed.message.clearReactions();
	}

	public clearDestruct(): void { this.channel.reactor.bot.client.clearTimeout(this.timer); }
}

namespace Reactions {
	export const emoticons: Collection<string, string> = new Collection<string, string>();
	emoticons.set("prev", "\u{23ee}").set("next", "\u{23ed}").set("stop", "\u{1f6d1}").set("delete", "\u{1f5d1}");

	export interface Constructor {
		prototype: Like;
	}

	export interface Like {
		readonly channel: Channel;
		constructor: Constructor;
		readonly embed: RichEmbed;
		reactions: Collection<string, Discord.MessageReaction>;
		enabled: boolean;
		timer: NodeJS.Timer;

		add(): void;
		clear(): void;
		clearDestruct(): void;
	}
}

export { RichEmbed as Embed } from "./RichEmbed";