import { Collection } from "../Collection";
import { DateFormatted } from "../DateFormatted";
import { Derpibooru } from "../Derpibooru";
import * as Discord from "discord.js";
import * as FourChan from "../FourChan";
import { GenericBot } from "../GenericBot";
import { Google } from "../Google";
import { Query } from "../Url";
import { RichEmbed } from "../RichEmbed";
import { YouTube } from "../YouTube";

export class Defaults {
	public static async ["4chan"](parsedCommand: GenericBot.Command.Parser.ParsedCommand): Promise<Discord.Message | Array<Discord.Message>> { return Defaults.fourChan(parsedCommand); }
}

export namespace Defaults {
	const regionalIndicators: Collection<string, string> = Array.prototype.reduce.call(String("abcdefghijklmnopqrstuvwxyz"), 
		(result: Collection<string, string>, value: string): Collection<string, string> => result.set(value, ":regional_indicator_" + value + ": "), 
		new Collection<string, string>())
		.set(" ", "  ").set("1", ":one: ").set("2", ":two: ").set("3", ":three: ").set("4", ":four: ").set("5", ":five: ").set("6", ":six: ").set("7", ":seven: ").set("8", ":eight: ").set("9", ":nine: ");

	export interface SayEmbedOptions {
		color?: number;
		description?: string;
		fields?: Array<RichEmbed.Options.Field>;
		footer?: string;
		footerImageUrl?: string;
		image?: string;
		thumbnail?: { url: string };
		title: string; 
		url?: string; 
	}

	export async function db(parsedCommand: GenericBot.Command.Parser.ParsedCommand): Promise<Discord.Message> {
		const command: Derpibooru = new Derpibooru(parsedCommand);

		try { await command.search(); }
		catch (err) {
			if (err instanceof Derpibooru.NoponyError)
				return say(parsedCommand, err.message);
			else
				throw err;
		}
		const embed: RichEmbed = await command.send();
		await parsedCommand.bot.reactor.add(embed);
		return embed.message;
	}

	export async function fourChan(parsedCommand: GenericBot.Command.Parser.ParsedCommand): Promise<Discord.Message | Array<Discord.Message>> {
		let result: FourChan.Catalog.Response.Thread;

		try {
			result = (parsedCommand.args === "" || parsedCommand.args === "random") ? await FourChan.Catalog.random() : await FourChan.Catalog.search(parsedCommand.args);
		} catch (e) {
			if (e instanceof FourChan.FourChanError)
				return say(parsedCommand, e.message);
			else
				throw e;
		}
		const threadSubject: string = FourChan.formatThreadSubject(result);
		const threadUrl: string = FourChan.formatThreadUrl(result);
		const message: RichEmbed = new RichEmbed(parsedCommand, {
			footer: { iconURL: FourChan.favIconUrl.toString(), text: "Replies: " + result.replies.toString() + " | Images: " + result.images.toString() + " | Page: " + result.pageNumber.toString() },
			title: ((threadSubject === "") ? "[UNTITLED]" : threadSubject),
			url: threadUrl
		});
		const comment: string = FourChan.formatPostComment(result);
		message.addField("by " + result.name, (comment.length > 1024) ? comment.slice(0, 1024).concat("\u{2026}") : comment, false);
		message.thumbnail = { url: FourChan.formatPostImage(result) };
		return message.send();
	}

	export async function google(parsedCommand: GenericBot.Command.Parser.ParsedCommand): Promise<Discord.Message> {
		const command: Google.Search = new Google.Search(parsedCommand);

		try { await command.search(); }
		catch (err) {
			if (err instanceof Google.Search.Error)
				return say(parsedCommand, err.message);
			else
				throw err;
		}
		const embed: RichEmbed = await command.send();
		await parsedCommand.bot.reactor.add(embed);
		return embed.message;
	}

	export async function image(parsedCommand: GenericBot.Command.Parser.ParsedCommand): Promise<Discord.Message> {
		const command: Google.Search.Image = new Google.Search.Image(parsedCommand);

		try { await command.search(); }
		catch (err) {
			if (err instanceof Google.Search.Error)
				return say(parsedCommand, err.message);
			else
				throw err;
		}
		const embed: RichEmbed = await command.send();
		await parsedCommand.bot.reactor.add(embed);
		return embed.message;
	}

	function isBotOrDmChannel(channel: GenericBot.Command.TextBasedChannel): boolean { return channel instanceof Discord.DMChannel || channel instanceof Discord.GroupDMChannel || channel instanceof Discord.TextChannel && /bot/gi.test(channel.name); }

	export async function ping(parsedCommand: GenericBot.Command.Parser.ParsedCommand): Promise<Discord.Message | Array<Discord.Message>> {
		if (isBotOrDmChannel(parsedCommand.message.channel))
			return sayEmbed(parsedCommand, {
				description: "Response took: " + DateFormatted.fromTimestamp(Date.now() - parsedCommand.message.createdTimestamp).format() + "; average socket ping: " + DateFormatted.fromTimestamp(parsedCommand.bot.client.ping).format(),
				footer: "\u{1f3d3}",
				title: "Pong!"
			});
		return null;
	}

	export async function regind(parsedCommand: GenericBot.Command.Parser.ParsedCommand): Promise<Discord.Message> {
		return say(parsedCommand, Array.prototype.reduce.call(parsedCommand.args.toLowerCase(), (result: string, char: string): string => result + (regionalIndicators.has(char) ? regionalIndicators[char] : char), ""));
	}

	async function say(parsedCommand: GenericBot.Command.Parser.ParsedCommand, message?: string): Promise<Discord.Message> { return <Promise<Discord.Message>>parsedCommand.channel.send(message ? message : parsedCommand.args); }

	export async function sayEmbed(parsedCommand: GenericBot.Command.Parser.ParsedCommand, options: SayEmbedOptions): Promise<Discord.Message | Array<Discord.Message>> {
		const embedMessage: RichEmbed = new RichEmbed(parsedCommand, Object.assign(options, { footer: { iconURL: options.footerImageUrl, text: options.footer }, image: { url: options.image } }));
		return embedMessage.send();
	}

	export async function uptime(parsedCommand: GenericBot.Command.Parser.ParsedCommand): Promise<Discord.Message | Array<Discord.Message>> {
		if (!isBotOrDmChannel(parsedCommand.channel))
			return null;
		const now: Date = new Date();

		return sayEmbed(parsedCommand, {
			description: "As of " + now.toLocaleString() + " I have been up for **" + DateFormatted.fromTimestamp(parsedCommand.bot.client.uptime).format() + "**",
			footer: "\u{1f199}",
			title: parsedCommand.bot.name + " Uptime"
		});
	}

	export async function yt(parsedCommand: GenericBot.Command.Parser.ParsedCommand): Promise<Discord.Message> {
		const command: YouTube = new YouTube(parsedCommand);

		try { await command.search(); }
		catch (err) {
			if (err instanceof YouTube.Error)
				return say(parsedCommand, err.message);
			else
				throw err;
		}
		const embed: RichEmbed = await command.send();
		await parsedCommand.bot.reactor.add(embed);
		return embed.message;
	}
}