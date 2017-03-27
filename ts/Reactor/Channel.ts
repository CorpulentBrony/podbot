import { Collection } from "../Collection";
import { Reactions } from "./Reactions";
import { Reactor } from "../Reactor";
import { RichEmbed } from "../RichEmbed";

const REACTION_TTL_MINS: number = 5;

export class Channel implements Channel.Like {
	public readonly channelId: string;
	public readonly reactions: Collection<string, Reactions>;
	public readonly reactor: Reactor;

	constructor(channelId: string, reactor: Reactor) {
		[this.channelId, this.reactions, this.reactor] = [channelId, new Collection<string, Reactions>(), reactor];
		Object.defineProperty(this, "reactor", { enumerable: false });
	}

	public clearReactionDestructor(messageId: string): void { this.reactions.get(messageId).clearDestruct(); }

	public delete(messageId: string): boolean {
		this.clearReactionDestructor(messageId);
		return this.reactions.delete(messageId);
	}

	public get(messageId: string): Reactions { return this.reactions.get(messageId); }
	public has(messageId: string): boolean { return this.reactions.has(messageId); }

	private reactionDestructor: (key: string) => Promise<void> = async (key: string): Promise<void> => {
		await this.reactions.get(key).clear();
		await this.reactions.delete(key);
	}

	public set(embed: RichEmbed): this {
		const key: string = embed.message.id;
		this.reactions.set(key, new Reactions(embed, this)).get(key).add().catch(console.error);
		this.setReactionDestructor(key);
		return this;
	}

	public setReactionDestructor(key: string): void { this.reactions.get(key).timer = this.reactor.bot.client.setTimeout((): Promise<void> => this.reactionDestructor(key).catch(console.error), Channel.reactionTtlMins * 60 * 1000); }
}

export namespace Channel {
	export const reactionTtlMins: number = REACTION_TTL_MINS;

	export interface Constructor {
		prototype: Like;
	}

	export interface Like {
		readonly channelId: string;
		constructor: Constructor;
		readonly reactions: Collection<string, Reactions>;
		readonly reactor: Reactor;

		clearReactionDestructor(messageId: string): void;
		delete(messageId: string): boolean;
		get(messageId: string): Reactions;
		has(messageId: string): boolean;
		set(embed: RichEmbed): this;
		setReactionDestructor(key: string): void;
	}
}