import { GenericApi } from "../GenericApi";
import { Google } from "../Google";
import { Path, Query, Url } from "../Url";

const GOOGLE_MAPS_TIMEZONE_API: string = "/maps/api/timezone/json";

export class Timezone implements Google.Timezone.Like {
	public readonly latitude: number;
	public readonly longitude: number;
	public readonly query: Query;
	public result: Google.Timezone.Result;
	private timer: NodeJS.Timer;

	constructor(latitude: number, longitude: number) { [this.latitude, this.longitude, this.query] = [latitude, longitude, new Query()]; }

	public get abbreviation(): string { return (this.result && this.result.timeZoneName) ? this.result.timeZoneName.split(" ").map<string>((word: string): string => word.charAt(0)).join("") : undefined; }

	public get currentDateTime(): string {
		if (this.isReady) {
			const currentTimestamp: number = this.currentTimestamp;

			if (typeof currentTimestamp !== "undefined") {
				const result: Date = new Date(currentTimestamp);
				const offsetHours: number = this.offsetHours;
				const offsetHoursString: string = ((offsetHours < 0) ? "" : "+") + Math.trunc(offsetHours).toString() + ":" + ((offsetHours === offsetHours >> 0) ? "00" : Math.round(offsetHours - (offsetHours >> 0)).toString());
				return result.toString() + " GMT" + offsetHoursString + " (" + this.abbreviation + ")";
			}
		}
		return Date();
	}

	public get currentTimestamp(): number {
		const offset: number = this.offset;
		return (typeof offset !== "undefined") ? Date.now() + offset : undefined;
	}

	public get isReady(): boolean { return typeof this.result !== "undefined"; }
	public get location(): string { return (typeof this.latitude !== "undefined" && typeof this.longitude !== "undefined") ? this.latitude.toString() + "," + this.longitude.toString() : ""; }
	public get name(): string { return (this.result && this.result.timeZoneName) ? this.result.timeZoneName : undefined; }
	public get offset(): number { return (this.result && typeof this.result.rawOffset !== "undefined") ? ((this.result.dstOffset ? this.result.dstOffset : 0) + this.result.rawOffset) * 1000 : undefined; }

	public get offsetHours(): number {
		const result: number = this.offset;
		return (typeof result !== "undefined") ? result / 1000 / 60 / 60 : undefined;
	}
	private async configureQuery(timestamp: number) { this.query.set("key", await Google.getKey()).set("location", this.location).set("timestamp", Math.round(timestamp / 1000)); }
	public async execute(name: string, color: string = "") { await this.setTimer(color + " " + this.currentDateTime.slice(4, 24) + " <" + name + "> "); }

	private async setTimer(message: string) {
		console.log(message + "Updating timezone data!");
		await this.update();
		const currentTimestamp: number = this.currentTimestamp;

		if (typeof currentTimestamp !== "undefined") {
			const nextUpdateDate: Date = new Date(currentTimestamp);
			nextUpdateDate.setDate(nextUpdateDate.getDate() + 1);
			nextUpdateDate.setHours(2, 1);
			this.timer = setTimeout(() => { this.setTimer(message); }, nextUpdateDate.getTime() - (Date.now() + this.offset));
		} else
			this.timer = setTimeout(() => { this.setTimer(message); }, 60000);
	}

	public async update(timestamp: number = Date.now()) {
		if (typeof timestamp === "undefined" || timestamp < 0)
			return;
		await this.configureQuery(timestamp);
		const result: Google.Timezone.Result = await GenericApi.Get.json<Google.Timezone.Result>(Google.Timezone.Urls.api, this.query);

		if (!result)
			throw new Google.Timezone.Error("Google Timezone request failed with unknown status");
		else if (result.status !== "OK")
			throw new Google.Timezone.Error("Google Timezone request failed with status " + result.status + (result.error_message ? ": " + result.error_message : ""));
		this.result = result;
	}
}

export namespace Timezone {
	export interface Like {
		readonly abbreviation: string;
		readonly currentDateTime: string;
		readonly currentTimestamp: number;
		readonly isReady: boolean;
		readonly latitude: number;
		readonly location: string;
		readonly longitude: number;
		readonly name: string;
		readonly offset: number;
		readonly offsetHours: number;
		readonly query: Query;

		execute(prefix?: string);
		update(timestamp?: number);
	} export declare const Like: {
		prototype: Like;

		new(latitude: number, longitude: number): Like;
	};

	export interface Result {
		dstOffset?: number;
		error_message?: string;
		rawOffset?: number;
		status: "INVALID_REQUEST" | "OK" | "OVER_QUERY_LIMIT" | "REQUEST_DENIED" | "UNKNOWN_ERROR" | "ZERO_RESULTS";
		timeZoneId?: string;
		timeZoneName?: string;
	}

	export class Error extends Google.Error {}

	namespace Paths {
		export const api: Path = new Path(GOOGLE_MAPS_TIMEZONE_API);
	}

	export namespace Urls {
		export const api: Url = Google.Maps.Urls.api.setPathname(Paths.api);
	}
}