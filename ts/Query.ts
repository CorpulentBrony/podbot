import * as NodeQuerystring from "querystring";

export class Query extends Map<string, Query.SupportedTypes> implements Query.Like {
	public equals: string;
	public seperator: string;

	constructor(query?: string | Object | Query.Items, seperator: string = "&", equals: string = "=") {
		if (query instanceof Query) {
			super(query);
			({ equals: this.equals, seperator: this.seperator} = query);
		}
		else {
			super();
			const items: Query.Items = (typeof query === "string") ? NodeQuerystring.parse(query, seperator, equals) : query;

			for (const item in items)
				super.set(item, items[item]);
			[this.equals, this.seperator] = [equals, seperator];
		}
	}

	public stringify(): string { return this.toString(); }

	public toObject(): Query.Items {
		const items: Query.Items = {};

		for (const item of super[Symbol.iterator]())
			Object.assign(items, { [item[0]]: item[1] });
		return items;
	}

	public toString(): string { return NodeQuerystring.stringify(this.toObject(), this.seperator, this.equals); }
}

export namespace Query {
	export type SupportedTypes = boolean | number | string;
	export interface Constructor { new(query: string | Query, seperator?: string, equals?: string): Query; }
	export interface Items { [key: string]: SupportedTypes; }

	export interface Like extends Map<string, SupportedTypes> {
		equals: string;
		seperator: string;

		stringify(): string;
		toObject(): Items;
		toString(): string;
	}
}