import { Buffer } from "buffer";
import * as ChildProcess from "child_process";
import * as Net from "net";
import { Path } from "./Url";

export class BotExecutor {
	public readonly color: string;
	public readonly file: Path;
	private name: string;
	private process: ChildProcess.ChildProcess;

	constructor (file: Path, color: string = BotExecutor.colors.reset) { [this.color, this.file, this.name] = [color, file, file.basename().toString()]; }

	public configure() {
		this.process = this.fork();
		this.process.on("error", (err: Error): void => this.onError(err));
		this.process.on("exit", (code: number, signal: string): void => this.onExit(code, signal));
		this.process.on("message", (message: any, sendHandle: Net.Socket | Net.Server): void => this.onMessage(message, sendHandle));
		this.process.stderr.on("data", (chunk: Buffer | string): void => this.onStderrData(chunk));
		this.process.stderr.on("error", (err: Error): void => this.onStderrError(err));
		this.process.stdout.on("data", (chunk: Buffer | string): void => this.onStdoutData(chunk));
		this.process.stdout.on("error", (err: Error): void => this.onStdoutError(err));
	}

	private get prefix(): string { return this.color + " " + Date().slice(4, 24) + " <" + this.name + "> "; }

	private fork(): ChildProcess.ChildProcess { return ChildProcess.fork(this.file.toString(), [], { silent: true }); }
	private onError(err: Error): void { console.error("BotExecutor error for " + this.name + "\n" + err.message); }
	private onExit(code: number, signal: string): void { console.log("BotExecutor process " + this.name + " received " + signal + " and is exiting with code " + code.toString()); }

	private onMessage(message: any, sendHandle: Net.Socket | Net.Server): void {
		if (message.name)
			this.name = message.name;
	}

	private onStderrData(chunk: Buffer | string): void { console.error(this.prefix + chunk.slice(0, -1)) + " " + BotExecutor.colors.reset; }
	private onStderrError(err: Error): void { console.error(this.prefix + "Error on stderr: \n" + err.message) + " " + BotExecutor.colors.reset; }
	private onStdoutData(chunk: Buffer | string): void { console.log(this.prefix + chunk.slice(0, -1)) + " " + BotExecutor.colors.reset; }
	private onStdoutError(err: Error): void { console.error(this.prefix + "Error on stdout: \n" + err.message) + " " + BotExecutor.colors.reset; }
}

export namespace BotExecutor {
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
}