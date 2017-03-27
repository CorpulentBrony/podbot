import { Collection } from "./Collection";
import * as Crypt from "./Crypt";
import { Embeddable } from "./Embeddable";
import { GenericApi } from "./GenericApi";
import { GenericBot } from "./GenericBot";
import { Embed, Reactor } from "./Reactor";
import { Path, Query, Url } from "./Url";

const GOOGLE_API_BASE_URL: string = "https://www.googleapis.com";
const GOOGLE_BASE_URL: string = "https://www.google.com";
const GOOGLE_FAVICON_PATH: string = "/images/branding/product/ico/googleg_lodp.ico";
const GOOGLE_MAPS_API_BASE_URL: string = "https://maps.googleapis.com";
const GOOGLE_SEARCH_API: string = "/customsearch/v1";
const GOOGLE_SEARCH_PATH: string = "/search";
const GOOGLE_MAPS_TIMEZONE_API: string = "/maps/api/timezone/json";

// https://console.developers.google.com/apis/credentials?project=podbot-1487985738290

// maybe this, the TZ, the derpibooru, and youtube search classes should be children of a common parent...they're sharing a lot of code!
// modify this (and other api calls to google if possible) to only bring back the needed fields using files= parameter in request https://developers.google.com/custom-search/json-api/v1/performance 
// implement google image search (uses same exactl api as search but with searchType=image)

class GoogleError extends Error {}

export namespace Google {
	export interface Secrets {
		cx: string;
		key: string;
	}

	export class Error extends GoogleError {}

	let secrets: Secrets;

	export async function getCx(): Promise<string> { return (await getSecrets()).cx; }
	export async function getKey(): Promise<string> { return (await getSecrets()).key; }

	export async function getSecrets(): Promise<Secrets> {
		if (secrets)
			return secrets;
		return secrets = translateSecrets(await Crypt.getSecrets("Google"));
	}

	function translateSecrets(secrets: Crypt.SecretsGoogle): Secrets {
		const result: Secrets & Crypt.SecretsGoogle = Object.defineProperty(secrets, "key", Object.getOwnPropertyDescriptor(secrets, "api"));
		delete result.api;
		return result;
	}

	export namespace Maps { export namespace Urls { export const api: Url = new Url(GOOGLE_MAPS_API_BASE_URL); } }

	namespace Paths {
		export const favIcon: Path = new Path(GOOGLE_FAVICON_PATH);
		export const search: Path = new Path(GOOGLE_SEARCH_PATH);
	}

	export namespace Urls {
		export const api: Url = new Url(GOOGLE_API_BASE_URL);
		const base: Url = new Url(GOOGLE_BASE_URL);
		export const favIcon: Url = base.setPathname(Paths.favIcon);
		export const search: Url = base.setPathname(Paths.search);
	}
}

class GoogleSearch extends Embeddable<Google.Search.Result.Item> implements Google.Search.Like {
	private _results: Array<Google.Search.Result.Item>;
	public searchInformation: Google.Search.Information;

	public get embeds(): Array<Embed.Options> {
		if (!this.results)
			return undefined;
		return super.getEmbeds((item: Google.Search.Result.Item, index: number): Embed.Options => {
			let [prefix, suffix]: [string, string] = ["Results ", ""];

			if (this.searchInformation) {
				if (this.searchInformation.formattedTotalResults)
					prefix = "Found " + this.searchInformation.formattedTotalResults + " results ";

				if (this.searchInformation.formattedSearchTime)
					suffix = " in " + this.searchInformation.formattedSearchTime + " seconds";
			}

			return {
				description: item.snippet ? item.snippet : "",
				footer: { icon_url: Google.Urls.favIcon.toString(), text: prefix + "for query: \"" + this.userInput + "\"" + suffix },
				title: item.title ? item.title : "",
				thumbnail: { url: item.thumbnailUrl.toString() },
				url: item.link ? item.link : ""
			};
		});
	}

	public get results(): Array<Google.Search.Result.Item> { return this._results; }

	public set results(results: Array<Google.Search.Result.Item>) {
		if (typeof results === "undefined")
			return;
		this._results = results.map<Google.Search.Result.Item>((item: Google.Search.Result.Item): Google.Search.Result.Item => Object.defineProperties(item, {
			thumbnailUrl: { get: function(): Url { return Google.Search.Result.Item.getThumbnailUrl(this); } }
		}));
	}

