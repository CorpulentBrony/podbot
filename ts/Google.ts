import { Collection } from "./Collection";
import * as Crypt from "./Crypt";
import { GenericApi } from "./GenericApi";
import { GenericBot } from "./GenericBot";
import { Embed, Reactor } from "./Reactor";
import { Path, Query, Url } from "./Url";

export const GOOGLE_API_BASE_URL: string = "https://www.googleapis.com";
const GOOGLE_MAPS_BASE_API: string = "https://maps.googleapis.com";
const GOOGLE_SEARCH_API: string = "/customsearch/v1";
const GOOGLE_MAPS_TIMEZONE_API: string = "/maps/api/timezone/json";


// https://console.developers.google.com/apis/credentials?project=podbot-1487985738290

// google tz
//https://maps.googleapis.com/maps/api/timezone/json?location=28.419097,-81.228514&timestamp=1489803820&key=

// youtube search
// https://developers.google.com/youtube/v3/docs/search/list
// https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=UCSA4z111ZYEzsxwNEgrrS7A&maxResults=50&type=video&key=
// https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&playlistId=PLYwK4VQSqT-v3-7lp-eXaJD62-mrzuaj6&maxResults=50&key=
export const favIconUrl: Url = new Url("https://www.google.com/images/branding/product/ico/googleg_lodp.ico");
export const genericQueryUrl: Url = new Url("https://www.google.com/search");
const url: Url = new Url(GOOGLE_API_BASE_URL + GOOGLE_SEARCH_API);
let query: Query;

class GoogleError extends Error {}

export class Search {

}

export class Timezone {

}

// search functionality, accessible from bot, similar to search on db
// option to set up query to a playlist to look for new items.  perhaps emit an event that can be consumed elsewhere?





async function getQuery() {
	const secrets: Crypt.SecretsGoogle = await Crypt.getSecrets("Google");
	Object.defineProperty(secrets, "key", Object.getOwnPropertyDescriptor(secrets, "api"));
	delete secrets.api;
	query = new Query(secrets);
}

getQuery().catch(console.error);

async function get<T>(path: string): Promise<T> { return GenericApi.Get.json<T>(url, query.set("q", path)); }
export async function search(query: string): Promise<Search.Response> { return get<Search.Response>(query); }

export namespace Search {
	export interface Response {
		items: Array<ResponseItem>;
		searchInformation: {
			searchTime: number;
			formattedSearchTime: string;
			totalResults: string;
			formattedTotalResults: string;
		};
	}

	export interface ResponseItem {
		displayLink: string;
		formattedUrl: string;
		link: string;
		pagemap: {
			cse_image?: Array<{
				src: string;
			}>;
			cse_thumbnail?: Array<{
				height: string;
				src: string;
				width: string;
			}>;
		};
		snippet: string;
		title: string;
	}
}	