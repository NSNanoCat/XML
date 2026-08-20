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

### `XML.stringify(json, tab?)`

Serialize a JSON-like object back to XML. Pass `""` for compact output or a tab string to replace indentation.

### `XML.about()`

Print the package name and version.

## Development

Published package entry point: `XML.mjs`. `XML.beta.mjs` stays in the repo as the verbose beta build.

```sh
npm test
npm pack --dry-run
```

## License

[Apache-2.0](LICENSE)