	protected async configureQuery(query: string) {
		const secrets: Google.Secrets = await Google.getSecrets();
		this.query.set("cx", secrets.cx).set("key", secrets.key).set("num", 10).set("q", query);
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
}

namespace GoogleSearch {
	export interface Like {
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
			formattedUrl: string;
			link: string;
			pagemap: {
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

class GoogleTimezone implements Google.Timezone.Like {
	public readonly latitude: number;
	public readonly longitude: number;
	public readonly query: Query;
	public result: Google.Timezone.Result;
	private timer: NodeJS.Timer;

	constructor(latitude: number, longitude: number) { [this.latitude, this.longitude, this.query] = [latitude, longitude, new Query()]; }

	public get abbreviation(): string { return (this.result && this.result.timeZoneName) ? this.result.timeZoneName.split(" ").map<string>((word: string): string => word.charAt(0)).join("") : undefined; }

	public get currentDateTime(): string {
		if (this.isReady) {
			const currentTimestamp: number = this.currentTimestamp;

			if (typeof currentTimestamp !== "undefined") {
				const result: Date = new Date(currentTimestamp);
				const offsetHours: number = this.offsetHours;
				const offsetHoursString: string = ((offsetHours < 0) ? "" : "+") + Math.trunc(offsetHours).toString() + ":" + ((offsetHours === offsetHours >> 0) ? "00" : Math.round(offsetHours - (offsetHours >> 0)).toString());
				return result.toString() + " GMT" + offsetHoursString + " (" + this.abbreviation + ")";
			}
		}
		return Date();
	}

	public get currentTimestamp(): number {
		const offset: number = this.offset;
		return (typeof offset !== "undefined") ? Date.now() + offset : undefined;
	}

	public get isReady(): boolean { return typeof this.result !== "undefined"; }
	public get location(): string { return (typeof this.latitude !== "undefined" && typeof this.longitude !== "undefined") ? this.latitude.toString() + "," + this.longitude.toString() : ""; }
	public get name(): string { return (this.result && this.result.timeZoneName) ? this.result.timeZoneName : undefined; }
	public get offset(): number { return (this.result && typeof this.result.rawOffset !== "undefined") ? ((this.result.dstOffset ? this.result.dstOffset : 0) + this.result.rawOffset) * 1000 : undefined; }

	public get offsetHours(): number {
		const result: number = this.offset;
		return (typeof result !== "undefined") ? result / 1000 / 60 / 60 : undefined;
	}
	private async configureQuery(timestamp: number) { this.query.set("key", await Google.getKey()).set("location", this.location).set("timestamp", Math.round(timestamp / 1000)); }
	public async execute(name: string, color: string = "") { await this.setTimer(color + " " + this.currentDateTime.slice(4, 24) + " <" + name + "> "); }

	private async setTimer(message: string) {
		console.log(message + "Updating timezone data!");
		await this.update();
		const currentTimestamp: number = this.currentTimestamp;

		if (typeof currentTimestamp !== "undefined") {
			const nextUpdateDate: Date = new Date(currentTimestamp);
			nextUpdateDate.setDate(nextUpdateDate.getDate() + 1);
			nextUpdateDate.setHours(2, 1);
			this.timer = setTimeout(() => { this.setTimer(message); }, nextUpdateDate.getTime() - (Date.now() + this.offset));
		} else
			this.timer = setTimeout(() => { this.setTimer(message); }, 60000);
	}

	public async update(timestamp: number = Date.now()) {
		if (typeof timestamp === "undefined" || timestamp < 0)
			return;
		await this.configureQuery(timestamp);
		const result: Google.Timezone.Result = await GenericApi.Get.json<Google.Timezone.Result>(Google.Timezone.Urls.api, this.query);

		if (!result)
			throw new Google.Timezone.Error("Google Timezone request failed with unknown status");
		else if (result.status !== "OK")
			throw new Google.Timezone.Error("Google Timezone request failed with status " + result.status + (result.error_message ? ": " + result.error_message : ""));
		this.result = result;
	}
}

namespace GoogleTimezone {
	export interface Like {
		readonly abbreviation: string;
		readonly currentDateTime: string;
		readonly currentTimestamp: number;
		readonly isReady: boolean;
		readonly latitude: number;
		readonly location: string;
		readonly longitude: number;
		readonly name: string;
		readonly offset: number;
		readonly offsetHours: number;
		readonly query: Query;

		execute(prefix?: string);
		update(timestamp?: number);
	} export declare const Like: {
		prototype: Like;

		new(latitude: number, longitude: number): Like;
	};

	export interface Result {
		dstOffset?: number;
		error_message?: string;
		rawOffset?: number;
		status: "INVALID_REQUEST" | "OK" | "OVER_QUERY_LIMIT" | "REQUEST_DENIED" | "UNKNOWN_ERROR" | "ZERO_RESULTS";
		timeZoneId?: string;
		timeZoneName?: string;
	}

	export class Error extends Google.Error {}

	namespace Paths {
		export const api: Path = new Path(GOOGLE_MAPS_TIMEZONE_API);
	}

	export namespace Urls {
		export const api: Url = Google.Maps.Urls.api.setPathname(Paths.api);
	}
}

export namespace Google {
	export import Search = GoogleSearch;
	export import Timezone = GoogleTimezone;
}