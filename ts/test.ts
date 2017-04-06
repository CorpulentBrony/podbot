import { Time } from "./Time";

let fubar: Time = new Time("16:58:28.165Z");
let formatter: Intl.TimeFormat = new Intl.TimeFormat();
console.log(formatter.format(fubar));
formatter = new Intl.TimeFormat(undefined, { timeZone: "America/New_York" });
console.log(formatter.format(fubar));