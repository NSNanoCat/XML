import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";
import XML from "../XML.mjs";

const originals = await readFile(new URL("./fixtures/youtube-Icc1rSoe9gA.en.srv3.xml", import.meta.url), "utf8");
const translations = await readFile(new URL("./fixtures/youtube-Icc1rSoe9gA.zh-Hans.srv3.xml", import.meta.url), "utf8");

// SHA-256 of JSON [t, d, text] rows obtained independently with Python ElementTree.
for (const [language, source, digest] of [
	["English", originals, "3549f799396a3d3698c7cf5f2278321a24c90ad59ecc600b89a5eda8f26d6912"],
	["Chinese", translations, "0b494fe13d4d728b0eb58ada0d844e290894bf587a26cc832468cf7a05099e73"],
]) {
	test(`parses and round-trips all 905 real ${language} cues without losing text or timing`, () => {
		const parsed = XML.parse(source);
		for (const body of [parsed, XML.parse(XML.stringify(parsed))]) {
			const rows = body.timedtext.body.p.map(para => [para["@t"], para["@d"], para["#"] ?? ""]);
			assert.equal(rows.length, 905);
			assert.equal(createHash("sha256").update(JSON.stringify(rows)).digest("hex"), digest);
		}
	});
}

for (const reverse of [false, true]) {
	test(`retains all real bilingual cues with ${reverse ? "Chinese" : "English"} first`, () => {
		const original = XML.parse(originals);
		const translated = XML.parse(translations);
		const expected = translated.timedtext.body.p.map((para, index) => {
			const english = original.timedtext.body.p[index];
			assert.equal(para["@t"], english["@t"]);
			const texts = [english["#"] ?? "", para["#"] ?? ""];
			if (reverse) texts.reverse();
			return [para["@t"], para["@d"], texts.join("\n").trim()];
		});
		for (const [index, para] of translated.timedtext.body.p.entries()) para["#"] = expected[index][2];
		const snapshot = structuredClone(translated);
		const output = XML.stringify(translated);
		const actual = XML.parse(output).timedtext.body.p.map(para => [para["@t"], para["@d"], para["#"] ?? ""]);

		assert.equal(actual.length, 905);
		for (const [index, row] of actual.entries()) assert.deepEqual(row, expected[index], `cue ${index}`);
		assert.deepEqual(translated, snapshot);
		assert.equal(XML.stringify(translated), output);
		assert.ok(output.includes("Sage &amp; Vine"));
		assert.ok(!output.includes("&amp;#x000A;"));
	});
}
