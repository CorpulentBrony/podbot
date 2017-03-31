import { Path } from "./Path";

let fubar: Path;

async function fooo() {
	fubar = new Path("./test.js");
	console.log(await fubar.exists());
	console.log(await fubar.isReadable());

	fubar = new Path("/fakefile");
	console.log(await fubar.exists());
	console.log(await fubar.isReadable());
}

fooo();