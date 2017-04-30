import * as DiscordTypeChecks from "./DiscordTypeChecks";
import { Embeddable } from "./Embeddable";
import { GenericApi } from "./GenericApi";
import { GenericBot } from "./GenericBot";
import { Google } from "./Google";
import { RichEmbed as Embed } from "./RichEmbed";
import { Path, Query, Url } from "./Url";

const YOUTUBE_BASE_URL: string = "https://www.youtube.com";
const YOUTUBE_API_BASE_PATH: string = "/youtube/v3";
const YOUTUBE_API_SEARCH_PATH: string = "search";

export class YouTube extends Embeddable<YouTube.Response.ItemUrls> implements YouTube.Like {
	private _results: Array<YouTube.Response.ItemUrls>;
	private readonly isNsfw: boolean;

	constructor(parsedCommand: GenericBot.Command.Parser.ParsedCommand) {
		super(parsedCommand);
		this.isNsfw = DiscordTypeChecks.isNsfwChannel(parsedCommand.channel);
	}

	public get embeds(): Array<Embed.Options> {
		if (!this.results)
			return undefined;
		return super.getEmbeds((video: YouTube.Response.ItemUrls, index: number, videos: Array<YouTube.Response.ItemUrls>): Embed.Options => {
			if (video.snippet && video.id && video.id.videoId) {
				const next: string = ((videos[index + 1] && videos[index + 1].snippet && videos[index + 1].snippet.title) ? videos[index + 1].snippet.title + "  >>" : "");
				const prev: string = ((videos[index - 1] && videos[index - 1].snippet && videos[index - 1].snippet.title) ? "<<  " + videos[index - 1].snippet.title : "");
				return {
					description: video.snippet.description ? video.snippet.description : "",
					footer: { icon_url: YouTube.Urls.favicon.toString(), text: (next.length > 0 && prev.length > 0) ? prev + "  |  " + next : prev + next },
					image: { url: video.thumbnailUrl.toString() },
					title: (video.snippet.title ? video.snippet.title : "") + (video.snippet.channelTitle ? "\n" + video.snippet.channelTitle : ""),
					url: video.videoUrl.toString(),
					video: { height: 225, url: video.videoUrl.toString(), width: 400 }
				};
			}
			return {};
		});
	}

	public get results(): Array<YouTube.Response.ItemUrls> { return this._results; }

	public set results(videos: Array<YouTube.Response.ItemUrls>) {
		if (typeof videos === "undefined")
			return;
		this._results = videos.map<YouTube.Response.Item>((video: YouTube.Response.Item): YouTube.Response.Item => Object.defineProperties(video, {
			channelUrl: { get: function(): Url { return YouTube.Response.Item.getChannelUrl(this); } },
			thumbnailUrl: { get: function(): Url { return YouTube.Response.Item.getThumbnailUrl(this); } },
			videoUrl: { get: function(): Url {
				if (this.id)
					return YouTube.Response.Item.getVideoUrl(this.id);
				return new Url();
			} }
		}));
	}

	protected async configureQuery(query: string) { this.query.set("maxResults", 50).set("part", "snippet").set("q", query).set("safeSearch", this.isNsfw ? "none" : "strict").set("type", "video").set("key", await Google.getKey()); }

	public async search(query: string = this.userInput) {
		if (!query || query === "")
			return;
		this.query.delete("pageToken");
		await this.configureQuery(query);
		const result: YouTube.Response.Result = await GenericApi.Get.json<YouTube.Response.Result>(YouTube.Urls.api, this.query);

		if (!result || !result.items || result.items.length === 0)
			throw new YouTube.Error("No videos were found for `" + query + "`");
		this.results = result.items;
	}
}

export namespace YouTube {
	export interface Like extends Embeddable.Like<YouTube.Response.ItemUrls> {
		search(query?: string);
	} export declare const Like: {
		prototype: Like;

		new(parsedCommand: GenericBot.Command.Parser.ParsedCommand): Like;
	};

	export class Error extends Google.Error {}

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
				return new Url();
			}

			export function getThumbnailUrl(item: Item): Url {
				if (item.snippet && item.snippet.thumbnails) {
					const thumbnail: Thumbnail = item.snippet.thumbnails.high ? item.snippet.thumbnails.high : item.snippet.thumbnails.medium ? item.snippet.thumbnails.medium : item.snippet.thumbnails.default ? item.snippet.thumbnails.default : undefined;
					
					if (thumbnail && thumbnail.url)
						return new Url(thumbnail.url);
				}
				return new Url();
			}

			export function getVideoUrl(resource: Resource): Url {
				if (resource.videoId)
					return YouTube.Urls.watch.setQuery(new Query({ v: resource.videoId }));
				return new Url();
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

import { ChannelMonitor as YouTubeChannelMonitor } from "./YouTube/ChannelMonitor";

export namespace YouTube {
	export import ChannelMonitor = YouTubeChannelMonitor;
}