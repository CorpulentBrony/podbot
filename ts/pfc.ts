import { CommandLogger } from "./CommandLogger";
import * as Crypt from "./Crypt";
import * as Discord from "discord.js";
import { GenericBot } from "./GenericBot";
import * as Process from "process";
import { Path } from "./Url";
import { YouTube } from "./YouTube";

const beaverSnowflake: string = "201717735900708866";
const name: string = "PFCuckBot";
const newMemberDefaultRoleSnowflake: string = "161186606198423553";
const selfiesRoleSnowflake: string = "292882948460511238";
const topicPrefix: string = "PODCAST TOPIC";
const trigger: string = "!";

Process.send({ name });
const log: CommandLogger = new CommandLogger("podbot");
const commands: GenericBot.Command.Collection = new GenericBot.Command.Collection();
commands.set("any", { command: (parsedCommand: GenericBot.Command.Parser.ParsedCommand): void => { log.add(parsedCommand).catch(console.error); } })
	.set("4chan", { default: true })
	.set("db", { default: true })
	.set("dp", { alias: "db" })
	.set("google", { default: true })
	.set("pfc", { command: (parsedCommand: GenericBot.Command.Parser.ParsedCommand): void => { pfc(parsedCommand).catch(console.error); } })
	.set("ping", { default: true })
	.set("regind", { default: true })
	.set("say", { default: true })
	.set("topic", { command: (parsedCommand: GenericBot.Command.Parser.ParsedCommand): void => { topic(parsedCommand).catch(console.error); } })
	.set("uptime", { default: true })
	.set("yt", { default: true });
let bot: GenericBot;

async function login() {
	const secrets: Crypt.SecretsBot = await Crypt.getSecrets("pfc");
	bot = new GenericBot(name, secrets.token, { commands, trigger });
	bot.client.on("guildMemberAdd", (member: Discord.GuildMember): void => { member.addRole(newMemberDefaultRoleSnowflake).catch(console.error) });
	bot.client.on("message", (message: Discord.Message): void => { onMessage(message).catch(console.error) });
	bot.configure().login();
}

login().catch(console.error);

async function onMessage(message: Discord.Message): Promise<void> {
	if (message.member && message.member.roles.has(selfiesRoleSnowflake) && message.attachments.size > 0) {
		await message.react("\u{1f44e}");
		await message.react("\u{1f44e}\u{1f3ff}");
		await message.react("\u{1f346}");
	}
}

async function topic(parsedCommand: GenericBot.Command.Parser.ParsedCommand): Promise<Discord.Message> {
	if (!(parsedCommand.channel instanceof Discord.TextChannel) || parsedCommand.channel.name !== "podcast" && parsedCommand.channel.name !== "bot-fuckery")
		return null;
	const messageToPin: Discord.Message = await GenericBot.Command.Defaults.sayEmbed(parsedCommand, {
		description: parsedCommand.args,
		footer: "\u{1f4cc}",
		title: topicPrefix
	});
	messageToPin.pin();
	parsedCommand.message.delete();
	return messageToPin;
}

// PFC playlist PLYwK4VQSqT-v3-7lp-eXaJD62-mrzuaj6
const channelMonitor: YouTube.ChannelMonitor = new YouTube.ChannelMonitor("UCSA4z111ZYEzsxwNEgrrS7A", 30);
channelMonitor.on("newVideo", (video: YouTube.Response.ItemUrls): void => { onNewVideo(video).catch(console.error); });
channelMonitor.on("error", (err: Error): void => console.error("Error received from channelMonitor\n", err));
channelMonitor.start();

async function onNewVideo(video: YouTube.Response.ItemUrls) {
	let channels: Discord.Collection<string, Discord.TextChannel> = bot.client.guilds.first().channels.filter((channel: Discord.GuildChannel): boolean => channel.type === "text");
	return channels.find("name", "pfc").send(video.videoUrl.toString());
}

async function pfc(parsedCommand: GenericBot.Command.Parser.ParsedCommand): Promise<Discord.Message> {
	switch (parsedCommand.args.split(" ")[0]) {
		case "last":
			return GenericBot.Command.Defaults.say(parsedCommand, channelMonitor.lastVideo.videoUrl.toString());
		case "live":
			return GenericBot.Command.Defaults.say(parsedCommand, YouTube.Urls.base.setPathname(new Path("/c/PFCpodcast/live")).toString());
	}
	return undefined;
}