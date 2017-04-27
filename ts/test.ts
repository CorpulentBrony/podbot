import { Time } from "./Time";

let foo: Time = new Time("09:00");
let bar: Time = new Time("15:00");

console.log(Time.Duration.from({ from: foo, to: bar }).time);
console.log(Time.Duration.from({ from: bar, to: foo }).time);