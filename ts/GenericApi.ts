import { Buffer } from "buffer";
import * as Fs from "fs";
import * as Http from "http";
import * as Https from "https";
import * as Process from "process";
import * as Stream from "stream";
import { Path, Query, Url } from "./Url";
import * as Zlib from "zlib";

// should be "deflate", "gzip", "deflate, gzip", or "identity"; this is sent as accept-encoding with http request
const ACCEPT_ENCODING: string = "deflate, gzip";
const APP_NAME: string = "podbot";
const APP_URL: string = "https://iwtcits.com";
// file that stores a version reference for the app (must be given in relation to app location and should be utf8 encoded)
const APP_VERSION_FILE: string = ".git/refs/heads/master";
// this is sent as user-agent with the http request.  the text "NOT_YET_CALCULATED" will be replaced with the app version
const DEFAULT_USER_AGENT: string = `${APP_NAME}/NOT_YET_CALCULATED (${Process.platform}; ${Process.arch}; ${ACCEPT_ENCODING}; +${APP_URL}) node/${Process.version}`;

export class GenericApi {
	private agent: Https.Agent;
	private headers: { [key: string]: string };
	private url: Url;

	constructor(url: Url, useKeepAlive?: boolean, headers?: GenericApi.Headers, port?: number);
	constructor(hostname: string, useKeepAlive?: boolean, headers?: GenericApi.Headers);
	constructor(urlOrHostname: string | Url, useKeepAlive: boolean = true, headers?: GenericApi.Headers, port: number = 443) {
		this.url = (urlOrHostname instanceof Url) ? urlOrHostname : new Url({ hostname: urlOrHostname, port, protocol: "https:", slashes: true });
		[this.agent, this.headers] = [new Https.Agent({ keepAlive: useKeepAlive }), useKeepAlive ? Object.assign(headers ? headers : {}, GenericApi.keepAliveHeader) : headers];
	}

	private buildRequestOptions(method: GenericApi.Method, query?: Query): Https.RequestOptions {
		return Object.assign({ agent: this.agent, headers: Object.assign(this.headers, GenericApi.defaultHeaders), method }, this.url.setQuery(query).toNodeUrl());
	}

	public async getJson<T>(query?: Query): Promise<T> { return this.processAsyncRequest<T>("GET", query); }

	private async processAsyncRequest<T>(method: GenericApi.Method, query?: Query): Promise<T> {
		return new Promise<T>((resolve: (value: T | PromiseLike<T>) => void, reject: (reason?: any) => void): void => {
			Https.request(this.buildRequestOptions(method, query), (response: Http.IncomingMessage): void => {
				let error: Error;

				if (response.statusCode === 304)
					resolve.call(this, undefined);

				if (response.statusCode !== 200)
					error = new Error("HTTPS request failed.  Status code: " + response.statusCode.toString());
				else if (!/^application\/json/.test(<string>response.headers["content-type"]))
					error = new Error("Invalid content-type for HTTPS request.  Expected application/json but received " + response.headers["content-type"]);

				if (error) {
					reject(error);
					response.resume();
					return;
				}
				const finalize: Stream.PassThrough = new Stream.PassThrough();
				let objectString: string = "";
				finalize.on("data", (chunk: Buffer): void => { objectString += chunk.toString(); });
				finalize.on("end", (): void => {
					try { resolve.call(this, JSON.parse(objectString)); }
					catch (err) { reject(err); }
				});

				switch (response.headers["content-encoding"]) {
					case "gzip":
						response.pipe(Zlib.createGunzip()).pipe(finalize);
						break;
					case "deflate":
						response.pipe(Zlib.createInflate()).pipe(finalize);
						break;
					default:
						response.pipe(finalize);
				}
			})
			.on("error", reject)
			.end();
		});
	}
}

class GenericApiError extends Error {}

export namespace GenericApi {
	type DefaultHeaders = Headers & { ["accept-encoding"]: string } & { ["user-agent"]: string };
	export type Headers = { [key: string]: string };
	export type Method = "GET" | "POST";

	const compressionHeader: Headers & { ["accept-encoding"]: string } = { ["accept-encoding"]: ACCEPT_ENCODING };
	export const keepAliveHeader: Headers & { connection: "keep-alive" } = { connection: "keep-alive" };
	export let defaultHeaders: DefaultHeaders = Object.assign({ ["user-agent"]: DEFAULT_USER_AGENT }, compressionHeader);
	let defaultHeadersSet: boolean = false;

	export class Error extends GenericApiError {}
	export class RequestError extends Error {}

	async function getVersion(): Promise<string> {
		const cwd: Path = new Path(Process.cwd());
		const result: string = await new Promise<string>((resolve: (value: string | PromiseLike<string>) => void, reject: (reason?: any) => void): void => {
			Fs.readFile(cwd.join(APP_VERSION_FILE).toString(), { encoding: "utf8" }, (error: Error, data: string): void => {
				if (error)
					reject(error);
				resolve(data);
			})
		});
		return result.trim();
	}

	async function setDefaultHeaders() {
		if (defaultHeadersSet)
			return;
		defaultHeaders["user-agent"] = defaultHeaders["user-agent"].replace(/NOT_YET_CALCULATED/g, await getVersion());
		defaultHeadersSet = true;
	}

	export namespace Cache {
		const agentCache: Map<boolean, Https.Agent> = new Map<boolean, Https.Agent>();
		const agentCreator: (keepAlive: boolean) => Https.Agent = (keepAlive: boolean) => new Https.Agent({ keepAlive });

		export function agent(useKeepAlive: boolean): Https.Agent { return genericGetter<boolean, Https.Agent>(useKeepAlive, agentCache, agentCreator, { keepAlive: useKeepAlive }); }

		function genericGetter<KeyType, ValueType>(key: KeyType, cache: Map<KeyType, ValueType>, valueGenerator: (...parameters: Array<any>) => ValueType, ...newArguments: Array<any>): ValueType {
			return cache.has(key) ? cache.get(key) : cache.set(key, valueGenerator.call(this, ...newArguments)).get(key);
		}
	}

	export namespace Get {
		export async function json<T>(url: Url, query?: Query, headers?: GenericApi.Headers, method: Method = "GET"): Promise<T> {
			const request: GenericApi = new GenericApi(url, true, headers);
			return request.getJson<T>(query);
		}
	}

	setDefaultHeaders().catch(console.error);
}