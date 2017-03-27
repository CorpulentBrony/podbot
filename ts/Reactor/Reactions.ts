import { Channel } from "./Channel";
import { Collection } from "../Collection";
import * as Discord from "discord.js";
import { RichEmbed } from "../RichEmbed";

export class Reactions implements Reactions.Like {
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

export namespace Reactions {
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