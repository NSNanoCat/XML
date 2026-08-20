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
	assert.equal(XML.version, "0.4.4");
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

test("escapes serialized text, attributes, and plist strings without mutating input", () => {
	const value = {
		root: {
			"@attribute": `a & < > " '`,
			"#": `a & < > " '`,
		},
		plist: {
			"a&b": `x & < > " '`,
		},
	};
	const snapshot = structuredClone(value);

	assert.equal(XML.stringify(value), '<root attribute="a &amp; &lt; &gt; &quot; &apos;">a &amp; &lt; &gt; &quot; &apos;</root><plist><dict><key>a&amp;b</key><string>x &amp; &lt; &gt; &quot; &apos;</string></dict></plist>');
	assert.deepEqual(value, snapshot);
});

test("round-trips bare attributes", () => {
	const xml = "<root disabled/>";
	const parsed = XML.parse(xml);

	assert.deepEqual(parsed, { root: { "@disabled": null } });
	assert.equal(XML.stringify(parsed), xml);
});

test("parses empty and multiline comments and CDATA", () => {
	const parsed = XML.parse("<root><!--line1\nline2--><![CDATA[line1\nline2]]><![CDATA[]]><!----></root>");

	assert.deepEqual(parsed, {
		root: {
			"!--": ["line1\nline2", ""],
			"!CDATA": ["line1\nline2", ""],
		},
	});
});

test("decodes Unicode code point entities", () => {
	assert.deepEqual(XML.parse("<root>&#x1F600;&#128512;</root>"), { root: { "#": "😀😀" } });
});

test("preserves mixed text order and duplicate empty values", () => {
	const xml = "<root>one<child/>two</root>";
	const parsed = XML.parse(xml);

	assert.deepEqual(parsed.root["#"], ["one", "two"]);
	assert.ok(parsed.root.child);
	assert.equal(XML.stringify(parsed), xml);
	assert.deepEqual(XML.parse("<root><![CDATA[]]><![CDATA[]]></root>"), { root: { "!CDATA": ["", ""] } });
});

test("keeps prototype-looking XML names as data", () => {
	const parsed = XML.parse("<root><constructor>evil</constructor><toString>value</toString><__proto__><polluted>true</polluted></__proto__></root>");

	assert.equal(Object.getPrototypeOf(parsed.root), Object.prototype);
	assert.equal(parsed.root.constructor["#"], "evil");
	assert.equal(parsed.root.toString["#"], "value");
	assert.equal(parsed.root.__proto__.polluted["#"], "true");
	assert.equal(Object.prototype.polluted, undefined);
});

test("treats link as an ordinary XML element", () => {
	const xml = "<root><link>text</link></root>";
	const parsed = XML.parse(xml);

	assert.equal(parsed.root.link["#"], "text");
	assert.equal(XML.stringify(parsed), xml);
});
