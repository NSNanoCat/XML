import assert from "node:assert/strict";
import test from "node:test";
import XML from "../XML.mjs";

const makeXmlFixture = () => ({
	root: {
		"@foo": "bar",
		child: {
			"#": "text",
		},
	},
});

const makePlistFixture = () => ({
	plist: {
		n: 1n,
	},
});

test("exposes package metadata", () => {
	assert.equal(XML.name, "XML");
	assert.equal(XML.version, "0.4.3");
});

test("round-trips ordinary xml", () => {
	const xml = '<root foo="bar"><child>text</child></root>';
	const parsed = XML.parse(xml);

	assert.deepEqual(parsed, makeXmlFixture());
	assert.equal(XML.stringify(parsed), xml);
});

test("round-trips plist xml", () => {
	const xml = "<plist><dict><key>n</key><integer>1</integer></dict></plist>";
	const parsed = XML.parse(xml);

	assert.deepEqual(parsed, makePlistFixture());
	assert.equal(XML.stringify(parsed), xml);
});
