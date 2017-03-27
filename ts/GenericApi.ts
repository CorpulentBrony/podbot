import * as Http from "http";
import * as Https from "https";
import * as JSONStream from "JSONStream";
import { Path, Query, Url } from "./Url";
import * as URL from "url";

// add support for sending/receiving http requests using gzip encoding
// http://stackoverflow.com/questions/8880741/node-js-easy-http-requests-with-gzip-deflate-compression

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

	private buildRequestOptions(method: GenericApi.Method, query?: Query): Https.RequestOptions { return Object.assign({ agent: this.agent, headers: this.headers, method }, this.url.setQuery(query).toNodeUrl()); }
	public async getJson<T>(query?: Query): Promise<T> { return this.processAsyncRequest<T>("GET", query); }

	private async processAsyncRequest<T>(method: GenericApi.Method, query?: Query): Promise<T> {
		return new Promise<T>((resolve: (value: T | PromiseLike<T>) => void, reject: (reason?: any) => void): void => {
			const options: Https.RequestOptions = this.buildRequestOptions(method, query);
			Https.request(options, (result: Http.IncomingMessage): void => {
				let error: Error;

				if (result.statusCode === 304)
					resolve.call(this, undefined);

				if (result.statusCode !== 200)
					error = new Error("HTTPS request failed.  Status code: " + result.statusCode.toString());
				else if (!/^application\/json/.test(result.headers["content-type"]))
					error = new Error("Invalid content-type for HTTPS request.  Expected application/json but received " + result.headers["content-type"]);

				if (error) {
					reject(error);
					result.resume();
					return;
				}
				let rawResults: string = "";
				result.setEncoding("utf8");
				result.on("data", (chunk: string): any => rawResults += chunk);
				result.on("end", (): void => {
					try {
						resolve.call(this, JSON.parse(rawResults));
					} catch (error) {
						reject(error);
					}
				});
			})
			.on("error", reject)
			.end();
		});
	}
}

class GenericApiError extends Error {}

export namespace GenericApi {
	export type Headers = { [key: string]: string };
	export type Method = "GET" | "POST";

	export const keepAliveHeader: Headers & { Connection: "keep-alive" } = { Connection: "keep-alive" };

	export class Error extends GenericApiError {}
	export class RequestError extends Error {}

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
}