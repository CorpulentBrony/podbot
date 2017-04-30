import * as Discord from "discord.js";

type DiscordTextChannelHasNsfw = Discord.TextChannel & { nsfw: boolean };

export function isNsfwChannel(channel: Discord.Channel): boolean { return !isTextChannel(channel) || (<DiscordTextChannelHasNsfw>channel).nsfw; }
export function isTextChannel(channel: Discord.Channel): channel is Discord.TextChannel { return channel.type === "text"; }