import * as Crypt from "./Crypt";
import * as EventEmitter from "events";
import { GenericApi } from "./GenericApi";
import { GenericBot } from "./GenericBot";
import { Google } from "./Google";
import { Embed, Reactor } from "./Reactor";
import { Path, Query, Url } from "./Url";

const YOUTUBE_BASE_URL: string = "https://www.youtube.com";
const YOUTUBE_API_ACTIVITIES_PATH: string = "activities";
const YOUTUBE_API_BASE_PATH: string = "/youtube/v3";
const YOUTUBE_API_SEARCH_PATH: string = "search";

class YouTubeError extends Error {}

export class YouTube implements Reactor.Command, YouTube.Like {
	private _embeds: Array<Embed.Options>;
	private _videos: Array<YouTube.Response.ItemUrls>;
	public readonly bot: GenericBot;
	public readonly channel: GenericBot.Command.TextBasedChannel;
	public readonly parsedCommand: GenericBot.Command.Parser.ParsedCommand;
	public readonly query: Query;

	constructor(parsedCommand: GenericBot.Command.Parser.ParsedCommand) {
		[this.parsedCommand, this.query] = [parsedCommand, new Query()];
	}

	public get embeds(): Array<Embed.Options> {
		if (this._embeds)
			return this._embeds;
		return this._embeds = this.videos.reduce<Array<Embed.Options>>((embeds: Array<Embed.Options>, video: YouTube.Response.ItemUrls, index: number, videos: Array<YouTube.Response.ItemUrls>): Array<Embed.Options> => {
			if (video.snippet && video.id && video.id.videoId) {
				const next: string = ((videos[index + 1] && videos[index + 1].snippet && videos[index + 1].snippet.title) ? videos[index + 1].snippet.title + "  >>" : "");
				const prev: string = ((videos[index - 1] && videos[index - 1].snippet && videos[index - 1].snippet.title) ? "<<  " + videos[index - 1].snippet.title : "");
				embeds.push({
					description: video.snippet.description ? video.snippet.description : "",
					footer: { icon_url: YouTube.Urls.favicon.toString(), text: (next.length > 0 && prev.length > 0) ? prev + "  |  " + next : prev + next },
					image: { url: video.thumbnailUrl.toString() },
					title: (video.snippet.title ? video.snippet.title : "") + (video.snippet.channelTitle ? "\n" + video.snippet.channelTitle : ""),
					url: video.videoUrl.toString(),
					video: { height: 225, url: video.videoUrl.toString(), width: 400 }
				});
			}
			return embeds;
		}, new Array<Embed.Options>());
	}

	public get userInput(): string { return this.parsedCommand.args; }
	public get videos(): Array<YouTube.Response.ItemUrls> { return this._videos; }

	public set videos(videos: Array<YouTube.Response.ItemUrls>) {
		if (typeof videos === "undefined")
			return;
		this._videos = videos.map<YouTube.Response.Item>((video: YouTube.Response.Item): YouTube.Response.Item => Object.defineProperties(video, {
			channelUrl: { get: function(): Url { return YouTube.Response.Item.getChannelUrl(this); } },
			thumbnailUrl: { get: function(): Url { return YouTube.Response.Item.getThumbnailUrl(this); } },
			videoUrl: { get: function(): Url {
				if (this.id)
					return YouTube.Response.Item.getVideoUrl(this.id);
				return undefined;
			} }
		}));
	}

	public async configureQuery(query: string) { this.query.set("maxResults", 50).set("part", "snippet").set("q", query).set("safeSearch", "none").set("type", "video").set("key", await YouTube.getKey()); }

	public async search(query: string = this.userInput) {
		if (!query || query === "")
			return;
		this.query.delete("pageToken");
		await this.configureQuery(query);
		const result: YouTube.Response.Result = await GenericApi.Get.json<YouTube.Response.Result>(YouTube.Urls.api, this.query);

		if (!result || !result.items || result.items.length === 0)
			throw new YouTube.Error("No videos were found for `" + query + "`");
		this.videos = result.items;
	}

	public async send(): Promise<Embed> {
		const embed: Embed = new Embed(this.parsedCommand, this.embeds);
		await embed.send();
		return embed;
	}
}

export namespace YouTube {
	export interface Like {
		readonly query: Query;
		readonly userInput: string;
		videos: Array<Response.ItemUrls>;

		configureQuery(query: string);
		search(query?: string);
	}

	export declare const Like: {
		prototype: Like;

		new(parsedCommand: GenericBot.Command.Parser.ParsedCommand): Like;
	};

	export class Error extends YouTubeError {}

	let key: string;

	export async function getKey(): Promise<string> {
		if (key)
			return key;
		const result: Crypt.SecretsGoogle = await Crypt.getSecrets("Google");
		return key = result.api;
	}

	export namespace Paths {
		export const apiBase: Path = new Path(YOUTUBE_API_BASE_PATH);
		export const api: Path = apiBase.join(YOUTUBE_API_SEARCH_PATH);
		export const channel: Path = new Path("/channel/");
		export const favicon: Path = new Path("/favicon.ico");
		export const watch: Path = new Path("/watch");
	}

	export namespace Response {
		export interface ContentDetails { upload?: Resource; }

		export interface Item {
			contentDetails?: ContentDetails;
			id?: Resource;
			playlistId?: string;
			position?: number;
			resourceId?: Resource;
			snippet?: Snippet;
		}

		export namespace Item {
			export function getChannelUrl(item: Item): Url {
				if (item.snippet && item.snippet.channelId)
					return Urls.base.setPathname(Paths.channel.join(item.snippet.channelId));
				return undefined;
			}

