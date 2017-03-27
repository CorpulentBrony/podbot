import * as Crypt from "./Crypt";
import { Path, Url } from "./Url";

const GOOGLE_API_BASE_URL: string = "https://www.googleapis.com";
const GOOGLE_BASE_URL: string = "https://www.google.com";
const GOOGLE_FAVICON_PATH: string = "/images/branding/product/ico/googleg_lodp.ico";
const GOOGLE_MAPS_API_BASE_URL: string = "https://maps.googleapis.com";
const GOOGLE_SEARCH_PATH: string = "/search";

// https://console.developers.google.com/apis/credentials?project=podbot-1487985738290

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

import { Search as GoogleSearch } from "./Google/Search";
import { Timezone as GoogleTimezone } from "./Google/Timezone";

export namespace Google {
	export import Search = GoogleSearch;
	export import Timezone = GoogleTimezone;
}