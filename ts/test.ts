abstract class Foo {
	public readonly test: string = "hello from Foo";

	public funTimes() { console.log(this.test); }
}

class Bar extends Foo {
	public get test(): string { return "hello from Bar"; }
}

const bar = new Bar();
console.log(bar.test);
bar.funTimes();