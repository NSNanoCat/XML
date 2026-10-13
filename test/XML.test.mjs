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
	assert.equal(XML.version, "0.4.5");
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

test("serializes replaced text and children using their current values", () => {
	const parsed = XML.parse('<root><p t="0">old</p><child>old</child></root>');
	parsed.root.p["#"] = "English\n中文";
	parsed.root.child = { "#": "new" };
	const snapshot = structuredClone(parsed);
	const expected = '<root><p t="0">English\n中文</p><child>new</child></root>';

	assert.equal(XML.stringify(parsed), expected);
	assert.equal(XML.stringify(parsed), expected);
	assert.deepEqual(parsed, snapshot);
});

test("reads edited mixed text segments in their original positions", () => {
	const parsed = XML.parse("<root>one<child/>two</root>");
	parsed.root["#"][0] = "first";
	parsed.root["#"][1] = "last";
	assert.equal(XML.stringify(parsed), "<root>first<child/>last</root>");
	parsed.root["#"] = "replacement";
	assert.equal(XML.stringify(parsed), "<root>replacement<child/></root>");
});

test("omits deleted children and appends newly added children", () => {
	const parsed = XML.parse("<root>one<child>old</child>two</root>");
	delete parsed.root.child;
	parsed.root.added = { "#": "new" };
	assert.equal(XML.stringify(parsed), "<root>onetwo<added>new</added></root>");
});

test("keeps interleaved positions while reading reordered and extended arrays", () => {
	const parsed = XML.parse("<root><a>first</a><b>middle</b><a>last</a></root>");
	parsed.root.a.reverse();
	parsed.root.a.push({ "#": "added" });
	assert.equal(XML.stringify(parsed), "<root><a>last</a><b>middle</b><a>first</a><a>added</a></root>");
	parsed.root.a = [{ "#": "only" }];
	assert.equal(XML.stringify(parsed), "<root><a>only</a><b>middle</b></root>");
});

test("serializes replacement paragraphs after flattening and deleting segments", () => {
	const parsed = XML.parse('<body><p t="0"><s>one</s><s>two</s></p><p t="1">old</p></body>');
	const para = parsed.body.p[0];
	para["#"] = para.s.map(segment => segment["#"]).join("");
	delete para.s;
	parsed.body.p = [para, { "@t": "2", "#": "new" }];
	assert.equal(XML.stringify(parsed), '<body><p t="0">onetwo</p><p t="2">new</p></body>');
});

test("retains different empty tags and repeated empty content", () => {
	const xml = "<root><a/><b/><c/><![CDATA[]]><![CDATA[]]><p></p></root>";
	assert.equal(XML.stringify(XML.parse(xml)), xml);
});

test("uses reviver changes and omits removed nodes", () => {
	const parsed = XML.parse("<root>one<remove>old</remove>two<keep>value</keep></root>", (key, value) => {
		if (key === "remove") return undefined;
		if (key === "keep") value["#"] = value["#"].toUpperCase();
		return value;
	});
	assert.equal(XML.stringify(parsed), "<root>onetwo<keep>VALUE</keep></root>");
});

test("preserves all element text whitespace and ignores document whitespace", () => {
	const text = "\n\t left\n  right\t\n";
	const parsed = XML.parse(`\n  <p>${text}</p>\n\t`);
	assert.deepEqual(parsed, { p: { "#": text } });
	assert.equal(XML.stringify(parsed), `<p>${text}</p>`);
	assert.deepEqual(XML.parse("<p> \n\t </p>"), { p: { "#": " \n\t " } });
	assert.equal(XML.stringify(XML.parse("<p>&#x000A;word&#9;</p>")), "<p>\nword\t</p>");
});

test("formats element-only content without changing text whitespace", () => {
	const text = "first\n\tsecond\n";
	const parsed = { root: { p: [{ "#": text }, { "#": "last" }] } };
	assert.equal(XML.stringify(parsed, "  "), `<root>\n  <p>${text}</p>\n  <p>last</p>\n</root>`);
	assert.equal(XML.parse(XML.stringify(parsed, "  ")).root.p[0]["#"], text);
	const mixed = "<root>one\n<child/>\ttwo</root>";
	assert.equal(XML.stringify(XML.parse(mixed), "  "), mixed);
});

test("retains multiline comments and CDATA during serialization", () => {
	const xml = "<root><!--line1\n\tline2--><![CDATA[\n\ttext\n]]></root>";
	assert.equal(XML.stringify(XML.parse(xml)), xml);
});

test("ignores plist layout whitespace while retaining key and string whitespace", () => {
	const xml = "\n<plist>\n  <dict>\n    <key>\n key\t</key>\n    <string>\n value\t\n</string>\n    <key>array</key>\n    <array>\n      <integer>7</integer>\n      <true/>\n    </array>\n  </dict>\n</plist>\n";
	const parsed = XML.parse(xml);
	assert.deepEqual(parsed, { plist: { "\n key\t": "\n value\t\n", array: [7n, true] } });
	for (const tab of ["", "  "]) assert.deepEqual(XML.parse(XML.stringify(parsed, tab)), parsed);
});

test("invokes each plist reviver once regardless of layout whitespace", () => {
	for (const xml of ["<plist><dict><key>n</key><integer>7</integer></dict></plist>", "<plist>\n  <dict>\n    <key>n</key>\n    <integer>7</integer>\n  </dict>\n</plist>"]) {
		const keys = [];
		XML.parse(xml, (key, value) => {
			keys.push(key);
			return value;
		});
		assert.deepEqual(keys, ["key", "integer", "dict", "plist", ""]);
	}
});

test("treats entity syntax as literal text and escapes it once", () => {
	const text = "Sage & Vine <br/> &#x000A;";
	const output = XML.stringify({ p: { "#": text } });
	assert.equal(output, "<p>Sage &amp; Vine &lt;br/&gt; &amp;#x000A;</p>");
	assert.equal(XML.parse(output).p["#"], text);
});
