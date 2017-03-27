import * as NodeUrl from "url";
import { Path } from "./Path";
import { Query } from "./Query";

export class Url implements Url.Like {
	public hash: string = null;
	public hostname: string = null;
	public pathname: Path = null;
	public port: number = null;
	public protocol: string = null;
	public query: Query = null;
	public slashes: boolean = true;
	
	constructor();
	constructor(url: Url | Url.Like);
	constructor(href: string, slashesDenoteHost?: boolean);
	constructor(hrefOrUrl?: string | Url | Url.Like, slashesDenoteHost: boolean = false) {
		if (typeof hrefOrUrl === "undefined")
			this.slashes = false;
		else if (hrefOrUrl instanceof Url)
			({ hash: this.hash, hostname: this.hostname, pathname: this.pathname, port: this.port, protocol: this.protocol, query: this.query, slashes: this.slashes } = hrefOrUrl);
		else {
			let url: Url.Like;

			if (Url.isUrlLike(hrefOrUrl))
				url = hrefOrUrl;
			else
				url = NodeUrl.parse(hrefOrUrl, false, slashesDenoteHost);
			({ hash: this.hash, hostname: this.hostname, protocol: this.protocol, slashes: this.slashes } = url);
			this.pathname = new Path(url.pathname);
			this.port = (typeof url.port === "string") ? Number.parseInt(url.port) : url.port;
			this.query = new Query(url.query);
		}
	}

	public get host(): string { return this.hostname ? (this.hostname + (this.port ? ":" + this.port.toString() : "")): null; }

	public get href(): string {
		const result: string = (this.protocol ? this.protocol : "") + (this.slashes ? "//" : "") + (this.host ? this.host : "") + (this.path ? this.path : "") + (this.hash ? this.hash : "");
		return (result === "") ? null : result;
	}

	public get path(): string {
		const result: string = (this.pathname ? this.pathname : "") + (this.search ? this.search : "");
		return (result === "") ? null : result;
	}

	public get search(): string { return (this.query && this.query.size > 0) ? "?" + this.query.toString() : null; }

	public clone(url?: Url.Like): Url {
		const result: Url = new Url(this);
		return (url === undefined) ? result : Object.assign(result, url);
	}

	public resolve(href: string): string { return NodeUrl.resolve(this.toString(), href); }
	public setPathname(pathname: Path): Url { return (pathname === undefined || pathname === this.pathname) ? this : this.clone({ pathname }); }
	public setProtocol(protocol: string): Url { return (protocol === undefined || protocol === this.protocol) ? this : this.clone({ protocol }); }
	public setQuery(query: Query): Url { return (query === undefined || query === this.query) ? this : this.clone({ query }); }
	public toNodeUrl(): Url.Like { return { hostname: this.hostname, path: this.path, port: this.port, protocol: this.protocol }; }
	public toString(): string { return this.href; }
}

export namespace Url {
	export interface Constructor {
		new(url: string | Url | Like): Url;
		new(href: string, slashesDenoteHost?: boolean): Url;
		format(url: string | Url): string;
		isUrlLike(obj: any): obj is Like;
		parse(url: string, slashesDenoteHost?: boolean): Url;
	}

	export interface Like {
		hash?: string;
		readonly host?: string;
		hostname?: string;
		readonly href?: string;
		readonly path?: string;
		pathname?: string | Path;
		port?: number | string;
		protocol?: string;
		query?: string | Query;
		readonly search?: string;
		slashes?: boolean;
	}

	export function isUrlLike(obj: any): obj is Like {
		if (obj != null && typeOfOrNull<string>(obj.hash, "string") && typeOfOrNull<string>(obj.hostname, "string") && typeOfOrNull<number | string>(obj.port, "number", "string") && typeOfOrNull<string>(obj.protocol, "string") 
			&& typeOfOrNull<boolean>(obj.slashes, "boolean"))
				return (typeOfOrNull<string>(obj.pathname, "string") || obj.pathname instanceof Path) && (typeOfOrNull<string>(obj.query, "string") || obj.query instanceof Query);
		return false;
	}

	export function parse(url: string, slashesDenoteHost: boolean = false): Url { return new Url(url, slashesDenoteHost); }

	function typeOfOrNull<T>(primitive: any, ...type: Array<"boolean" | "number" | "string" | "symbol">): primitive is T {
		return primitive === null || type.some((value: "boolean" | "number" | "string" | "symbol"): boolean => typeof primitive === value);
	}
}

export * from "./Path";
export * from "./Query";