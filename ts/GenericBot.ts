import { Command as GenericBotCommand } from "./Command";
import * as Discord from "discord.js";
import { Reactor } from "./Reactor";

export class GenericBot implements GenericBot.Like {
	public readonly client: Discord.Client;
	public readonly command: GenericBot.Command;
	public readonly name: string;
	public readonly reactor: Reactor;
	private token: string;

	constructor(name: string, token: string, { commands, onReady, trigger }: GenericBot.Options) {
		console.log("starting up...");
		process.title = "podbot: " + name;
		[this.name, this.client, this.reactor, this.token] = [name, new Discord.Client({ disabledEvents: ["TYPING_START"] }), new Reactor(this), token];
		this.command = new GenericBot.Command(this, { commands, trigger });
	}

	public clientConfigure(onReady: () => void = this.onReady): this {
		this.client.on("ready", (): void => onReady.call(this));
		this.client.on("reconnecting", (): void => this.onReconnecting.call(this));
		this.client.on("message", (message: Discord.Message): any => this.command.parser.parse.call(this.command.parser, message));
		this.client.on("messageDelete", (message: Discord.Message): void => this.reactor.onMessageDelete(message));
		this.client.on("messageDeleteBulk", (messages: Discord.Collection<string, Discord.Message>): void => this.reactor.onMessageDeleteBulk(messages));
		this.client.on("messageReactionAdd", (messageReaction: Discord.MessageReaction, user: Discord.User): void => this.reactor.onMessageReactionAdd(messageReaction, user));
		this.client.on("messageReactionRemove", (messageReaction: Discord.MessageReaction, user: Discord.User): void => this.reactor.onMessageReactionRemove(messageReaction, user));
		return this;
	}

	public clientLogin(token: string = this.token): this {
		this.client.login(token).catch(console.error);
		this.token = undefined;
		delete this.token;
		return this;
	}

	public configure(): this { return <this>this.command.hookCommands().bot.clientConfigure(); }
	public login(): this { return this.clientLogin(); }
	private onReady(): void { console.log("My circuits are ready~~~"); }
	private onReconnecting(): void { console.log("Reconnecting to server..."); }
}

export namespace GenericBot {
	export import Command = GenericBotCommand;

	export interface Constructor { new(name: string, token: string, options: GenericBot.Options): GenericBot; }

	export interface Like {
		readonly client: Discord.Client;
		readonly command: Command;
		readonly name: string;

		clientConfigure(onReady?: () => void): this;
		clientLogin(token: string): this;
		configure(): this;
		login(): this;
	}

	export interface Options extends Command.Options { onReady?: () => void }
}