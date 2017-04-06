declare module Intl {
	type PartialPick<T, K extends keyof T> = Partial<Pick<T, K>>;
	type TimeFormatOptionKeys = "formatMatcher" | "hour" | "hour12" | "localeMatcher" | "minute" | "second" | "timeZone" | "timeZoneName";
	export type TimeFormatOptions = PartialPick<DateTimeFormatOptions, TimeFormatOptionKeys>;

	export class TimeFormat extends DateTimeFormat {
		public static readonly defaultLocaleOptions: TimeFormatOptions;
		public static readonly unimplementedLocaleOptions: DateTimeFormatOptions;

		constructor(locales?: Array<string> | string, options?: TimeFormatOptions);
	}
}