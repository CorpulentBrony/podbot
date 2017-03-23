# podbot

## **_notices your bot_**

## OwO What's this?

`podbot` is a [Discord](https://discordapp.com/) bot written in [TypeScript](https://www.typescriptlang.org/) designed to transpile to [ECMAScript 2017](https://developer.mozilla.org/en-US/docs/Web/JavaScript/New_in_JavaScript/ECMAScript_Next_support_in_Mozilla) code and to run on [Node.js 7.7](https://nodejs.org/). It currently supports running multiple bots concurrently through relatively simple configuration (this may become easier in the future). It leverages the [discord.js](https://discord.js.org/) API.

## Why?

I created this bot initially just to provide some basic commands for the [PFC Discord server](http://discord.pfc.moe/). Simultaneously, I created a seperate bot to provide other custom commands to the Plush Degenerates Discord server. Eventually I merged both into the same codebase.

## What can it do?

### Current global commands ([`Command.Default.ts`](ts/Command.Default.ts))

<dl>
	<code>4chan [ random | <var>search</var> ]</code>
	<dd>Searches the catalog of a <a href="https://www.4chan.org/" rel="external">4chan</a> board; by default this is <a href="http://boards.4chan.org/mlp/" rel="external">/mlp/</a> (configurable in <code><a href="ts/FourChan.ts">FourChan.ts</a></code>).  If no argument or <code>random</code> given, then a random thread is returned; otherwise, the first thread that matches the <code><var>search</var></code> argument is returned along with a random image from that thread.</dd>
	<code>db [ random | <var>search</var> ]</code>
	<dd>Searches <a href="https://www.derpibooru.org/" rel="external">Derpibooru</a>.  If no argument or <code>random</code> given, then a random image is returned; otherwise, a random image based on the <code><var>search</var></code> argument is returned.  The best searches on Derpibooru are tag searches and commas (<code>,</code>) can be used to &quot;and&quot; tags together.  Implements <a href="ts/Reactor.ts">Reactor</a> allowing end user to scroll through results.</dd>
	<code>google <var>search</var></code>
	<dd>Searches <a href="https://www.google.com/" rel="external">Google</a> and returns the top three results based on the <code><var>search</var></code> argument.</dd>
	<code>ping</code>
	<dd>Will show the current and average ping times to the bot's server.  The current ping time is based on the timestamp value attached to the command's message and the server's timestamp.  The average is directly from the discord.js API.  This command can only be used either via DM or in a channel which contains the word &quot;bot&quot; in its name.</dd>
	<code>regind <var>message</var></code>
	<dd>Will force the bot to say <var>message</var> using regional indicator emoticons in the current channel.</dd>
	<code>say <var>message</var></code>
	<dd>Will force the bot to say <var>message</var> in the current channel.  This is exposed primarily for testing and likely won't stay that way for long.</dd>
	<code>uptime</code>
	<dd>Will show the current uptime for the bot according to the discord.js API.  This command can only be used either via DM or in a channel which contains the word &quot;bot&quot; in its name.</dd>
	<code>yt <var>search</var></code>
	<dd>Searches <a href="https://www.youtube.com" rel="external">YouTube</a> and returns videos matching the <code><var>search</var></code> argument.  Implements <a href="ts/Reactor.ts">Reactor</a> allowing end user to scroll through results.</dd>
</dl>

### Current custom commands for PFC ([`pfc.ts`](ts/pfc.ts))

<dl>
	<code>pfc [ last | live ]</code>
	<dd>If run with <code>last</code> then it will post the last video uploaded to the <a href="http://www.youtube.com/c/PFCpodcast" rel="external">PFC YouTube channel</a>.  If the parameter is <code>live</code> then it will link the <a href="http://www.youtube.com/c/PFCpodcast/live" rel="external">PFC live page</a> which should show current livestreams that may be occuring.</dd>
	<code>topic <var>topic</var></code>
	<dd>This command will reformat and re-state <var>topic</var>, pin that new message to the active channel, and remove the original message.  This is intended to making pinning topics to the <code>#podcast</code> channel on PFC easier and, as such, will only work if the channel's name is either <code>#podcast</code> or <code>#bot-fuckery</code>.</dd>
</dl>
<ul>
	<li>The bot will query the PFC YouTube channel once every 30 seconds looking for a newly uploaded video.  If one is found, then it will be posted to the #pfc text channel.</li>
</ul>

### Current custom commands for Plush Degenerates ([`plush.ts`](ts/plush.ts))

<dl>
	<code>thread</code>
	<dd>This will attempt to search for and then display the most likely candidate for the plush thread on the current <a href="https://www.4chan.org/" rel="external">4chan</a> board (by default this is <a href="http://boards.4chan.org/mlp/" rel="external">/mlp/</a>).  This is accomplished first by searching the catalog for a thread with &quot;plush thread&quot; in either the subject or comment and, if nothing is found, then searching for just the word &quot;plush&quot;.</dd>
</dl>

### Other notes

-   Commands can be issued either in a channel, a group DM, or a direct DM. If in a channel or a group DM, then the command must be prefixed by the trigger string (as configured in both [`pfc.ts`](ts/pfc.ts) and [`plush.ts`](ts/plush.ts) this is `!`). In a DM, the command should not contain the prefix.
-   As configured, the bot is set to log all commands to a local mongodb instance. If you wish to disable this, simply unhook the `any` command from the corresponding bot file (see [`pfc.ts`](ts/pfc.ts) or [`plush.ts`](ts/plush.ts)). If you wish to configure the logging, see [`CommandLogger.ts`](ts/CommandLogger.ts).
-   All commands are aliasable, renameable, and overrideable. Additionally, new commands can be added easily. See the files [`pfc.ts`](ts/pfc.ts) and [`plush.ts`](ts/plush.ts) for examples.

## How can I set it up?

I mean, this really isn't meant for distribution, but if you insist:

1.  Get a Discord API key for a bot by following [these instructions](https://discordapp.com/developers/applications/me).
2.  Configure a `bot.ts` file like I have done for [`pfc.ts`](ts/pfc.ts) and [`plush.ts`](ts/plush.ts).
3.  Modify the [`Crypt.ts`](ts/Crypt.ts) file.
    -   Set the `secretsDirectory` Path to the top level directory.
    -   Add or remove entries from `botFiles` object to correspond with your bot names.
    -   Set the `keyFile` Path to a file that contains a key that will be used for encryption/decryption.
    -   Modify the `Bots` type to match the bot(s) you are configuring
4.  Modify the [`.secrets_all.json`](.secrets_all.json) file in the top directory with a structure as defined by the `SecretsAll` interface in [`Crypt.ts`](ts/Crypt.ts).
    -   This file will contain the Discord API key for your bot(s).
    -   If you want to access the Google search API, then get a [Custom Search API](https://console.developers.google.com/) key from Google and place it and the CX in this file. If you don't wish to use Google, then set these to empty strings.
5.  Modify [`index.ts`](ts/index.ts) file.
    -   Set the `botDirectory` Path to the top level directory.
    -   Follow the example of how `pfcFile` and `pfc` and `plushFile` and `plush` are initialized and then ensure the `configure()` method is executed.
6.  Modify [`package.json`](package.json) and set the `files` property to the top level directory.
7.  Modify [`tsconfig.json`](tsconfig.json) and set the `compilerOptions.outDir` to the top level directory.
8.  Download and install dependencies locally by running `npm update`.
9.  Transpile the project by running `node_modules/typescript/bin/tsc`.
10.  Run `node encrypt.js` to encrypt the bot API key(s) and/or the Google API/CX. This will generate corresponding `.secrets_`_`thing`_ files. Your [`.secrets_all.json`](.secrets_all.json) file will be wiped of all sensitive information. This command should only be executed one time, during setup.
11.  Run `node index.js` to start up your bot(s).

I've yet to test any of this outside of my current bot configurations, but if you run into problems, feel free to open an issue on [GitHub](https://github.com/CorpulentBrony/podbot). I'm not really planning on providing much support of this outside of my associates, but if I can answer any inquiries I will try.

[![Creative Commons License](https://i.creativecommons.org/l/by-nc-sa/4.0/88x31.png)](http://creativecommons.org/licenses/by-nc-sa/4.0/)

`podbot` by Corpulent Brony is licensed under a [Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International License](http://creativecommons.org/licenses/by-nc-sa/4.0/).

tl;dr DONUT STEELE