import * as Decorators from "./Decorators";
import * as Discord from "discord.js";
import { GenericBot } from "./GenericBot";

// for some reason, RichEmbed is deprecated from Discord so I need to re-build this class basically to retain the lost functionality
export class RichEmbed implements RichEmbed.Options {
	public author?: RichEmbed.Options.Author;
	public readonly channel: GenericBot.Command.TextBasedChannel;
	public color?: number | string;
	public description?: string;
	public readonly embeds: Array<RichEmbed.Options>;
	public fields: Array<RichEmbed.Options.Field>;
	public footer?: RichEmbed.Options.Footer;
	public image?: RichEmbed.Options.Image;
	public index: number;
	public message?: Promise<Discord.Message>;
	public provider?: RichEmbed.Options.Provider;
	public thumbnail?: RichEmbed.Options.Image;
	public timestamp?: Date;
	public title?: string;
	public url?: string;
	public video?: RichEmbed.Options.Video;

	private static forceSingleMessage(message: Discord.Message | Array<Discord.Message>): Promise<Discord.Message> { return Promise.resolve(Array.isArray(message) ? message[0] : message); }

	private static getDefaultOptions(parsedCommand: GenericBot.Command.Parser.ParsedCommand): RichEmbed.Options {
		return {
			author: { iconURL: parsedCommand.requester.avatarURL, name: parsedCommand.requester.username },
			color: RichEmbed.defaultColor,
			description: parsedCommand.args,
			title: parsedCommand.command
		};
	}

	constructor(parsedCommand: GenericBot.Command.Parser.ParsedCommand, embeds: Array<RichEmbed.Options>);
	constructor(parsedCommand: GenericBot.Command.Parser.ParsedCommand, options?: RichEmbed.Options);
	constructor(parsedCommand: GenericBot.Command.Parser.ParsedCommand, embedsOrOptions: Array<RichEmbed.Options> | RichEmbed.Options = {}) {
		const options: RichEmbed.Options = Array.isArray(embedsOrOptions) ? embedsOrOptions[0] : embedsOrOptions;
		this.setOptions(Object.assign(RichEmbed.getDefaultOptions(parsedCommand), options));
		this.privateDefine("channel", parsedCommand.channel);

		if (Array.isArray(embedsOrOptions))
			this.privateDefine("embeds", embedsOrOptions).privateDefine("index", 0, true);
		this.privateDefine("message", undefined, true);
	}

	public addField(name: string, value: string, inline: boolean = false): this {
		this.fields.push({ inline, name, value: value.slice(0, 1023) });
		return this;
	}

	private configureFields(): this {
		if (this.fields === undefined)
			this.fields = new Array<RichEmbed.Options.Field>();
		else
			this.fields = this.fields.map<RichEmbed.Options.Field>((field: RichEmbed.Options.Field): RichEmbed.Options.Field => Object.assign(field, { value: field.value.slice(0, 1023) }));
		return this;
	}

	public async delete(): Promise<Discord.Message> { return this.message = (await this.message).delete(); }
	public next(): this { return this.set(this.index + 1); }
	public prev(): this { return this.set(this.index - 1); }

	private privateDefine(property: keyof this, value: any, writable: boolean = false): this { return Object.defineProperty(this, property, { value, writable }); }

	public async send(): Promise<Discord.Message> {
		if (this.video !== undefined && this.video.url !== undefined)
			return this.message = RichEmbed.forceSingleMessage(await this.channel.send(this.video.url));
		return this.message = RichEmbed.forceSingleMessage(await this.channel.send(undefined, { disableEveryone: true, embed: this, split: true }));
	}

	public set(index: number): this {
		index = (index < 0) ? this.embeds.length + index : (index >= this.embeds.length) ? index - this.embeds.length : index;
		index = Math.min(this.embeds.length - 1, Math.max(0, index));
		this.index = index;
		return this.setOptions(this.embeds[this.index]);
	}

	private setOptions(options: RichEmbed.Options = {}): this {
		for (const option of RichEmbed.options) {
			if (Object.getOwnPropertyDescriptor(this, option) !== undefined)
				delete this[option];
			const descriptor: PropertyDescriptor = Object.getOwnPropertyDescriptor(options, option);

			if (descriptor !== undefined && descriptor.value !== undefined)
				this[option] = descriptor.value;
		}
		return this.configureFields();
	}

	public async update(): Promise<Discord.Message> {
		if (this.video !== undefined && this.video.url !== undefined)
			return this.message = (await this.message).edit(this.video.url);
		return this.message = (await this.message).edit(undefined, { embed: this });
	}
}

export namespace RichEmbed {
	export interface Options {
		author?: Options.Author;
		color?: number | string;
		description?: string;
		fields?: Array<Options.Field>;
		footer?: Options.Footer;
		image?: Options.Image;
		provider?: Options.Provider;
		thumbnail?: Options.Image;
		timestamp?: Date;
		title?: string;
		url?: string;
		video?: Options.Video;
	}

	export const defaultColor: number = 0x673888;
	export const options: Set<keyof Options> = new Set<keyof Options>(["author", "color", "description", "fields", "footer", "image", "provider", "thumbnail", "timestamp", "title", "url", "video"]);

	export namespace Options {
		export interface Author extends Icon, Named { url?: string; }

		interface Dimensions {
			height: number;
			width: number;
		}

		export interface Field extends Named {
			inline?: boolean;
			value: string;
		}

		export interface Footer extends Icon { text?: string; }

		interface Icon {
			iconURL?: string;
			proxyIconURL?: string;
		}

