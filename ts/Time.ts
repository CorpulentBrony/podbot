import "./TimeFormat";
const TZ: string = "America/New_York";

export class Time extends Date implements Time.Like {
	private static unimplementedMethods: Set<string> = new Set(["getDate", "getDay", "getFullYear", "getMonth", "getUTCDate", "getUTCDay", "getUTCFullYear", "getUTCMonth", "getYear", "setDate", "setFullYear", "setMonth", "setUTCDate", "setUTCFullYear", "setUTCMonth", "setUTCSeconds", "setYear", "toDateString", "toGMTString", "toLocaleDateString", "toLocaleFormat"]);

	private static getErrorMessage(strings: TemplateStringsArray, methodName: string): string { return `${this.name}.${methodName} is not a function`; }

	private static hmsToMs(hour: number, minute: number, second: number, millisecond: number): number {
		return hour * Time.MillisecondsIn.Hour + this.minuteToMs(minute) + this.secondToMs(second) * Time.MillisecondsIn.Second + millisecond;
	}

	private static limitMs(milliseconds: number): number { return milliseconds % Time.MillisecondsIn.Day; }
	private static minuteToMs(minutes: number): number { return minutes * Time.MillisecondsIn.Minute; }
	public static now(): number { return this.limitMs(Date.now()); }
	public static parse(time: string): number { return super.parse(`1970-01-01T${time}`); }
	private static secondToMs(seconds: number): number { return seconds * Time.MillisecondsIn.Second; }
	public static UTC(hour: number = 0, minute: number = 0, second: number = 0, millisecond: number = 0): number { return super.UTC(1970, 0, 1, 0, 0, 0, this.limitMs(this.hmsToMs(hour, minute, second, millisecond))); }

	constructor();
	constructor(value: number);
	constructor(timeString: string);
	constructor(hours: number, minutes: number, seconds?: number, milliseconds?: number);
	constructor(valueOrTimeStringOrHours?: number | string, minutes?: number, seconds: number = 0, milliseconds: number = 0) {
		if (typeof valueOrTimeStringOrHours === "number") {
			if (typeof minutes === "number")
				valueOrTimeStringOrHours = Time.hmsToMs(valueOrTimeStringOrHours, minutes, seconds, milliseconds);
			super(Time.limitMs(valueOrTimeStringOrHours));
		} else if (typeof valueOrTimeStringOrHours === "string")
			super(`1970-01-01T${valueOrTimeStringOrHours}`);
		else
			super(Time.now());
		this.disableUnimplementedMethods();
	}

	private disableUnimplementedMethods(): void {
		const properties: PropertyDescriptorMap = {};

		for (const method of Time.unimplementedMethods)
			properties[method] = { value: (args: Array<any>): any => { throw new TypeError(Time.getErrorMessage`${method}`); } };
		Object.defineProperties(this, properties);
	}

	public setHours(hoursValue: number, minutesValue: number = 0, secondsValue: number = 0, msValue: number = 0): number { return super.setHours(0, 0, 0, Time.limitMs(Time.hmsToMs(hoursValue, minutesValue, secondsValue, msValue))); }
	public setMilliseconds(millisecondsValue: number): number { return super.setMilliseconds(Time.limitMs(millisecondsValue)); }
	public setMinutes(minutesValue: number, secondsValue: number = 0, msValue: number = 0): number { return super.setMinutes(0, 0, Time.limitMs(Time.minuteToMs(minutesValue) + Time.secondToMs(secondsValue) + msValue)); }
	public setSeconds(secondsValue: number, msValue: number = 0): number { return super.setSeconds(0, Time.limitMs(Time.secondToMs(secondsValue) + msValue)); }
	public setTime(timeValue: number): number { return super.setTime(Time.limitMs(timeValue)); }
	public setUTCHours(hoursValue: number, minutesValue: number = 0, secondsValue: number = 0, msValue: number = 0): number { return super.setUTCHours(0, 0, 0, Time.limitMs(Time.hmsToMs(hoursValue, minutesValue, secondsValue, msValue))); }
	public setUTCMilliseconds(millisecondsValue: number): number { return super.setUTCMilliseconds(Time.limitMs(millisecondsValue)); }
	public setUTCMinutes(minutesValue: number, secondsValue: number = 0, msValue: number = 0): number { return super.setUTCMinutes(0, 0, Time.limitMs(Time.minuteToMs(minutesValue) + Time.secondToMs(secondsValue) + msValue)); }
	public setUTCSeconds(secondsValue: number, msValue: number = 0): number { return super.setUTCSeconds(0, Time.limitMs(Time.secondToMs(secondsValue) + msValue)); }
	public toISOString(): string { return super.toISOString().split("T")[1]; }
	public toLocaleString(locales?: Array<string> | string, options: Intl.TimeFormatOptions = {}): string { return super.toLocaleTimeString(locales, Object.assign(options, Intl.TimeFormat.unimplementedLocaleOptions)); }
	public toString(): string { return super.toTimeString(); }
	public toUTCString(): string { return super.toUTCString().split(" ").slice(4).join(" "); }
}

export namespace Time {
	export interface Like extends Date {
		constructor: typeof Like;

		toLocaleString(locales?: Array<string> | string, options?: Intl.TimeFormatOptions): string;
	} export declare const Like: Function | {
		prototype: Like;
		readonly MillisecondsIn: typeof MillisecondsIn;
		readonly unimplementedLocaleOptions: Intl.DateTimeFormatOptions;

		new(): Like;
		new(value: number): Like;
		new(timeString: string): Like;
		new(hours: number, minutes: number, seconds?: number, milliseconds?: number): Like;
		parse(time: string): number;
		UTC(hour?: number, minute?: number, second?: number, millisecond?: number): number;
	};

	export enum MillisecondsIn {
		Second = 1000,
		Minute = 60 * Second,
		Hour = 60 * Minute,
		Day = 24 * Hour
	}
}