import { Buffer } from "buffer";
import * as ChildProcess from "child_process";
import * as console from "console";
//import { Google } from "./Google";
import * as Net from "net";
import * as Timers from "timers";
import { Path } from "./Url";

// PING_DELAY_SECS + PONG_WAIT_DELAY_SECS should probably be greater than RESTART_DELAY_SECS; strange things might happen otherwise
const PING_DELAY_SECS: number = 90;
const PONG_WAIT_DELAY_SECS: number = 1;
const RESTART_DELAY_SECS: number = 60;
const SERVER_LATITUDE: number = 28.419097;
const SERVER_LONGITUDE: number = -81.228514;

declare namespace NodeJS {
	export interface Timer {
		ref(): void;
		unref(): void;
	}
}

export class BotExecutor implements BotExecutor.Like {
	public readonly color: string;
	public readonly file: Path;
	private name: string;
	private pingTimer: NodeJS.Timer;
	private process: ChildProcess.ChildProcess;
	private responseTimer: NodeJS.Timer;
	//private timezone: Google.Timezone;

	constructor(file: Path | string, color: string = BotExecutor.colors.reset) {
		if (typeof file === "string")
			file = new Path(file);

		if (!file || !(file instanceof Path) || !file.isReadable())
			throw new BotExecutor.Error("file parameter must be a string or Path object representing a real file that can be read.");
		[this.color, this.file, this.name/*, this.timezone*/] = [color, file, file.basename().toString()/*, new Google.Timezone(SERVER_LATITUDE, SERVER_LONGITUDE)*/];
	}

	public configure(): this {
		this.process = this.fork();
		this.process.on("error", (err: Error): void => this.onError(err));
		this.process.on("exit", (code: number, signal: string): void => this.onExit(code, signal));
		this.process.on("message", (message: any, sendHandle: Net.Socket | Net.Server): void => { this.onMessage(message, sendHandle).catch(console.error); });
		this.process.stderr.on("data", (chunk: Buffer | string): void => this.onStderrData(chunk));
		this.process.stderr.on("error", (err: Error): void => this.onStderrError(err));
		this.process.stdout.on("data", (chunk: Buffer | string): void => this.onStdoutData(chunk));
		this.process.stdout.on("error", (err: Error): void => this.onStdoutError(err));
		this.setPing();
		return this;
	}

	private get prefix(): string { return this.color + " " + /*this.timezone.currentDateTime*/Date().slice(4, 24) + " <" + this.name + "> "; }

	private fork(): ChildProcess.ChildProcess { return ChildProcess.fork(this.file.toString(), [], { silent: true }); }
	private onError(err: Error): void {
		console.error(this.prefix + "BotExecutor error for " + this.name + "\n" + err.message);
		this.setRespawn();
	}

	private onExit(code: number, signal: string): void {
		console.log(this.prefix + "BotExecutor process " + this.name + " received " + signal + " and is exiting with code " + code.toString());
		this.setRespawn();
	}

	private async onMessage(message: any, sendHandle: Net.Socket | Net.Server) {
		if (message.name) {
			this.name = message.name;
			//await this.timezone.execute(this.name, this.color);
		} else if (message.pong)
			this.receivedPong();
	}

	private onStderrData(chunk: Buffer | string): void { console.error(this.prefix + chunk.slice(0, -1)) + " " + BotExecutor.colors.reset; }
	private onStderrError(err: Error): void { console.error(this.prefix + "Error on stderr: \n" + err.message) + " " + BotExecutor.colors.reset; }
	private onStdoutData(chunk: Buffer | string): void { console.log(this.prefix + chunk.slice(0, -1)) + " " + BotExecutor.colors.reset; }
	private onStdoutError(err: Error): void { console.error(this.prefix + "Error on stdout: \n" + err.message) + " " + BotExecutor.colors.reset; }

	private pingError(): void {
		console.log(this.prefix + "Didn't receive a pong response back from our ping request from child process.  Assuming it's hung.");
		this.setRespawn();
	}

	private receivedPong(): void {
		Timers.clearTimeout(this.responseTimer);
		this.setPing();
	}

	private respawn(): void {
		console.log(this.prefix + "Attempting to respawn...");
		this.configure();
	}

	private sendPing(): void {
		this.process.send({ ping: Date.now() });
		this.setResponseTimer();
	}

	private setPing(): void {
		if (this.pingTimer)
			Timers.clearTimeout(this.pingTimer);
		this.pingTimer = Timers.setTimeout((): void => this.sendPing(), BotExecutor.pingDelaySecs * 1000);
	}

	private setRespawn(): void {
		this.process.kill("SIGKILL");
		delete this.process;
		console.log(this.prefix + "Waiting " + BotExecutor.restartDelaySecs.toString() + " seconds before respawning.");
		Timers.setTimeout((): void => { this.respawn(); }, BotExecutor.restartDelaySecs * 1000);
	}

	private setResponseTimer(): void {
		if (this.responseTimer)
			Timers.clearTimeout(this.responseTimer);
		this.responseTimer = Timers.setTimeout((): void => this.pingError(), BotExecutor.pongWaitDelaySecs * 1000);
	}
}

class BotExecutorError extends Error {}

export namespace BotExecutor {
	export interface Like {
		readonly color: string;
		constructor: typeof Like;
		readonly file: Path;

		configure(): this;
	} export declare const Like: Function | {
		readonly colors: { [name: string]: string; }
		prototype: Like;
		restartDelaySecs: number;

		new(file: Path | string, color?: string): Like;
		spawn(file: Path | string, color?: string): Like;
	};

	export const colors = {
		reset: "\x1b[0m",
		red: "\x1b[31m",
		green: "\x1b[32m",
		yellow: "\x1b[33m",
		blue: "\x1b[34m",
		magenta: "\x1b[35m",
		cyan: "\x1b[36m", 
		white: "\x1b[37m"
	}

	export const pingDelaySecs: number = PING_DELAY_SECS;
	export const pongWaitDelaySecs: number = PONG_WAIT_DELAY_SECS;
	export const restartDelaySecs: number = RESTART_DELAY_SECS;

	export class Error extends BotExecutorError {}

	export function spawn(file: Path | string, color?: string): BotExecutor {
		const result: BotExecutor = new BotExecutor(file, color);
		result.configure();
		return result;
	}
}