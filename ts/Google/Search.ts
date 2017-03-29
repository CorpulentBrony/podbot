import { Embeddable } from "../Embeddable";
import { GenericApi } from "../GenericApi";
import { GenericBot } from "../GenericBot";
import { Google } from "../Google";
import { RichEmbed as Embed } from "../RichEmbed";
import { Path, Query, Url } from "../Url";

const GOOGLE_SEARCH_API: string = "/customsearch/v1";

export class Search extends Embeddable<Google.Search.Result.Item> implements Google.Search.Like {
	private _footer: { text?: string; icon_url?: string; };
	protected _results: Array<Google.Search.Result.Item> = undefined;
	public searchInformation: Google.Search.Information;

	public get embeds(): Array<Embed.Options> {
		if (!this.results)
			return undefined;
		return super.getEmbeds((item: Google.Search.Result.Item): Embed.Options => this.getEmbed(item));
	}

	protected get footer(): { text?: string; icon_url?: string; } {
		if (this._footer)
			return this._footer;
		let [prefix, suffix]: [string, string] = ["Results ", ""];

		if (this.searchInformation) {
			if (this.searchInformation.formattedTotalResults)
				prefix = "Found " + this.searchInformation.formattedTotalResults + " results ";

			if (this.searchInformation.formattedSearchTime)
				suffix = " in " + this.searchInformation.formattedSearchTime + " seconds";
		}
		return this._footer = { icon_url: Google.Urls.favIcon.toString(), text: prefix + "for query: \"" + this.userInput + "\"" + suffix };
	}

	public get results(): Array<Google.Search.Result.Item> { return this._results; }

	public set results(results: Array<Google.Search.Result.Item>) {
		if (typeof results === "undefined")
			return;
		this.setResults(results);
	}

	protected async configureQuery(query: string) {
		const secrets: Google.Secrets = await Google.getSecrets();
		this.query.set("cx", secrets.cx).set("key", secrets.key).set("num", 10).set("q", query);
	}

	protected getEmbed(item: Google.Search.Result.Item): Embed.Options {
		return {
			description: item.snippet ? item.snippet : "",
			footer: this.footer,
			title: item.title ? item.title : "",
			thumbnail: { url: item.thumbnailUrl.toString() },
			url: item.link ? item.link : ""
		};
	}

	public async search(query: string = this.userInput) {
		if (!query || query === "")
			return;
		this.query.delete("start");
		await this.configureQuery(query);
		const result: Google.Search.Result = await GenericApi.Get.json<Google.Search.Result>(Google.Search.Urls.api, this.query);

		if (!result || !result.items || result.items.length === 0)
			throw new Google.Search.Error("No results were found for `" + query + "`");
		[this.results, this.searchInformation] = [result.items, result.searchInformation ? result.searchInformation : undefined];
	}

	protected setResults(results: Array<Google.Search.Result.Item>): void {
		this._results = results.map<Google.Search.Result.Item>((item: Google.Search.Result.Item): Google.Search.Result.Item => Object.defineProperties(item, {
			thumbnailUrl: { get: function(): Url { return Google.Search.Result.Item.getThumbnailUrl(this); } }
		}));
	}
}

export namespace Search {
	export interface Like extends Embeddable.Like<Google.Search.Result.Item> {
		searchInformation: Google.Search.Information;

		search(query?: string);
	} export declare const Like: {
		prototype: Like;

		new(parsedCommand: GenericBot.Command.Parser.ParsedCommand): Like;
	};

	export interface Result {
		items: Array<Result.Item>;
		searchInformation: Information;
	}

	export namespace Result {
		export interface Item {
			displayLink: string;
			formattedUrl?: string;
			image?: { contextLink?: string; }
			link: string;
			pagemap?: {
				cse_image?: Array<Item.Image>;
				cse_thumbnail?: Array<Item.Thumbnail>;
			};
			snippet: string;
			thumbnailUrl?: string;
			title: string;
		}

		export namespace Item {
			export interface Image { src: string; }

			export interface Thumbnail extends Image {
				height: string;
				width: string;
			}

			export function getThumbnailUrl(item: Item): Url {
				if (item && item.pagemap)
					if (item.pagemap.cse_thumbnail && item.pagemap.cse_thumbnail[0].src)
						return new Url(item.pagemap.cse_thumbnail[0].src);
					else if (item.pagemap.cse_image && item.pagemap.cse_image[0].src)
						return new Url(item.pagemap.cse_image[0].src);
				return new Url();
			}
		}
	}

	export interface Information {
		searchTime: number;
		formattedSearchTime: string;
		totalResults: string;
		formattedTotalResults: string;
	}

	export class Error extends Google.Error {}

	namespace Paths {
		export const api: Path = new Path(GOOGLE_SEARCH_API);
	}

	export namespace Urls {
		export const api: Url = Google.Urls.api.setPathname(Paths.api);
	}
}

import { Image as SearchImage } from "./Image";

export namespace Search {
	export import Image = SearchImage;
}