import { Collection } from "./Collection";
import { GenericApi } from "./GenericApi";
import { GenericBot } from "./GenericBot";
import { Embed, Reactor } from "./Reactor";
import { Path, Query, Url } from "./Url";

export abstract class Embeddable<T> implements Embeddable.Like<T> {
	protected _embeds: Array<Embed.Options>;
	public readonly embeds: Array<Embed.Options>;
	public readonly parsedCommand: GenericBot.Command.Parser.ParsedCommand;
	public readonly query: Query;
	public results: Array<T>;

	constructor(parsedCommand: GenericBot.Command.Parser.ParsedCommand) { [this.parsedCommand, this.query] = [parsedCommand, new Query()]; }

	public get bot(): GenericBot { return this.parsedCommand.bot; }
	public get channel(): GenericBot.Command.TextBasedChannel { return this.parsedCommand.channel; }
	public get userInput(): string { return this.parsedCommand.args; }

	protected abstract configureQuery(...args: Array<any>);

	protected getEmbeds(mapFn: (item?: T, index?: number, array?: Array<T>) => Embed.Options): Array<Embed.Options> {
		if (this._embeds)
			return this._embeds;
		return this._embeds = this.results.map<Embed.Options>(mapFn);
	}

	public abstract async search(query?: string);

	public async send(): Promise<Embed> {
		const embed: Embed = new Embed(this.parsedCommand, this.embeds);
		await embed.send();
		return embed;
	}
}

export namespace Embeddable {
	export interface Like<T> {
		readonly bot: GenericBot;
		readonly channel: GenericBot.Command.TextBasedChannel;
		readonly embeds: Array<Embed.Options>;
		readonly parsedCommand: GenericBot.Command.Parser.ParsedCommand;
		readonly query: Query;
		results: Array<T>;
		readonly userInput: string;

		send(): Promise<Embed>;
	}
}