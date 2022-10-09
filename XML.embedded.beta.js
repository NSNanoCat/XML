// refer: https://github.com/Peng-YM/QuanX/blob/master/Tools/XMLParser/xml-parser.js
// refer: https://goessner.net/download/prj/jsonxml/json2xml.js
function XMLs(opts) {
	return new (class {
		constructor(opts) {
			this.name = "XML v0.1.4";
			this.opts = opts;
		};

		parse(xml = new String, reviver = "") {
			const UNESCAPE = {
				"&amp;": "&",
				"&lt;": "<",
				"&gt;": ">",
				"&apos;": "'",
				"&quot;": '"'
			};
			const ATTRIBUTE_KEY = "@";
			const CHILD_NODE_KEY = "#";

			$.log(`🚧 ${$.name}, parse XML`, "");
			let parsedXML = parseXML(xml);
			let json = toObject(parsedXML, reviver);
			$.log(`🚧 ${$.name}, parse XML`, `json: ${JSON.stringify(json)}`, "");
			return json;

			/***************** Fuctions *****************/
			function parseXML(text) {
				var list = String.prototype.split.call(text, /<([^!<>?](?:'[\S\s]*?'|"[\S\s]*?"|[^'"<>])*|!(?:--[\S\s]*?--|\[[^\[\]'"<>]+\[[\S\s]*?]]|DOCTYPE[^\[<>]*?\[[\S\s]*?]|(?:ENTITY[^"<>]*?"[\S\s]*?")?[\S\s]*?)|\?[\S\s]*?\?)>/);
				var length = list.length;

				// root element
				var root = { f: [] };
				var elem = root;

				// dom tree stack
				var stack = [];

				for (var i = 0; i < length;) {
					// text node
					var str = list[i++];
					if (str) appendText(str);

					// child node
					var tag = list[i++];
					if (tag) parseNode(tag);
				}

				return root;

				function parseNode(tag) {
					var tagLength = tag.length;
					var firstChar = tag[0];
					if (firstChar === "/") {
						// close tag
						var closed = tag.replace(/^\/|[\s\/].*$/g, "").toLowerCase();
						while (stack.length) {
							var tagName = elem.n && elem.n.toLowerCase();
							elem = stack.pop();
							if (tagName === closed) break;
						}
					} else if (firstChar === "?") {
						// XML declaration
						appendChild({ n: "?", r: tag.substr(1, tagLength - 2) });
					} else if (firstChar === "!") {
						if (tag.substr(1, 7) === "[CDATA[" && tag.substr(-2) === "]]") {
							// CDATA section
							appendText(tag.substr(8, tagLength - 10));
						} else {
							// comment
							appendChild({ n: "!", r: tag.substr(1) });
						}
					} else {
						var child = openTag(tag);
						appendChild(child);
						if (tag[tagLength - 1] === "/") {
							child.c = 1; // emptyTag
						} else {
							stack.push(elem); // openTag
							elem = child;
						}
					}
				}

				function appendChild(child) {
					elem.f.push(child);
				}

				function appendText(str) {
					str = removeSpaces(str);
					if (str) appendChild(unescapeXML(str));
				}
			}


			function openTag(tag) {
				var elem = { f: [] };
				tag = tag.replace(/\s*\/?$/, "");
				var pos = tag.search(/[\s='"\/]/);
				if (pos < 0) {
					elem.n = tag;
				} else {
					elem.n = tag.substr(0, pos);
					elem.t = tag.substr(pos);
				}
				return elem;
			}

			function parseAttribute(elem, reviver) {
				if (!elem.t) return;
				var list = elem.t.split(/([^\s='"]+(?:\s*=\s*(?:'[\S\s]*?'|"[\S\s]*?"|[^\s'"]*))?)/);
				var length = list.length;
				var attributes, val;

				for (var i = 0; i < length; i++) {
					var str = removeSpaces(list[i]);
					if (!str) continue;

					if (!attributes) {
						attributes = {};
					}

					var pos = str.indexOf("=");
					if (pos < 0) {
						// bare attribute
						str = ATTRIBUTE_KEY + str;
						val = null;
					} else {
						// attribute key/value pair
						val = str.substr(pos + 1).replace(/^\s+/, "");
						str = ATTRIBUTE_KEY + str.substr(0, pos).replace(/\s+$/, "");

						// quote: foo="FOO" bar='BAR'
						var firstChar = val[0];
						var lastChar = val[val.length - 1];
						if (firstChar === lastChar && (firstChar === "'" || firstChar === '"')) {
							val = val.substr(1, val.length - 2);
						}

						val = unescapeXML(val);
					}
					if (reviver) {
						val = reviver(str, val);
					}
					addObject(attributes, str, val);
				}

				return attributes;
			}

			function removeSpaces(str) {
				return str && str.replace(/^\s+|\s+$/g, "");
			}

			function unescapeXML(str) {
				return str.replace(/(&(?:lt|gt|amp|apos|quot|#(?:\d{1,6}|x[0-9a-fA-F]{1,5}));)/g, function (str) {
					if (str[1] === "#") {
						var code = (str[2] === "x") ? parseInt(str.substr(3), 16) : parseInt(str.substr(2), 10);
						if (code > -1) return String.fromCharCode(code);
					}
					return UNESCAPE[str] || str;
				});
			}

			function toObject(elem, reviver) {
				if ("string" === typeof elem) return elem;

				var raw = elem.r;
				if (raw) return raw;

				var attributes = parseAttribute(elem, reviver);
				var object;
				var childList = elem.f;
				var childLength = childList.length;

				if (attributes || childLength > 1) {
					// merge attributes and child nodes
					object = attributes || {};
					childList.forEach(function (child) {
						if ("string" === typeof child) {
							addObject(object, CHILD_NODE_KEY, child);
						} else {
							addObject(object, child.n, toObject(child, reviver));
						}
					});
				} else if (childLength) {
					// the node has single child node but no attribute
					var child = childList[0];
					object = toObject(child, reviver);
					if (child.n) {
						var wrap = {};
						wrap[child.n] = object;
						object = wrap;
					}
				} else {
					// the node has no attribute nor child node
					object = elem.c ? null : "";
				}

				if (reviver) {
					object = reviver(elem.n || "", object);
				}

				return object;
			}

			function addObject(object, key, val) {
				if ("undefined" === typeof val) return;
				var prev = object[key];
				if (prev instanceof Array) {
					prev.push(val);
				} else if (key in object) {
					object[key] = [prev, val];
				} else {
					object[key] = val;
				}
			}
		};

		stringify(json = new Object, tab = "") {
			$.log(`🚧 ${$.name}, stringify XML`, "");
			var XML = "";
			for (var m in json)
				XML += toXml(json[m], m, "");
			XML = tab ? XML.replace(/\t/g, tab) : XML.replace(/\t|\n/g, "");
			$.log(`🚧 ${$.name}, stringify XML`, `XML: ${XML}`, "");
			return XML;
			/***************** Fuctions *****************/
			function toXml(v, name, ind) {
				let xml = "";
				if (Array.isArray(v)) {
					xml = v.reduce(
						(prevXML, currXML) => prevXML += ind + toXml(currXML, name, ind + "\t") + "\n",
						""
					)
				} else if (typeof (v) == "object") {
					let hasChild = false;
					xml += ind + "<" + name;
					for (let m in v) {
						if (m.charAt(0) == "@") xml += " " + m.substring(1) + "=\"" + v[m].toString() + "\"";
						else hasChild = true;
					}
					xml += hasChild ? ">" : "/>";
					if (hasChild) {
						for (let m in v) {
							if (m == "#") xml += v[m];
							else if (m == "#cdata") xml += "<![CDATA[" + v[m] + "]]>";
							else if (m.charAt(0) != "@") xml += toXml(v[m], m, ind + "\t");
						}
						xml += (xml.charAt(xml.length - 1) == "\n" ? ind : "") + "</" + name + ">";
					}
				} else if (name === "?") xml += ind + "<" + name + v.toString() + name + ">";
				else xml += ind + "<" + name + ">" + v.toString() + "</" + name + ">";
				return xml;
			};
		};
	})(opts)
}
