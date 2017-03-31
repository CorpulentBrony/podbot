import * as Fs from "fs";
import * as NodePath from "path";

export class Path implements Path.Like {
	public base: string
	public dir: string;
	public ext: string;
	public name: string;
	public root: string;

	constructor(path: string | Path) {
		let result: NodePath.ParsedPath;

		if (path instanceof Path)
			result = path;
		else
			result = NodePath.parse(path);
		({ base: this.base, dir: this.dir, ext: this.ext, name: this.name, root: this.root } = result);
	}

	public access(mode: number = Fs.constants.F_OK): Promise<boolean> {
		return new Promise<boolean>((resolve: (value: boolean | PromiseLike<boolean>) => void): void => Fs.access(this.toString(), mode, (err: Error): void => resolve(!Boolean(err))));
	}

	public basename(ext?: string): Path { return new Path(NodePath.basename(this.toString(), ext)); }
	public dirname(): Path { return new Path(NodePath.dirname(this.toString())); }
	public exists(): Promise<boolean> { return this.access(); }
	public isAbsolute(): boolean { return NodePath.isAbsolute(this.toString()); }
	public isReadable(): Promise<boolean> { return this.access(Fs.constants.F_OK | Fs.constants.R_OK); }

	public join(...paths: Array<string | Path>): Path {
		paths = paths.map<string>((path: string | Path): string => (path instanceof Path) ? path.toString() : path);
		paths.splice(0, 0, this.toString());
		return new Path(NodePath.join(...(<Array<string>>paths)));
	}
	
	public normalize(): Path { return new Path(NodePath.normalize(this.toString())); }
	public relative(to: string | Path): Path { return new Path(NodePath.relative(this.toString(), (to instanceof Path) ? to.toString() : to)); }
	public resolve(...paths: Array<string | Path>): Path { return new Path(NodePath.resolve(...paths.map<string>((path: string | Path): string => (path instanceof Path) ? path.toString() : path).splice(0, 0, this.toString()))); }
	public toString(): string { return NodePath.format(this); }
}

export namespace Path {
	export interface Like extends NodePath.ParsedPath {
		basename(ext?: string): Path;
		dirname(): Path;
		isAbsolute(): boolean;
		join(...paths: Array<string>): Path
		relative(to: string | Path): Path;
		resolve(...paths: Array<string>): Path;
		toString(): string;
	}

	export function parse(path: string): Path { return new Path(path); }
}