			export function getThumbnailUrl(item: Item): Url {
				if (item.snippet && item.snippet.thumbnails) {
					const thumbnail: Thumbnail = item.snippet.thumbnails.high ? item.snippet.thumbnails.high : item.snippet.thumbnails.medium ? item.snippet.thumbnails.medium : item.snippet.thumbnails.default ? item.snippet.thumbnails.default : undefined;
					
					if (thumbnail && thumbnail.url)
						return new Url(thumbnail.url);
				}
				return undefined;
			}

			export function getVideoUrl(resource: Resource): Url {
				if (resource.videoId)
					return YouTube.Urls.watch.setQuery(new Query({ v: resource.videoId }));
				return undefined;
			}
		}

		export interface ItemUrls extends Item {
			channelUrl?: Url;
			thumbnailUrl?: Url;
			videoUrl?: Url;
		}

		export interface PageInfo {
			totalResults: number;
			resultsPerPage: number;
		}

		export interface Result {
			etag: string;
			items?: Array<Item>;
			nextPageToken?: string;
			pageInfo?: PageInfo;
		}

		export interface Resource { videoId: string; }

		export interface Snippet {
			channelId?: string;
			channelTitle: string;
			description: string;
			thumbnails: Thumbnails;
			title: string;
			publishedAt: string;
		}

		export interface Thumbnail {
			height: number;
			url: string;
			width: number;
		}

		export interface Thumbnails {
			default: Thumbnail;
			medium?: Thumbnail;
			high?: Thumbnail;
		}
	}

	export namespace Urls {
		export const apiBase: Url = new Url(Google.Urls.api);
		export const api: Url = apiBase.setPathname(Paths.api);
		export const base: Url = new Url(YOUTUBE_BASE_URL);
		export const favicon: Url = base.setPathname(Paths.favicon);
		export const watch: Url = base.setPathname(Paths.watch);
	}
}

class YouTubeChannelMonitor extends EventEmitter implements YouTubeChannelMonitor.Like {
	private _lastVideo: YouTube.Response.ItemUrls;
	public etag: string;
	public frequencySeconds: number;
	public readonly channelId: string;
	public readonly query: Query;
	private timer: NodeJS.Timer;

	private static findMostRecentUpload(videos: Array<YouTube.Response.Item>): YouTube.Response.Item {
		if (videos)
			for (const video of videos)
				if (video.contentDetails && video.contentDetails.upload)
					return video;
		return undefined;
	}

	constructor(channelId: string, frequencySeconds: number) {
		super();
		[this.frequencySeconds, this.channelId, this.query] = [frequencySeconds, channelId, new Query()];
	}

	public get lastVideo(): YouTube.Response.ItemUrls { return this._lastVideo; }

	public set lastVideo(lastVideo: YouTube.Response.ItemUrls) {
		if (typeof lastVideo === "undefined")
			return;
		this._lastVideo = Object.defineProperties(lastVideo, {
			channelUrl: { get: function(): Url { return YouTube.Response.Item.getChannelUrl(this); } },
			thumbnailUrl: { get: function(): Url { return YouTube.Response.Item.getThumbnailUrl(this); } },
			videoUrl: { get: function(): Url {
				if (this.contentDetails && this.contentDetails.upload)
					return YouTube.Response.Item.getVideoUrl(this.contentDetails.upload);
				return undefined;
			} }
		});
	}

	public async configureQuery() { this.query.set("maxResults", 10).set("part", "contentDetails").set("channelId", this.channelId).set("key", await YouTube.getKey()); }

	public async refresh() {
		try {
			await this.configureQuery();
			const headers: GenericApi.Headers = this.etag ? { "if-none-match": this.etag } : {};
			const result: YouTube.Response.Result = await GenericApi.Get.json<YouTube.Response.Result>(YouTubeChannelMonitor.Urls.api, this.query, headers);
			super.emit("response", result);

			if (result && result.items && result.items.length > 0) {
				const lastVideo: YouTube.Response.Item = YouTubeChannelMonitor.findMostRecentUpload(result.items);
				if (lastVideo && lastVideo.contentDetails && lastVideo.contentDetails.upload && lastVideo.contentDetails.upload.videoId && (!this.lastVideo || this.lastVideo.contentDetails && this.lastVideo.contentDetails.upload && this.lastVideo.contentDetails.upload.videoId && lastVideo.contentDetails.upload.videoId !== this.lastVideo.contentDetails.upload.videoId)) {
					this.lastVideo = lastVideo;

					if (this.etag)
						super.emit("newVideo", this.lastVideo);
				}
				this.etag = result.etag;
			}
		} catch (err) {
			super.emit("error", err);
		}
	}

	public start(): this {
		this.refresh().catch(console.error);
		this.timer = setInterval((): void => { this.refresh().catch(console.error) }, this.frequencySeconds * 1000);
		return this;
	}
}

namespace YouTubeChannelMonitor {
	export interface Like {
		etag: string;
		frequencySeconds: number;
		lastVideo: YouTube.Response.Item;
		readonly channelId: string;
		readonly query: Query;

		configureQuery();
		on(event: "newVideo", listener: (video: YouTube.Response.ItemUrls) => void): this;
		on(event: "response", listener: (result: YouTube.Response.Result) => void): this;
		refresh();
		start(): this;
	}

	export declare const Like: {
		prototype: Like;

		new(channelId: string): Like;
	};

	export class Error extends YouTubeError {}

	namespace Paths {
		export const api: Path = YouTube.Paths.apiBase.join(YOUTUBE_API_ACTIVITIES_PATH);
	}

	export namespace Urls {
		export const api: Url = YouTube.Urls.apiBase.setPathname(Paths.api);
	}
}

export namespace YouTube {
	export import ChannelMonitor = YouTubeChannelMonitor;
}