import { describe, expect, it } from "vitest";

import { CASES, convertCase, splitWords } from "@/lib/text/case";

describe("splitWords", () => {
  it("splits on spaces, underscores, hyphens and dots", () => {
    expect(splitWords("hello world_foo-bar.baz")).toEqual([
      "hello",
      "world",
      "foo",
      "bar",
      "baz",
    ]);
  });

  it("splits camelCase and PascalCase", () => {
    expect(splitWords("helloWorld")).toEqual(["hello", "World"]);
    expect(splitWords("HelloWorld")).toEqual(["Hello", "World"]);
  });

  it("keeps an acronym together before a capitalised word", () => {
    expect(splitWords("XMLHttpRequest")).toEqual(["XML", "Http", "Request"]);
    expect(splitWords("parseHTMLString")).toEqual(["parse", "HTML", "String"]);
  });

  it("keeps trailing digits on their word", () => {
    expect(splitWords("v2Api")).toEqual(["v2", "Api"]);
    expect(splitWords("HTML5 page")).toEqual(["HTML5", "page"]);
    expect(splitWords("item 42")).toEqual(["item", "42"]);
  });

  it("keeps a word with an apostrophe whole", () => {
    expect(splitWords("don't panic")).toEqual(["dont", "panic"]);
    expect(splitWords("it’s fine")).toEqual(["its", "fine"]);
  });

  it("handles accented and caseless scripts", () => {
    expect(splitWords("caféCrème")).toEqual(["café", "Crème"]);
    expect(splitWords("日本語 text")).toEqual(["日本語", "text"]);
  });

  it("returns nothing for empty or punctuation-only input", () => {
    expect(splitWords("")).toEqual([]);
    expect(splitWords("  --__!! ")).toEqual([]);
  });
});

describe("convertCase", () => {
  const input = "XMLHttp request_id";

  it.each([
    ["camel", "xmlHttpRequestId"],
    ["pascal", "XmlHttpRequestId"],
    ["snake", "xml_http_request_id"],
    ["constant", "XML_HTTP_REQUEST_ID"],
    ["kebab", "xml-http-request-id"],
    ["dot", "xml.http.request.id"],
    ["title", "Xml Http Request Id"],
    ["sentence", "Xml http request id"],
    ["lower", "xml http request id"],
    ["upper", "XML HTTP REQUEST ID"],
  ] as const)("converts to %s", (id, expected) => {
    expect(convertCase(input, id)).toBe(expected);
  });

  it("has a formatter for every listed case", () => {
    for (const { id } of CASES) {
      expect(convertCase("a b", id)).not.toBe("");
    }
  });

  it("converts each line on its own and keeps blank lines", () => {
    expect(convertCase("first name\r\n\nlast_name", "camel")).toBe("firstName\n\nlastName");
  });

  it("returns an empty string for empty input", () => {
    expect(convertCase("", "snake")).toBe("");
  });
});
