import { Collection } from "./Collection";
import * as Crypt from "./Crypt";
import { GenericApi } from "./GenericApi";
import { GenericBot } from "./GenericBot";
import { Embed, Reactor } from "./Reactor";
import { Path, Query, Url } from "./Url";

const GOOGLE_API_BASE_URL: string = "https://www.googleapis.com";
const GOOGLE_BASE_URL: string = "https://www.google.com";
const GOOGLE_FAVICON_PATH: string = "/images/branding/product/ico/googleg_lodp.ico";
const GOOGLE_MAPS_BASE_API: string = "https://maps.googleapis.com";
const GOOGLE_SEARCH_API: string = "/customsearch/v1";
const GOOGLE_SEARCH_PATH: string = "/search";
const GOOGLE_MAPS_TIMEZONE_API: string = "/maps/api/timezone/json";

// https://console.developers.google.com/apis/credentials?project=podbot-1487985738290

// mimic layout of YouTube, with Google parent class and Search and Timezone child classes

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

class GoogleSearch {

}

namespace GoogleSearch {
	namespace Paths {
		export const api: Path = new Path(GOOGLE_SEARCH_API);
	}

	export namespace Urls {
		export const api: Url = Google.Urls.api.setPathname(Paths.api);
	}
}


// google tz
//https://maps.googleapis.com/maps/api/timezone/json?location=28.419097,-81.228514&timestamp=1489803820&key=
class GoogleTimezone {

}

namespace GoogleTimezone {

}

export namespace Google {
	export import Search = GoogleSearch;
	export import Timezone = GoogleTimezone;
}

export const favIconUrl: Url = Google.Urls.favIcon;
export const genericQueryUrl: Url = Google.Urls.search;
const url: Url = Google.Search.Urls.api;
let query: Query;






// this should be standardized into google namespace, then modify youtube to leverage it from google
async function getQuery() { query = new Query(await Google.getSecrets()); }

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