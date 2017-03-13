import { Collection} from "./Collection";
import { GenericApi } from "./GenericApi";
import { Path, Query, Url } from "./Url";
import * as Random from "./Random";

const filter_id: number = 41048;
const url: Url = new Url("https://derpibooru.org");
export const favIconUrl: Url = url.setPathname(new Path("/favicon.ico"));
const pathname: { search: Path, random: Path } = { search: new Path("/search.json"), random: new Path("/images.json") };
const query: { search: Query, random: Query } = { search: new Query({ filter_id }), random: new Query({ filter_id, random_image: true }) };

export class Derpibooru implements Derpibooru.Like {
	public image: Derpibooru.Image;
	public readonly query: Query;
	public readonly type: "random" | "search";
}

export namespace Derpibooru {
	export interface Constructor {}

	export interface Like {}

	export class NoponyError extends Error {}

	export const favIconUrl: Url = url.setPathname(new Path("/favicon.ico"));

	export interface Image extends Response.Image {
		page: number;
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

		export function formatImagePageUrl(image: Image): string { return url.setPathname(new Path("/" + image.id)).toString(); }
		export function formatImageUrl(image: Image): string { return Url.parse(image.image, true).setProtocol("https:").toString(); }
	}
}



export class NoponyError extends Error {}

export async function random(): Promise<Response.Image> {
	const images: Response.Random = await GenericApi.Get.json<Response.Random>(url.setPathname(pathname.random), query.random);
	return (await Random.shuffle<Response.Image>(images.images))[0];
	//return images.images[await Random.integer(images.images.length)];
}

export async function search(search: string): Promise<Response.Image> {
	const searchQuery: Query = query.search.set("q", search);
	const searchUrl: Url = url.setPathname(pathname.search);
	let images: Response.Search = await GenericApi.Get.json<Response.Search>(searchUrl, searchQuery);

	if (images.total === 0)
		throw new NoponyError("No images were found for `" + search + "`");
	const pageNumber: number = await Random.integer(Math.ceil(images.total / 15)) + 1;

	if (pageNumber > 1)
		images = await GenericApi.Get.json<Response.Search>(searchUrl, searchQuery.set("page", pageNumber));
	return (await Random.shuffle<Response.Image>(images.search))[0];
	//return images.search[await Random.integer(images.search.length)];
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

	export function formatImagePageUrl(image: Image): string { return url.setPathname(new Path("/" + image.id)).toString(); }
	export function formatImageUrl(image: Image): string { return Url.parse(image.image, true).setProtocol("https:").toString(); }
}