import * as Events from "events";
import "./TimeFormat";

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
	constructor(time: Time);
	constructor(date: Date);
	constructor(valueOrTimeStringOrTimeOrDate: Time.InputTypes);
	constructor(hours: number, minutes: number, seconds?: number, milliseconds?: number);
	constructor(valueOrTimeStringOrTimeOrDateOrHours?: Time.InputTypes, minutes?: number, seconds: number = 0, milliseconds: number = 0) {
		if (valueOrTimeStringOrTimeOrDateOrHours instanceof Time || valueOrTimeStringOrTimeOrDateOrHours instanceof Date)
			valueOrTimeStringOrTimeOrDateOrHours = valueOrTimeStringOrTimeOrDateOrHours.getTime();

		if (typeof valueOrTimeStringOrTimeOrDateOrHours === "number") {
			if (typeof minutes === "number")
				valueOrTimeStringOrTimeOrDateOrHours = Time.hmsToMs(valueOrTimeStringOrTimeOrDateOrHours, minutes, seconds, milliseconds);
			super(Time.limitMs(valueOrTimeStringOrTimeOrDateOrHours));
		} else if (typeof valueOrTimeStringOrTimeOrDateOrHours === "string")
			super(`1970-01-01T${valueOrTimeStringOrTimeOrDateOrHours}`);
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
	public until(to: Time.InputTypes): Time { return Time.Duration.from({ from: this, to }).time; }
}

export namespace Time {
	export interface Like extends Date {
		constructor: typeof Like;

		toLocaleString(locales?: Array<string> | string, options?: Intl.TimeFormatOptions): string;
		until(to: InputTypes): Like;
	} export declare const Like: Function | {
		prototype: Like;
		readonly MillisecondsIn: typeof MillisecondsIn;
		readonly unimplementedLocaleOptions: Intl.DateTimeFormatOptions;

		new(): Like;
		new(value: number): Like;
		new(timeString: string): Like;
		new(time: Time): Like;
		new(date: Date): Like;
		new(valueOrTimeStringOrTimeOrDate: InputTypes): Like;
		new(hours: number, minutes: number, seconds?: number, milliseconds?: number): Like;
		new(valueOrTimeStringOrTimeOrDateOrHours?: Time.InputTypes, minutes?: number, seconds?: number, milliseconds?: number): Like;
		parse(time: string): number;
		UTC(hour?: number, minute?: number, second?: number, millisecond?: number): number;
	};

	export type InputTypes = Date | number | string | Time;

	export enum MillisecondsIn {
		Second = 1000,
		Minute = 60 * Second,
		Hour = 60 * Minute,
		Day = 24 * Hour
	}
}

class TimeDuration implements TimeDuration.Like {
	private _times: TimeDuration.Times;

	constructor(times: TimeDuration.TimesInput) { this.setTimes(times); }

	public get delta(): number { return (this.from <= this.to) ? this.to.getTime() - this.from.getTime() : Time.MillisecondsIn.Day - this.from.getTime() + this.to.getTime(); }
	public get from(): Time { return this.times.from; }
	public get hours(): number { return this.time.getHours(); }
	public get milliseconds(): number { return this.delta; }
	public get minutes(): number { return this.time.getMinutes(); }
	public get seconds(): number { return this.time.getSeconds(); }
	public get time(): Time { return new Time(this.delta); }
	public get times(): TimeDuration.Times { return this._times; }
	public get to(): Time { return this.times.to; }

	public setFrom(from: Time.InputTypes): void { this.setTimes("from", from); }

	public setTimes(times: TimeDuration.TimesInput): void;
	public setTimes(target: keyof TimeDuration.TimesInput, time: Time.InputTypes): void;
	public setTimes(timesOrTarget: TimeDuration.TimesInput | keyof TimeDuration.TimesInput, time?: Time.InputTypes): void {
		let times: TimeDuration.TimesInput;

		if (typeof timesOrTarget === "string")
			this.times[timesOrTarget] = new Time(time);
		else
			this._times = { from: new Time(timesOrTarget.from), to: new Time(timesOrTarget.to) };
	}

	public setTo(to: Time.InputTypes): void { this.setTimes("to", to); }
}

namespace TimeDuration {
	export interface Like {
		constructor: typeof Like;
		readonly delta: number;
		readonly from: Time;
		readonly hours: number;
		readonly milliseconds: number;
		readonly minutes: number;
		readonly seconds: number;
		readonly time: Time;
		readonly times: Times;
		readonly to: Time;

		setFrom(from: Time.InputTypes): void;
		setTimes(times: TimesInput): void;
		setTimes(target: keyof TimesInput, time: Time.InputTypes): void;
		setTo(to: Time.InputTypes): void;
	} export declare const Like: Function | {
		prototype: Like;

		new(times: Times): Like;
		from(times: Times): Like;
	};

	export interface Times extends TimesAbstract<Time> {}

	interface TimesAbstract<T> {
		from: T;
		to: T;
	}

	export interface TimesInput extends TimesAbstract<Time.InputTypes> {}

	export function from(times: TimesInput): Like { return new TimeDuration(times); }
}

export namespace Time {
	export import Duration = TimeDuration;
}