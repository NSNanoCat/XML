export type XMLReviver = (key: string, value: any) => any;

export default class XML {
	static readonly name: "XML";
	static version: string;
	static about(): void;
	static parse(xml?: string, reviver?: XMLReviver): any;
	static stringify(json?: Record<string, any>, tab?: string): string;
}
