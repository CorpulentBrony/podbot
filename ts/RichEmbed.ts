import * as Discord from "discord.js";
import { GenericBot } from "./GenericBot";

export class RichEmbed extends Discord.RichEmbed implements RichEmbed.Like {
	public readonly channel: GenericBot.Command.TextBasedChannel;
	public readonly embeds: Array<RichEmbed.Options>;
	public index: number;
	public message: Discord.Message;

	constructor(parsedCommand: GenericBot.Command.Parser.ParsedCommand, embeds: Array<RichEmbed.Options>);
	constructor(parsedCommand: GenericBot.Command.Parser.ParsedCommand, options?: RichEmbed.Options);
	constructor(parsedCommand: GenericBot.Command.Parser.ParsedCommand, embedsOrOptions: Array<RichEmbed.Options> | RichEmbed.Options = {}) {
		const options: RichEmbed.Options = Array.isArray(embedsOrOptions) ? embedsOrOptions[0] : embedsOrOptions;
		super(Object.assign({
			author: { icon_url: parsedCommand.requester.avatarURL, name: parsedCommand.requester.username },
			color: 0x673888,
			description: parsedCommand.args,
			title: parsedCommand.command
		}, options));
		this.channel = parsedCommand.channel;

		if (options.video)
			this["video"] = options.video;

		if (Array.isArray(embedsOrOptions)) 
			[this.embeds, this.index] = [embedsOrOptions, 1];
		Object.defineProperty(this, "channel", { enumerable: false });
		Object.defineProperty(this, "embeds", { enumerable: false });
		Object.defineProperty(this, "index", { enumerable: false, writable: true });
		Object.defineProperty(this, "message", { enumerable: false, writable: true });
	}

	public async delete(): Promise<Discord.Message> { return this.message = await this.message.delete(); }
	public next(): this { return this.set(this.index + 1); }
	public prev(): this { return this.set(this.index - 1); }

	public set(index: number): this {
		index = (index < 0) ? this.embeds.length + index : (index >= this.embeds.length) ? index - this.embeds.length : index;
		index = Math.min(this.embeds.length - 1, Math.max(0, index));
		this.index = index;
		return this.setOptions(this.embeds[this.index]);
	}

	public async send(): Promise<Discord.Message> {
		if (this["video"] && this["video"].url)
			return this.message = <Discord.Message>await this.channel.send(this["video"].url);
		return this.message = await this.channel.sendEmbed(this, undefined, { split: true });
	}

	private setOptions(options: RichEmbed.Options = {}): this {
		for (const option in options)
			if (RichEmbed.options.has(option))
				super[option] = options[option];
		return this;
	}

	public async update(): Promise<Discord.Message> {
		if (this["video"] && this["video"].url)
			return this.message = await this.message.edit(this["video"].url);
		return this.message = await this.message.edit(undefined, { embed: this });
	}
}

export namespace RichEmbed {
	export type Options = Discord.RichEmbedOptions;
	export const options: Set<string> = new Set<string>(["title", "description", "url", "timestamp", "color", "fields", "author", "thumbnail", "image", "video", "footer"]);
	export interface Constructor {
		prototype: Like;

		new?(parsedCommand: GenericBot.Command.Parser.ParsedCommand, options?: Options): Like;
	}

	export interface Like {
		readonly channel: GenericBot.Command.TextBasedChannel;
		constructor: Constructor;

		send(): Promise<Discord.Message>;
	}
}