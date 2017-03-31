import { BotExecutor } from "./BotExecutor";
import { Path } from "./Url";

const botDirectory: Path = new Path("/var/www/podbot/");
const pfcFile: Path = botDirectory.join("pfc.js");
const plushFile: Path = botDirectory.join("plush.js");
const pfc: BotExecutor = BotExecutor.spawn(pfcFile, BotExecutor.colors.cyan);
const plush: BotExecutor = BotExecutor.spawn(plushFile, BotExecutor.colors.green);