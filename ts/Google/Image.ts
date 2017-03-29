import { GenericBot } from "../GenericBot";
import { Google } from "../Google";
import { RichEmbed as Embed } from "../RichEmbed";
import { Search } from "./Search";

export class Image extends Search implements Image.Like {
	protected async configureQuery(query: string) {
		await super.configureQuery(query);
		this.query.set("searchType", "image");
	}

	protected getEmbed(item: Google.Search.Result.Item): Embed.Options {
		return {
			description: item.snippet ? item.snippet : "",
			footer: this.footer,
			image: { url: item.link ? item.link : "" },
			title: item.title ? item.title : "",
			url: (item.image && item.image.contextLink) ? item.image.contextLink : ""
		};
	}

	protected setResults(results: Array<Google.Search.Result.Item>): void { this._results = results; }
}

export namespace Image {
	export interface Like extends Search.Like {
		
	} export declare const Like: {
		prototype: Like;

		new(parsedCommand: GenericBot.Command.Parser.ParsedCommand): Like;
	};
}