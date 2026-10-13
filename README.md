# @nsnanocat/xml

XML / JSON 转换器，支持普通 XML 和 `<plist>`。属性写成 `@name`，文本节点写成 `#`。

XML / JSON converter with plist support. Attributes are stored under `@name`, and text nodes under `#`.

## Install

发布源：
- npm: [https://www.npmjs.com/package/@nsnanocat/xml](https://www.npmjs.com/package/@nsnanocat/xml)
- GitHub Packages: [https://github.com/NSNanoCat/XML/pkgs/npm/xml](https://github.com/NSNanoCat/XML/pkgs/npm/xml)

```sh
npm install @nsnanocat/xml
```

```sh
npm config set @nsnanocat:registry https://npm.pkg.github.com
# GitHub Packages requires a token with package read access.
# echo "//npm.pkg.github.com/:_authToken=YOUR_GITHUB_PAT" >> ~/.npmrc
npm install @nsnanocat/xml
```

## Usage

```js
import XML from "@nsnanocat/xml";

const xml = '<root foo="bar"><child>text</child></root>';
const json = XML.parse(xml);
const output = XML.stringify(json);

console.log(json);
console.log(output);
```

```js
import XML from "@nsnanocat/xml";

const plist = XML.parse("<plist><dict><key>n</key><integer>1</integer></dict></plist>");
// { plist: { n: 1n } }
```

## API

### `XML.parse(xml, reviver?)`

Parse XML into a JSON-like object. `<plist>` is handled specially and plist integers are returned as `BigInt`.

元素内的文本空白完整保留，包括首尾换行、制表符和元素之间的排版空白。文档元素外的空白忽略；plist 容器忽略排版空白，`key` 和 `string` 保留文本空白。

Text whitespace inside elements is preserved, including leading and trailing newlines, tabs, and layout whitespace between elements. Document-level whitespace is ignored. Plist containers ignore layout whitespace; keys and strings preserve their text.

### `XML.stringify(json, tab?)`

Serialize a JSON-like object back to XML. Pass `""` to omit generated indentation or a tab string to indent element-only content. Existing text whitespace is preserved in either mode, and mixed content receives no added indentation.

`#` 是纯文本，使用真实 `\n` 换行；序列化负责实体转义。字符串 `&#x000A;` 会作为字面文本输出，而不是换行实体。

`#` contains plain text; use a real `\n` for a line break. Serialization escapes XML entities. A string containing `&#x000A;` is serialized as literal text, not as a newline entity.

```js
const json = XML.parse('<p t="0">old</p>');
json.p["#"] = "Sage & Vine\n餐厅";
const output = XML.stringify(json);
// <p t="0">Sage &amp; Vine
// 餐厅</p>
```

解析后可以直接替换文本、替换或删除子节点、修改数组。序列化读取当前值，不修改输入对象；已有节点保留出现位置，数组按当前序号对应这些位置，新增项按属性顺序追加到末尾。数组替换为标量时，只在首次出现的位置输出一次。

Parsed text, children, and arrays can be edited directly. Serialization reads current values without mutating the input. Existing occurrence positions are retained, array entries use their current indices, and new entries are appended in property order. Replacing an array with a scalar emits it once at the first occurrence position.

### `XML.about()`

Print the package name and version.

## Development

Published package entry point: `XML.mjs`. `XML.beta.mjs` stays in the repo as the verbose beta build.

```sh
npm run format
npm run lint
npm test
npm run typecheck
npm run check
npm pack --dry-run
```

## License

[Apache-2.0](LICENSE)