		export interface Image extends Partial<Dimensions> {
			proxyURL?: string;
			url: string;
		}

		interface Named { name: string; }

		export interface Provider extends Partial<Named> { url?: string; }
		export interface Video extends Dimensions { url: string; }
	}
}

// Object.defineProperty() is used in this class because the parent class Discord.RichEmbed would otherwise send invalid properties to the Discord server, resulting in errors.
// export class RichEmbed extends Discord.RichEmbed implements RichEmbed.Like {
// 	public readonly channel: GenericBot.Command.TextBasedChannel;
// 	public readonly embeds: Array<RichEmbed.Options>;
// 	public index: number;
// 	public message: Discord.Message;

// 	private static forceSingleMessage(message: Discord.Message | Array<Discord.Message>): Discord.Message { return Array.isArray(message) ? message[0] : message; }

// 	constructor(parsedCommand: GenericBot.Command.Parser.ParsedCommand, embeds: Array<RichEmbed.Options>);
// 	constructor(parsedCommand: GenericBot.Command.Parser.ParsedCommand, options?: RichEmbed.Options);
// 	constructor(parsedCommand: GenericBot.Command.Parser.ParsedCommand, embedsOrOptions: Array<RichEmbed.Options> | RichEmbed.Options = {}) {
// 		const options: RichEmbed.Options = Array.isArray(embedsOrOptions) ? embedsOrOptions[0] : embedsOrOptions;
// 		super(Object.assign({
// 			author: { icon_url: parsedCommand.requester.avatarURL, name: parsedCommand.requester.username },
// 			color: 0x673888,
// 			description: parsedCommand.args,
// 			title: parsedCommand.command
// 		}, options));
// 		Object.defineProperty(this, "channel", { enumerable: false, value: parsedCommand.channel });

// 		if (options.video)
// 			this["video"] = options.video;

// 		if (Array.isArray(embedsOrOptions))
// 			Object.defineProperties(this, {
// 				embeds: { enumerable: false, value: embedsOrOptions },
// 				index: { enumerable: false, value: 0, writable: true }
// 			});
// 		Object.defineProperty(this, "message", { enumerable: false, writable: true });
// 	}

// 	public async delete(): Promise<Discord.Message> { return this.message = await this.message.delete(); }
// 	public next(): this { return this.set(this.index + 1); }
// 	public prev(): this { return this.set(this.index - 1); }

// 	public async send(): Promise<Discord.Message> {
// 		if (this["video"] && this["video"].url)
// 			return this.message = <Discord.Message>await this.channel.send(this["video"].url);
// 		return this.message = RichEmbed.forceSingleMessage(await this.channel.send(undefined, { embed: this, split: true }));
// 	}

// 	public set(index: number): this {
// 		index = (index < 0) ? this.embeds.length + index : (index >= this.embeds.length) ? index - this.embeds.length : index;
// 		index = Math.min(this.embeds.length - 1, Math.max(0, index));
// 		this.index = index;
// 		return this.setOptions(this.embeds[this.index]);
// 	}

// 	private setOptions(options: RichEmbed.Options = {}): this {
// 		for (const option of RichEmbed.options) {
// 			if (this[option])
// 				delete this[option];

// 			if (options[option])
// 				this[option] = options[option];
// 		}
// 		return this;
// 	}

// 	public async update(): Promise<Discord.Message> {
// 		if (this["video"] && this["video"].url)
// 			return this.message = await this.message.edit(this["video"].url);
// 		return this.message = await this.message.edit(undefined, { embed: this });
// 	}
// }

// export namespace RichEmbed {
// 	export type Options = Discord.RichEmbedOptions;
// 	export const options: Set<string> = new Set<string>(["title", "description", "url", "timestamp", "color", "fields", "author", "thumbnail", "image", "video", "footer"]);

// 	export interface Like extends MessageEmbed {
// 		readonly channel: GenericBot.Command.TextBasedChannel;
// 		readonly embeds: Array<RichEmbed.Options>;
// 		index: number;
// 		message: Discord.Message;

// 		delete(): Promise<Discord.Message>;
// 		next(): this;
// 		prev(): this;
// 		send(): Promise<Discord.Message>;
// 		set(index: number): this;
// 		update(): Promise<Discord.Message>;
// 	};
// }

// 	declare class MessageEmbed {
// 		constructor(data?: RichEmbedOptions);
// 		public author?: { name: string; url?: string; icon_url?: string; };
// 		public color?: number | string;
// 		public description?: string;
// 		public fields?: { name: string; value: string; inline?: boolean; }[];
// 		public file?: string | FileOptions;
// 		public footer?: { text?: string; icon_url?: string; };
// 		public image?: { url: string; proxy_url?: string; height?: number; width?: number; };
// 		public thumbnail?: { url: string; height?: number; width?: number; };
// 		public timestamp?: Date;
// 		public title?: string;
// 		public url?: string;
// 		public addBlankField(inline?: boolean): this;
// 		public addField(name: StringResolvable, value: StringResolvable, inline?: boolean): this;
// 		public attachFile(file: FileOptions | string): this;
// 		public setAuthor(name: StringResolvable, icon?: string, url?: string): this;
// 		public setColor(color: ColorResolvable): this;
// 		public setDescription(description: StringResolvable): this;
// 		public setFooter(text: StringResolvable, icon?: string): this;
// 		public setImage(url: string): this;
// 		public setThumbnail(url: string): this;
// 		public setTimestamp(timestamp?: Date): this;
// 		public setTitle(title: StringResolvable): this;
// 		public setURL(url: string): this;
// 	}