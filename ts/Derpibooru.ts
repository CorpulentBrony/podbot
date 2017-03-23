import { Collection } from "./Collection";
import { GenericApi } from "./GenericApi";
import { GenericBot } from "./GenericBot";
import { Path, Query, Url } from "./Url";
import * as Random from "./Random";
import { Embed, Reactor } from "./Reactor";
import { quotes } from "./quotes";

const filter_id: number = 41048;
const url: Url = new Url("https://derpibooru.org");
const pathname: { search: Path, random: Path } = { search: new Path("/search.json"), random: new Path("/images.json") };
const query: { search: Query, random: Query } = { search: new Query({ filter_id }), random: new Query({ filter_id, random_image: true }) };

export class NoponyError extends Error {}

export class Derpibooru implements Derpibooru.Like, Reactor.Command {
	private _embeds: Array<Embed.Options>;
	private _images: Array<Derpibooru.Image>;
	public readonly bot: GenericBot;
	public readonly channel: GenericBot.Command.TextBasedChannel;
	public readonly parsedCommand: GenericBot.Command.Parser.ParsedCommand;
	public readonly query: Query;
	public readonly type: "random" | "search";
	public readonly url: Url;
	public readonly userInput: string;

	constructor(parsedCommand: GenericBot.Command.Parser.ParsedCommand) {
		if (parsedCommand.args === "" || parsedCommand.args === "random")
			[this.query, this.type, this.url] = [query.random, "random", url.setPathname(pathname.random)];
		else
			[this.query, this.type, this.url, this.userInput] = [query.search.set("q", parsedCommand.args.replace(/best pony/g, "
															      t sparkle")), "search", url.setPathname(pathname.search), parsedCommand.args];
		this.parsedCommand = parsedCommand;
	}

	public get embeds(): Array<Embed.Options> {
		if (this._embeds)
			return this._embeds;
		return this._embeds = this.images.reduce<Array<Embed.Options>>((embeds: Array<Embed.Options>, image: Derpibooru.Image): Array<Embed.Options> => {
			embeds.push({
				description: "As Twilight Sparkle once said: ```\n" + quotes[Math.floor(Math.random() * quotes.length)] + "```" + image.file_name + " uploaded by " + image.uploader,
				footer: { icon_url: Derpibooru.favIconUrl.toString(), text: image.tags },
				image: { url: image.imageUrl },
				title: image.pageUrl,
				url: image.pageUrl }
			);
			return embeds;
		}, new Array<Embed.Options>());
	}

	public get images(): Array<Derpibooru.Image> { return this._images; }

	public set images(images: Array<Derpibooru.Image>) {
		if (typeof images === "undefined")
			return;
		this._images = images.map<Derpibooru.Image>((image: Derpibooru.Image): Derpibooru.Image => {
			if (typeof image.id === "undefined")
				console.log("found undefined image!!!\n", images);
			return Object.defineProperties(image, {
				imageUrl: { get: function(): string { return Derpibooru.Response.formatImageUrl(this); } },
				pageUrl: { get: function(): string { return Derpibooru.Response.formatImagePageUrl(this); } }
			});
		});
	}

	public async fetch() { (this.type === "search") ? await this.search() : await this.random(); }
	private async getImages<T extends Derpibooru.Response.Random | Derpibooru.Response.Search>(): Promise<T> { return GenericApi.Get.json<T>(this.url, this.query); }

	public async random() {
		const images: Derpibooru.Response.Random = await this.getImages<Derpibooru.Response.Random>();
		this.images = await Random.shuffle<Derpibooru.Response.Image>(images.images);
	}

	public async search() {
		this.query.delete("page");
		let images: Derpibooru.Response.Search = await this.getImages<Derpibooru.Response.Search>();

		if (images.total === 0)
			throw new Derpibooru.NoponyError("No images were found for `" + this.userInput + "`");
		const pageNumber: number = (images.total > images.search.length) ? (await Random.integer(Math.ceil(images.total / images.search.length)) + 1) : 1;

		if (pageNumber > 1) {
			this.query.set("page", pageNumber);
			images = await this.getImages<Derpibooru.Response.Search>();
		}
		const shuffled: Array<Derpibooru.Response.Image> = await Random.shuffle<Derpibooru.Response.Image>(images.search);
		
		if (typeof shuffled[0] === "undefined")
			console.log(shuffled);
		this.images = shuffled;
	}

	public async send(): Promise<Embed> {
		const embed: Embed = new Embed(this.parsedCommand, this.embeds);
		await embed.send();
		return embed;
	}
}

export namespace Derpibooru {
	export interface Constructor {}

	export interface Image extends Response.Image {
		readonly imageUrl?: string;
		readonly pageUrl?: string;
	}

	export interface Like {
		readonly query: Query;
		readonly url: Url;
		readonly userInput?: string;
	}

	export class NoponyError extends Error {}

	export const favIconUrl: Url = url.setPathname(new Path("/favicon.ico"));

	export namespace Response {
		export interface Image {
			downvotes: number;
			faves: number;
			file_name: string;
			id: string;
			image: string;
			score: number;
			tags: string;
			uploader: string;
			upvotes: number;
		}

		export interface Random { images: Array<Image>; }

		export interface Search {
			search: Array<Image>;
			total: number;
		}

		export function formatImagePageUrl(image: Image): string { return url.setPathname(new Path("/" + image.id)).toString(); }
		export function formatImageUrl(image: Image): string { return Url.parse(image.image, true).setProtocol("https:").toString(); }
	}
}
