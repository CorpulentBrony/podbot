/// <reference path="./TimeFormat.d.ts" />
import { Time } from "./Time";

class TimeFormat extends Intl.DateTimeFormat implements Intl.TimeFormat {
	constructor(locales?: Array<string> | string, options: Intl.TimeFormatOptions = {}) {
		Object.assign(options, Intl.TimeFormat.unimplementedLocaleOptions);

		if (!options.hour && !options.minute && !options.second)
			Object.assign(options, Intl.TimeFormat.defaultLocaleOptions);
		super(locales, options);
	}

	public format(time: Time): string { return super.format(time); }
}

namespace TimeFormat {
	export const defaultLocaleOptions: Intl.TimeFormatOptions = { hour: "numeric", minute: "numeric", second: "numeric" };
	export const unimplementedLocaleOptions: Intl.DateTimeFormatOptions = { day: undefined, era: undefined, month: undefined, weekday: undefined, year: undefined };
}

Intl.TimeFormat = TimeFormat;