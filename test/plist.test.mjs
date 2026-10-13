import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import XML from "../XML.mjs";

// Generated and independently parsed with Python plistlib. This fixture uses
// the existing dictionary-root contract and paired empty container tags.
const source = await readFile(new URL("./fixtures/plist-types.plist", import.meta.url), "utf8");
const expected = {
	title: `Sage & Vine < > " ' 😀`,
	"\n key\t": "\n\t leading\n  middle\t\ntrailing \t\n",
	whitespace: " \n\t ",
	literal: "&#x000A;",
	min: -9223372036854775808n,
	max: 9223372036854775807n,
	real: -1.25e-4,
	flags: [true, false],
	nested: { array: [7n, "text", { constructor: "value", ["__proto__"]: "data" }] },
	emptyContainers: { dict: {}, array: [] },
};

test("parses independently generated plist types and preserves key and string text", () => {
	const parsed = XML.parse(source);
	assert.deepEqual(parsed.plist, expected);
	assert.equal(typeof parsed.plist.min, "bigint");
	assert.equal(Object.getPrototypeOf(parsed.plist.nested.array[2]), Object.prototype);
	assert.equal(Object.prototype.polluted, undefined);
});

for (const tab of ["", "  ", "\t"]) {
	test(`round-trips nested plist values with indentation ${JSON.stringify(tab)}`, () => {
		const parsed = XML.parse(source);
		const snapshot = structuredClone(parsed);
		const output = XML.stringify(parsed, tab);
		assert.deepEqual(XML.parse(output), parsed);
		assert.deepEqual(parsed, snapshot);
		assert.equal(XML.stringify(parsed, tab), output);
	});

	test(`serializes current plist mutations with indentation ${JSON.stringify(tab)}`, () => {
		const parsed = XML.parse(source);
		parsed.plist.title = "Changed & value\n\t中文\n";
		delete parsed.plist.real;
		parsed.plist.flags.reverse();
		parsed.plist.nested.array.splice(1, 1, "replacement", -8n);
		parsed.plist.added = { enabled: false, list: [1.5, "new\n"] };
		const snapshot = structuredClone(parsed);
		assert.deepEqual(XML.parse(XML.stringify(parsed, tab)), snapshot);
		assert.deepEqual(parsed, snapshot);
	});
}

test("serializes a replaced plist dictionary instead of its parsed snapshot", () => {
	const parsed = XML.parse(source);
	parsed.plist = { replaced: "current\n", array: [false, 9n] };
	assert.deepEqual(XML.parse(XML.stringify(parsed)), parsed);
});

test("applies plist reviver changes once to nested values and containers", () => {
	const calls = [];
	const parsed = XML.parse("<plist>\n<dict><key>items</key><array>\n<integer>7</integer><true/><dict><key>text</key><string>old</string></dict>\n</array></dict>\n</plist>", (key, value) => {
		calls.push(key);
		if (key === "integer") return value + 1n;
		if (key === "string") return value.toUpperCase();
		if (key === "array") value.push(false);
		return value;
	});
	assert.deepEqual(parsed, { plist: { items: [8n, true, { text: "OLD" }, false] } });
	assert.deepEqual(calls, ["key", "integer", "true", "key", "string", "dict", "array", "dict", "plist", ""]);
	assert.deepEqual(XML.parse(XML.stringify(parsed, "  ")), parsed);
});
