import { Command as GenericBotCommand } from "./Command";
import { CommandLogger } from "./CommandLogger";
import * as Crypt from "./Crypt";
import * as Discord from "discord.js";
import * as Process from "process";
import { Reactor } from "./Reactor";

// these names should really be standardized, but until they are i'll be using this to connect the bot's actual names with the ones used in Crypt
const CRYPT_LOOKUP: Map<string, string> = new Map<string, string>();
CRYPT_LOOKUP.set("PFCuckBot", "pfc").set("PlushieBot", "plush");

export class GenericBot implements GenericBot.Like {
	public readonly client: Discord.Client;
	public readonly command: GenericBot.Command;
	private readonly log: CommandLogger;
	public readonly name: string;
	public readonly reactor: Reactor;

	constructor(name: string, { commands, onReady, trigger }: GenericBot.Options) {
		Process.send({ name });
		console.log("starting up...");
		Object.defineProperty(Process, "title", { value: "podbot: " + name });
		[this.name, this.client, this.reactor] = [name, new Discord.Client({ disabledEvents: ["TYPING_START"] }), new Reactor(this)];
		this.log = new CommandLogger(this.name);
		commands.set("any", { command: (parsedCommand: GenericBot.Command.Parser.ParsedCommand): void => { this.log.add(parsedCommand).catch(console.error); } });
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

	public async clientLogin() {
		this.client.login(await this.getToken()).catch(console.error);
		return this;
	}

	public configure(): this { return <this>this.command.hookCommands().bot.clientConfigure(); }

	private async getToken(): Promise<string> {
		const secrets: Crypt.SecretsBot = await Crypt.getSecrets(CRYPT_LOOKUP.get(this.name));
		return secrets.token;
	}

	public async login() { this.clientLogin(); }
	private onReady(): void { console.log("My circuits are ready~~~"); }
	private onReconnecting(): void { console.log("Reconnecting to server..."); }
}

export namespace GenericBot {
	export import Command = GenericBotCommand;

	export interface Constructor { new(name: string, options: GenericBot.Options): GenericBot; }

	export interface Like {
		readonly client: Discord.Client;
		readonly command: Command;
		readonly name: string;

		clientConfigure(onReady?: () => void): this;
		clientLogin();
		configure(): this;
		login();
	}

	export interface Options extends Command.Options { onReady?: () => void }
}