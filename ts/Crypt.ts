import { Buffer } from "buffer";
import * as Crypto from "crypto";
import * as Fs from "fs";
import { Path } from "./Url";

const algorithm: string = "AES-256-CFB8";
const secretsDirectory: Path = new Path("/var/www/podbot/");
const botFiles: SecretsBotCollection<Path> = {
	pfc: secretsDirectory.join(".secrets_pfc"),
	plush: secretsDirectory.join(".secrets_plush")
};
const encryptedString: string = "[ENCRYPTED]";
const googleFile: Path = secretsDirectory.join(".secrets_google");
const keyFile: Path = new Path("/home/corpubro/.ssh/id_rsa");
const secretsAllFile: Path = secretsDirectory.join(".secrets_all.json");
const youTubeSubscriberFile: Path = secretsDirectory.join(".secrets_youtubesubscriber");

type Bots = string;

interface SecretsAll {
	Google: SecretsGoogle;
	pfc: SecretsBot;
	plush: SecretsBot;
	YouTubeSubscriber: SecretsYouTubeSubscriber;
}

export interface SecretsBot { token: string; }
interface SecretsBotCollection<T> { [key: string]: T; }

export interface SecretsGoogle {
	api: string;
	cx: string;
}

export interface SecretsYouTubeSubscriber { callbackUrl: string; }

function deleteUnencryptedSecrets(secrets: SecretsAll): SecretsAll {
	for (const target in secrets)
		for (const key in secrets[target])
			secrets[target][key] = encryptedString;
	return secrets;
}

function extractBotSecrets(secrets: SecretsAll): SecretsBotCollection<SecretsBot> {
	const result: SecretsBotCollection<SecretsBot> = {};

	for (const target in secrets)
		if (target != "Google" && target != "YouTubeSubscriber")
			Object.assign(result, { [target]: secrets[target] });
	return result;
}

export async function getSecrets(target: "Google"): Promise<SecretsGoogle>;
export async function getSecrets(target: "YouTubeSubscriber"): Promise<SecretsYouTubeSubscriber>;
export async function getSecrets(target: Bots): Promise<SecretsBot>;
export async function getSecrets(target: "Google" | "YouTubeSubscriber" | Bots): Promise<SecretsGoogle | SecretsYouTubeSubscriber | SecretsBot> {
	return JSON.parse(await getSecretsText((target === "Google") ? googleFile : (target === "YouTubeSubscriber") ? youTubeSubscriberFile : botFiles[target]));
}

async function getSecretsText(filePath: Path): Promise<string> {
	const file: Fs.ReadStream = Fs.createReadStream(filePath.toString(), { encoding: "binary", autoClose: true });
	const decipher: Crypto.Decipher = Crypto.createDecipher(algorithm, await readKey());
	const pipe: Crypto.Decipher = file.pipe<Crypto.Decipher>(decipher);
	let resultText: string = "";
	pipe.on("readable", (): void => {
		const data: Buffer = <Buffer>pipe.read();

		if (data)
			resultText += data.toString("utf8");
	});
	const result: Promise<string> = new Promise<string>((resolve: (value: string | PromiseLike<string>) => void, reject: (reason?: any) => void): void => { pipe.on("end", (): void => resolve(resultText)); });
	return result;
}

async function read(file: Path): Promise<string> {
	return new Promise<string>((resolve: (value: string | PromiseLike<string>) => void, reject: (reason?: any) => void): void => {
		Fs.readFile(file.toString(), { encoding: "utf8" }, (error: Error, data: string): void => {
			if (error)
				reject(error);
			resolve(data);
		})
	});
}

async function readJson<T>(file: Path): Promise<T> { return JSON.parse(await read(file)); }
export async function readKey(file: Path = keyFile): Promise<string> { return read(file); }
async function readSecretsAll(file: Path = secretsAllFile): Promise<SecretsAll> { return readJson<SecretsAll>(file); }

function write(secret: string, key: string, destination: Path): void {
	const cipher: Crypto.Cipher = Crypto.createCipher(algorithm, key);
	const file: Fs.WriteStream = Fs.createWriteStream(destination.toString(), <any>{ defaultEncoding: "binary", mode: 0o600, autoClose: true });
	cipher.pipe<Fs.WriteStream>(file).on("finish", (): void => console.log("finished writing file"));
	cipher.write(secret);
}

function writeBots(secrets: SecretsBotCollection<SecretsBot>, key: string, destinations: SecretsBotCollection<Path> = botFiles): void {
	for (const bot in secrets)
		if (secrets[bot].token === encryptedString)
			return;
		else
			writeJson<SecretsBot>(secrets[bot], key, destinations[bot]);
}

async function writeCleanSecretsAll(secrets: SecretsAll, file: Path = secretsAllFile): Promise<boolean> {
	return new Promise<boolean>((resolve: (value: boolean | PromiseLike<boolean>) => void, reject: (reason?: any) => void): void => {
		Fs.writeFile(file.toString(), JSON.stringify(secrets), { encoding: "utf8", mode: 0o600 }, (error: Error): void => {
			if (error)
				reject(error);
			resolve(true);
		});
	});
}

async function writeGoogle(secret: SecretsGoogle, key: string, destination: Path = googleFile) {
	if (secret.api === encryptedString || secret.cx === encryptedString)
		if (secret.api === secret.cx)
			return;
		else {
			const currentSecret: SecretsGoogle = await getSecrets("Google");

			if (secret.api === encryptedString)
				secret.api = currentSecret.api;
			else
				secret.cx = currentSecret.cx;
		}
	writeJson<SecretsGoogle>(secret, key, destination);
}

function writeJson<T>(secret: T, key: string, destination: Path): void { write(JSON.stringify(secret), key, destination); }

function writeYouTubeSubscriber(secret: SecretsYouTubeSubscriber, key: string, destination: Path = youTubeSubscriberFile): void {
	if (secret.callbackUrl === encryptedString)
		return;
	writeJson<SecretsYouTubeSubscriber>(secret, key, destination);
}

async function writeSecretsAll(secrets: SecretsAll, key: string) {
	await writeGoogle(secrets.Google, key);
	writeYouTubeSubscriber(secrets.YouTubeSubscriber, key);
	writeBots(extractBotSecrets(secrets), key);
}

export async function encryptAllSecrets() {
	const key: string = await readKey();
	const secrets: SecretsAll = await readSecretsAll();
	await writeSecretsAll(secrets, key);
	await writeCleanSecretsAll(deleteUnencryptedSecrets(secrets));
}