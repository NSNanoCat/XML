// refer: https://github.com/Peng-YM/QuanX/blob/master/Tools/XMLParser/xml-parser.js
// refer: https://goessner.net/download/prj/jsonxml/
const XML_ORDER = Symbol("XML_ORDER");

export default class XML {
	static name = "XML";
	static version = "0.4.4";
	static about = () => console.log(`\n🟧 ${this.name} v${this.version}\n`);

	static #ATTRIBUTE_KEY = "@";
	static #CHILD_NODE_KEY = "#";
	static #UNESCAPE = {
		"&amp;": "&",
		"&lt;": "<",
		"&gt;": ">",
		"&apos;": "'",
		"&quot;": '"',
	};
	static #ESCAPE = {
		"&": "&amp;",
		"<": "&lt;",
		">": "&gt;",
		"'": "&apos;",
		'"': "&quot;",
	};

	static parse(xml = new String(), reviver = "") {
		const UNESCAPE = this.#UNESCAPE;
		const ATTRIBUTE_KEY = this.#ATTRIBUTE_KEY;
		const CHILD_NODE_KEY = this.#CHILD_NODE_KEY;
		const DOM = toDOM(xml);
		const json = fromXML(DOM, reviver);
		return json;

		/***************** Fuctions *****************/
		function toDOM(text) {
			const list = text.split(/<([^!<>?](?:'[\S\s]*?'|"[\S\s]*?"|[^'"<>])*|!(?:--[\S\s]*?--|\[[^[\]'"<>]+\[[\S\s]*?]]|DOCTYPE[^[<>]*?\[[\S\s]*?]|(?:ENTITY[^"<>]*?"[\S\s]*?")?[\S\s]*?)|\?[\S\s]*?\?)>/);
			const length = list.length;

			// root element
			const root = { children: [] };
			let elem = root;

			// dom tree stack
			const stack = [];

			// parse
			for (let i = 0; i < length; ) {
				// text node
				const str = list[i++];
				if (str) appendText(str);

				// child node
				const tag = list[i++];
				if (tag) parseNode(tag);
			}
			return root;
			/***************** Fuctions *****************/
			function parseNode(tag) {
				const tags = tag.split(" ");
				const name = tags.shift();
				const length = tags.length;
				let child = {};
				switch (name[0]) {
					case "/": {
						// close tag
						const closed = tag.replace(/^\/|[\s/].*$/g, "").toLowerCase();
						while (stack.length) {
							const tagName = elem?.name?.toLowerCase?.();
							elem = stack.pop();
							if (tagName === closed) break;
						}
						break;
					}
					case "?":
						// XML declaration
						child.name = name;
						child.raw = tags.join(" ");
						appendChild(child);
						break;
					case "!":
						if (/!\[CDATA\[([\s\S]*?)\]\]/.test(tag)) {
							// CDATA section
							child.name = "!CDATA";
							//child.raw = tag.slice(9, -2);
							child.raw = tag.match(/!\[CDATA\[(?<raw>[\s\S]*?)\]\]/)?.groups?.raw;
							//appendText(tag.slice(9, -2));
						} else if (/!--([\s\S]*?)--/.test(tag)) {
							// Comment section
							child.name = "!--";
							child.raw = tag.match(/!--(?<raw>[\s\S]*?)--/)?.groups?.raw;
						} else {
							// Comment section
							child.name = name;
							child.raw = tags.join(" ");
						}
						appendChild(child);
						break;
					default:
						child = openTag(tag);
						appendChild(child);
						switch ((tags?.[length - 1] ?? name).slice(-1)) {
							case "/":
								//child.hasChild = false; // emptyTag
								delete child.children; // emptyTag
								break;
							default:
								stack.push(elem); // openTag
								elem = child;
								break;
						}
						break;
				}

				function openTag(tag) {
					const elem = { children: [] };
					tag = tag.replace(/\s*\/?$/, "");
					const pos = tag.search(/[\s='"/]/);
					if (pos < 0) {
						elem.name = tag;
					} else {
						elem.name = tag.substr(0, pos);
						elem.tag = tag.substr(pos);
					}
					return elem;
				}
			}

			function appendText(str) {
				if (elem !== root || str.trim()) appendChild(unescapeXML(str));
			}

			function appendChild(child) {
				elem.children.push(child);
			}
		}
		/***************** Fuctions *****************/
		function fromPlist(elem, reviver) {
			let object;
			switch (typeof elem) {
				case "string":
				case "undefined":
					object = elem;
					break;
				case "object": {
					//default:
					const name = elem.name;
					const children = ["plist", "dict", "array"].includes(name) ? elem.children.filter(child => typeof child !== "string" || child.trim()) : elem.children;

					object = {};

					switch (name) {
						case "plist": {
							const plist = fromPlist(children[0], reviver);
							object = Object.assign(object, plist);
							break;
						}
						case "dict": {
							let dict = children.map(child => fromPlist(child, reviver));
							dict = chunk(dict, 2);
							object = Object.fromEntries(dict);
							break;
						}
						case "array":
							if (!Array.isArray(object)) object = [];
							object = children.map(child => fromPlist(child, reviver));
							break;
						case "key": {
							const key = children[0];
							object = key;
							break;
						}
						case "true":
						case "false": {
							const boolean = name;
							object = JSON.parse(boolean);
							break;
						}
						case "integer": {
							const integer = children[0];
							//object = parseInt(integer);
							object = BigInt(integer);
							break;
						}
						case "real": {
							const real = children[0];
							//const digits = real.split(".")[1]?.length || 0;
							object = Number.parseFloat(real); //.toFixed(digits);
							break;
						}
						case "string": {
							const string = children[0];
							object = string;
							break;
						}
					}
					if (reviver) object = reviver(name || "", object);
					break;
				}
			}
			return object;

			/**
			 * Chunk Array
			 * @author VirgilClyne
			 * @param {Array} source - source
			 * @param {Number} length - number
			 * @return {Array<*>} target
			 */
			function chunk(source, length) {
				var index = 0,
					target = [];
				while (index < source.length) target.push(source.slice(index, (index += length)));
				return target;
			}
		}

		function fromXML(elem, reviver) {
			let object;
			const order = [];
			switch (typeof elem) {
				case "string":
				case "undefined":
					object = elem;
					break;
				case "object": {
					//default:
					const raw = elem.raw;
					const name = elem.name;
					const tag = elem.tag;
					const children = elem.children;

					if (raw !== undefined) object = raw;
					else if (tag) object = parseAttribute(tag, reviver);
					else if (!children) object = { [name]: undefined };
					else object = {};

					if (name === "plist") {
						const content = children.find(child => typeof child !== "string" || child.trim());
						object = Object.assign(object, fromPlist(content, reviver));
					} else
						children?.forEach?.((child, i) => {
							const value = fromXML(child, reviver);
							if (typeof child === "string") {
								addObject(object, CHILD_NODE_KEY, value, undefined, order);
							} else {
								const prevKey = child.raw !== undefined || child.tag || child.children ? undefined : children?.[i - 1]?.name;
								addObject(object, child.name, value, prevKey, order);
							}
						});
					if (children && children.length === 0) addObject(object, CHILD_NODE_KEY, null, undefined);
					if (order.length) Object.defineProperty(object, XML_ORDER, { value: order });
					/*
					if (Object.keys(object).length === 0) {
						if (elem.name) object[elem.name] = (elem.hasChild === false) ? null : "";
						else object = (elem.hasChild === false) ? null : "";
					}
					*/

					//if (Object.keys(object).length === 0) addObject(object, elem.name, (elem.hasChild === false) ? null : "");
					//if (Object.keys(object).length === 0) object = (elem.hasChild === false) ? undefined : "";
					if (reviver) object = reviver(name || "", object);
					break;
				}
			}
			return object;
			/***************** Fuctions *****************/
			function parseAttribute(tag, reviver) {
				if (!tag) return;
				const list = tag.split(/([^\s='"]+(?:\s*=\s*(?:'[\S\s]*?'|"[\S\s]*?"|[^\s'"]*))?)/);
				const length = list.length;
				let attributes, val;

				for (let i = 0; i < length; i++) {
					let str = removeSpaces(list[i]);
					//let str = removeBreakLine(list[i]);
					//let str = list[i]?.trim?.();
					if (!str) continue;

					if (!attributes) {
						attributes = {};
					}

					const pos = str.indexOf("=");
					if (pos < 0) {
						// bare attribute
						str = ATTRIBUTE_KEY + str;
						val = null;
					} else {
						// attribute key/value pair
						val = str.substr(pos + 1).replace(/^\s+/, "");
						str = ATTRIBUTE_KEY + str.substr(0, pos).replace(/\s+$/, "");

						// quote: foo="FOO" bar='BAR'
						const firstChar = val[0];
						const lastChar = val[val.length - 1];
						if (firstChar === lastChar && (firstChar === "'" || firstChar === '"')) {
							val = val.substr(1, val.length - 2);
						}

						val = unescapeXML(val);
					}
					if (reviver) val = reviver(str, val);

					addObject(attributes, str, val);
				}

				return attributes;

				function removeSpaces(str) {
					//return str && str.replace(/^\s+|\s+$/g, "");
					return str?.trim?.();
				}
			}

			function addObject(object, key, val, prevKey = key, order) {
				if (typeof val === "undefined") return;
				else {
					const hasPrevious = prevKey !== undefined && Object.prototype.hasOwnProperty.call(object, prevKey);
					const prev = hasPrevious ? object[prevKey] : undefined;
					const index = Array.isArray(prev) ? prev.length : hasPrevious ? 1 : 0;
					if (Array.isArray(prev)) prev.push(val);
					else if (hasPrevious) setObjectValue(object, prevKey, [prev, val]);
					else setObjectValue(object, key, val);
					order?.push([hasPrevious ? prevKey : key, index]);
				}

				function setObjectValue(object, key, value) {
					Object.defineProperty(object, key, {
						configurable: true,
						enumerable: true,
						value,
						writable: true,
					});
				}
			}
		}

		function unescapeXML(str) {
			return str.replace(/(&(?:lt|gt|amp|apos|quot|#(?:\d{1,7}|x[0-9a-fA-F]{1,6}));)/g, str => {
				if (str[1] === "#") {
					const code = str[2] === "x" ? Number.parseInt(str.substr(3), 16) : Number.parseInt(str.substr(2), 10);
					if (code >= 0 && code <= 0x10ffff && !(code >= 0xd800 && code <= 0xdfff)) return String.fromCodePoint(code);
				}
				return UNESCAPE[str] || str;
			});
		}
	}

	static stringify(json = new Object(), tab = "") {
		const ESCAPE = this.#ESCAPE;
		const ATTRIBUTE_KEY = this.#ATTRIBUTE_KEY;
		const CHILD_NODE_KEY = this.#CHILD_NODE_KEY;
		let XML = "";
		for (const [name, value] of getChildren(json)) XML += toXml(value, name, "");
		return XML;
		/***************** Fuctions *****************/
		function* getChildren(Elem) {
			const emitted = new Map();
			for (const [name, index] of Elem[XML_ORDER] ?? []) {
				if (!Object.prototype.hasOwnProperty.call(Elem, name)) continue;
				const value = Elem[name];
				if (Array.isArray(value)) {
					if (index < value.length) yield [name, value[index]];
				} else if (index === 0) yield [name, value];
				emitted.set(name, index + 1);
			}
			for (const name of Object.keys(Elem)) {
				if (name[0] === ATTRIBUTE_KEY) continue;
				const values = Array.isArray(Elem[name]) ? Elem[name] : [Elem[name]];
				for (let index = emitted.get(name) ?? 0; index < values.length; index++) yield [name, values[index]];
			}
		}

		function toXml(Elem, Name, Ind) {
			if (Name === CHILD_NODE_KEY) return escapeXML(Elem ?? "");
			let xml = "";
			switch (typeof Elem) {
				case "object":
					if (Array.isArray(Elem)) {
						xml = Elem.map(value => toXml(value, Name, Ind)).join(tab ? "\n" : "");
					} else {
						let attribute = "";
						let hasChild = false;
						for (const name of Object.keys(Elem)) {
							if (name[0] === ATTRIBUTE_KEY) {
								attribute += Elem[name] === null ? ` ${name.substring(1)}` : ` ${name.substring(1)}="${escapeXML(Elem[name] ?? "")}"`;
							} else if (Elem[name] === undefined) Name = name;
							else hasChild = true;
						}
						xml += `${Ind}<${Name}${attribute}${hasChild ? "" : "/"}>`;

						if (hasChild) {
							const formatted = tab && !Object.prototype.hasOwnProperty.call(Elem, CHILD_NODE_KEY) && !Object.prototype.hasOwnProperty.call(Elem, "!CDATA");
							const childIndent = formatted ? Ind + tab : "";
							const children = Name === "plist" ? toPlist(Elem, Name, childIndent) : Array.from(getChildren(Elem), ([name, value]) => toXml(value, name, childIndent)).join(formatted ? "\n" : "");
							xml += `${formatted && children ? "\n" : ""}${children}${formatted && children ? `\n${Ind}` : ""}</${Name}>`;
						}
					}
					break;
				case "string":
					switch (Name) {
						case "?xml":
							xml += `${Ind}<${Name} ${Elem.toString()}>`;
							break;
						case "?":
							xml += `${Ind}<${Name}${Elem.toString()}${Name}>`;
							break;
						case "!--":
							xml += `${Ind}<!--${Elem.toString()}-->`;
							break;
						case "!DOCTYPE":
							xml += `${Ind}<${Name} ${Elem.toString()}>`;
							break;
						case "!CDATA":
							xml += `${Ind}<![CDATA[${Elem.toString()}]]>`;
							break;
						default:
							xml += `${Ind}<${Name}>${escapeXML(Elem)}</${Name}>`;
							break;
					}
					break;
				case "undefined":
					xml += Ind + `<${Name.toString()}/>`;
					break;
			}
			return xml;
		}

		function toPlist(Elem, Name, Ind) {
			let plist = "";
			switch (typeof Elem) {
				case "boolean":
					plist = `${Ind}<${Elem.toString()}/>`;
					break;
				case "number":
					plist = `${Ind}<real>${Elem.toString()}</real>`;
					break;
				case "bigint":
					plist = `${Ind}<integer>${Elem.toString()}</integer>`;
					break;
				case "string":
					plist = `${Ind}<string>${escapeXML(Elem)}</string>`;
					break;
				case "object": {
					const childIndent = Ind + tab;
					const separator = tab ? "\n" : "";
					let content, tag;
					if (Array.isArray(Elem)) {
						content = Elem.map(value => toPlist(value, Name, childIndent)).join(separator);
						tag = "array";
					} else {
						content = Object.entries(Elem)
							.flatMap(([key, value]) => [`${childIndent}<key>${escapeXML(key)}</key>`, toPlist(value, key, childIndent)])
							.join(separator);
						tag = "dict";
					}
					plist = `${Ind}<${tag}>${content ? `${separator}${content}${separator}${Ind}` : ""}</${tag}>`;
					break;
				}
			}
			return plist;
		}

		function escapeXML(value) {
			return String(value).replace(/[&<>"']/g, character => ESCAPE[character]);
		}
	}
}
