import * as EventEmitter from "events";
import { GenericApi } from "../GenericApi";
import { Google } from "../Google";
import { Path, Query, Url } from "../Url";
import { YouTube } from "../YouTube";

const YOUTUBE_API_ACTIVITIES_PATH: string = "activities";

export class ChannelMonitor extends EventEmitter implements YouTube.ChannelMonitor.Like {
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

	public async configureQuery() { this.query.set("maxResults", 10).set("part", "contentDetails").set("channelId", this.channelId).set("key", await Google.getKey()); }

	public async refresh() {
		try {
			await this.configureQuery();
			const headers: GenericApi.Headers = this.etag ? { "if-none-match": this.etag } : {};
			const result: YouTube.Response.Result = await GenericApi.Get.json<YouTube.Response.Result>(YouTube.ChannelMonitor.Urls.api, this.query, headers);
			super.emit("response", result);

			if (result && result.items && result.items.length > 0) {
				const lastVideo: YouTube.Response.Item = YouTube.ChannelMonitor.findMostRecentUpload(result.items);
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

export namespace ChannelMonitor {
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

	export class Error extends YouTube.Error {}

	namespace Paths {
		export const api: Path = YouTube.Paths.apiBase.join(YOUTUBE_API_ACTIVITIES_PATH);
	}

	export namespace Urls {
		export const api: Url = YouTube.Urls.apiBase.setPathname(Paths.api);
	}
}