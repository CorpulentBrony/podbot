import { GenericApi } from "./GenericApi";
import * as He from "he";
import { Path, Url } from "./Url";
import * as Random from "./Random";

// bug when post is too long, thought i fixed it but it isn't fixed yet

const board: string = "mlp";
const delaySeconds: number = 60;
export const favIconUrl: Url = new Url("http://s.4cdn.org/image/apple-touch-icon-iphone-retina.png");
const parentUrl: Url = new Url("https://a.4cdn.org/" + board + "/");

export class FourChanError extends Error {}
export class NoPageError extends FourChanError {}
export class NoThreadError extends FourChanError {}

export namespace Catalog {
	const url: Url = parentUrl.setPathname(parentUrl.pathname.join("catalog.json"));

	async function load(): Promise<Response.Catalog> {
		if (Date.now() - Cache.LastUpdate.catalog.getTime() > delaySeconds * 1000)
			[Cache.LastUpdate.catalog, Cache.catalog] = [new Date(), GenericApi.Get.json<Response.Catalog>(url)];
		return Cache.catalog;
	}

	export async function random(): Promise<Response.Thread> {
		const pages: Response.Catalog = await load();

		if (pages.length === 0)
			throw new NoPageError("No pages returned from server.");
		const pageNumber: number = await Random.integer(pages.length);
		const page: Response.Page = pages[pageNumber];
		return Object.assign(page.threads[await Random.integer(page.threads.length)], { pageNumber });
	}

	export async function search(query: string): Promise<Response.Thread> {
		const pages: Response.Catalog = await load();

		if (pages.length === 0)
			throw new NoPageError("No pages returned from server.");

		for (const page of pages)
			for (const thread of page.threads)
				if ((new RegExp(query, "gi")).test(thread.sub) || (new RegExp(query, "gi")).test(thread.com))
					return Object.assign(thread, { pageNumber: page.page });
		throw new NoThreadError("No threads matched the search query.");
	}

	export namespace Response {
		export type Catalog = Array<Response.Page>;

		export interface Page {
			page: number;
			threads: Array<Thread>;
		}

		export interface Thread extends Thread.Response.Post {
			images: number;
			pageNumber: number;
			replies: number;
			sub: string;
		}
	}
}

export namespace Thread {
	const url: Url = parentUrl.setPathname(parentUrl.pathname.join("thread/"));

	export class Error extends FourChanError {}

	async function load(num: number): Promise<Response.Thread> {
		if (!Cache.threads.has(num) || Date.now() - Cache.threads.get(num).lastUpdate.getTime() > delaySeconds * 1000)
			Cache.threads.set(num, { lastUpdate: new Date(), thread: GenericApi.Get.json<Response.Thread>(url.setPathname(url.pathname.join(num.toString() + ".json"))) });
		return Cache.threads.get(num).thread;
	}

	export async function random(thread: Catalog.Response.Thread, mustHaveImage: boolean = false): Promise<Response.Post> {
		const posts: Response.Thread = await load(thread.no);

		if (!posts.posts || posts.posts.length === 0)
			throw new NoThreadError("Cannot find thread number " + thread.no.toString() + ".");

		if (mustHaveImage) {
			const chosenNumbers: Set<number> = new Set<number>();

			for (let i: number = 0; i < posts.posts.length; i++) {
				let postNumber: number = await Random.integer(posts.posts.length);
				
				for (let j: number = 0; j < posts.posts.length * 4 && chosenNumbers.has(postNumber); j++, postNumber = await Random.integer(posts.posts.length));

				if (chosenNumbers.has(postNumber))
					throw new Error("Couldn't find a suitably random number!");
				else if (posts.posts[postNumber].tim && posts.posts[postNumber].ext)
					return posts.posts[postNumber];
				chosenNumbers.add(postNumber);
			}
			throw new Error("No posts in thread " + thread.no.toString() + " appear to have an image.");
		}
		const postNumber: number = await Random.integer(posts.posts.length);
		return posts.posts[postNumber];
	}

	export async function randomImage(thread: Catalog.Response.Thread): Promise<string> { return formatPostImage(await random(thread, true)); }

	export namespace Response {
		export interface Post {
			com: string;
			ext?: string;
			filename?: string;
			name: string;
			no: number;
			tim?: number;
		}

		export interface Thread { posts: Array<Post>; }
	}
}

namespace Cache {
	interface Thread {
		lastUpdate: Date;
		thread: Promise<Thread.Response.Thread>;
	}

	export const threads: Map<number, Thread> = new Map<number, Thread>();
	export let catalog: Promise<Catalog.Response.Catalog>;

	export namespace LastUpdate {
		export let catalog: Date = new Date(0);
	}

	function threadGarbageCollector(): void {
		for (const thread of threads)
			if (Date.now() - thread[1].lastUpdate.getTime() > delaySeconds * 10000)
				threads.delete(thread[0]);
	}

	setInterval(threadGarbageCollector, delaySeconds * 5000);
}

function formatHtml(html: string): string { return (html == undefined) ? "" : He.decode(html.replace(/<br>/g, "\n").replace(/<[^>]*>/g, "")); }
export function formatPostComment(post: Thread.Response.Post): string { return formatHtml(post.com); }
export function formatPostImage(post: Thread.Response.Post): string { return "https://i.4cdn.org/" + board + "/" + post.tim + post.ext; }
export function formatThreadSubject(thread: Catalog.Response.Thread): string { return formatHtml(thread.sub); }
export function formatThreadUrl(thread: Catalog.Response.Thread): string { return "https://boards.4chan.org/" + board + "/thread/" + thread.no; }