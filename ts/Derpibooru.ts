import { Collection } from "./Collection";
import * as DiscordTypeChecks from "./DiscordTypeChecks";
import { Embeddable } from "./Embeddable";
import { GenericApi } from "./GenericApi";
import { GenericBot } from "./GenericBot";
import { RichEmbed as Embed } from "./RichEmbed";
import { Path, Query, Url } from "./Url";
import * as Random from "./Random";

const API_RANDOM_PATH: string = "/images.json";
const API_SEARCH_PATH: string = "/search.json";
const BASE_URL: string = "https://derpibooru.org";
const FAVICON_URL: string = "https://derpicdn.net/img/2017/6/14/1461521/thumb.png";
const FILTERS: { nsfw: number, safe: number } = { safe: 100073, nsfw: 56027 };

export class NoponyError extends Error {}

export class Derpibooru extends Embeddable<Derpibooru.Image> implements Derpibooru.Like {
	private _results: Array<Derpibooru.Image>;
	private readonly isNsfw: boolean;
	public readonly type: "random" | "search";

	constructor(parsedCommand: GenericBot.Command.Parser.ParsedCommand) {
		super(parsedCommand);
		this.isNsfw = DiscordTypeChecks.isNsfwChannel(parsedCommand.channel);
		this.type = (this.userInput === "" || this.userInput === "random") ? "random" : "search";
	}

	public get embeds(): Array<Embed.Options> {
		if (!this.results)
			return undefined;
		return super.getEmbeds((image: Derpibooru.Image): Embed.Options => {
			return {
				description: image.file_name + " uploaded by " + image.uploader,
				footer: { iconURL: Derpibooru.Urls.favIcon.toString(), text: image.tags },
				image: { url: image.imageUrl.toString() },
				title: image.pageUrl.toString(),
				url: image.pageUrl.toString()
			};
		});
	}

	public get results(): Array<Derpibooru.Image> { return this._results; }

	public set results(images: Array<Derpibooru.Image>) {
		if (typeof images === "undefined")
			return;
		this._results = images.map<Derpibooru.Image>((image: Derpibooru.Image): Derpibooru.Image => {
			if (typeof image.id === "undefined")
				console.log("found undefined image!!!\n", images);
			return Object.defineProperties(image, {
				imageUrl: { get: function(): Url { return Derpibooru.Image.getImageUrl(this); } },
				pageUrl: { get: function(): Url { return Derpibooru.Image.getPageUrl(this); } }
			});
		});
	}

	protected configureQuery() {
		this.query.set("filter_id", this.isNsfw ? Derpibooru.filters.nsfw : Derpibooru.filters.safe).delete("page");

		if (this.type === "search")
			this.query.set("q", this.fixBestPony(this.userInput));
		else
			this.query.set("random_image", true);
	}

	private fixBestPony(query: string): string { return query.replace(/best pony/g, "(ts,solo)"); }

	public async search() {
		let images: Array<Derpibooru.Response.Image>;
		this.configureQuery();

		if (this.query.has("q") && Number.isInteger(Number.parseInt(this.query.get("q").toString()))) {
			this.results = Array.of<Derpibooru.Response.Image>(await GenericApi.Get.json<Derpibooru.Response.Image>(Derpibooru.Urls.base.setPathname(new Path(`/${this.query.get("q")}.json`))));
			return;
		}

		if (this.type === "random") {
			const response: Derpibooru.Response.Random = await GenericApi.Get.json<Derpibooru.Response.Random>(Derpibooru.Urls.random, this.query);
			images = response.images;
		} else {
			let response: Derpibooru.Response.Search = await GenericApi.Get.json<Derpibooru.Response.Search>(Derpibooru.Urls.search, this.query);

			if (response.total === 0)
				throw new Derpibooru.NoponyError("No images were found for `" + this.userInput + "`");
			const pageNumber: number = (response.total > response.search.length) ? (await Random.integer(Math.ceil(response.total / response.search.length)) + 1) : 1;

			if (pageNumber > 1) {
				this.query.set("page", pageNumber);
				response = await GenericApi.Get.json<Derpibooru.Response.Search>(Derpibooru.Urls.search, this.query);
			}
			images = response.search;
		}
		this.results = await Random.shuffle<Derpibooru.Response.Image>(images);
	}
}

export namespace Derpibooru {
	export interface Image extends Response.Image {
		readonly imageUrl?: string;
		readonly pageUrl?: string;
	}

	export namespace Image {
		export function getImageUrl(image: Image): Url { return Url.parse(image.image, true).setProtocol("https:"); }

		export function getPageUrl(image: Image): Url {
			const path: Path = new Path("/" + image.id);
			return Urls.base.setPathname(path);
		}
	}

	export interface Like extends Embeddable.Like<Derpibooru.Image> {
		readonly type: "random" | "search";

		search();
	};

	export class NoponyError extends Error {}

	export const filters: { nsfw: number, safe: number } = FILTERS;

	namespace Paths {
		export const random: Path = new Path(API_RANDOM_PATH);
		export const search: Path = new Path(API_SEARCH_PATH);
	}

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
	}

	export namespace Urls {
		export const base: Url = new Url(BASE_URL);
		export const favIcon: Url = new Url(FAVICON_URL);
		export const random: Url = base.setPathname(Paths.random);
		export const search: Url = base.setPathname(Paths.search);
	}
}