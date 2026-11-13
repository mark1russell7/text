import { Buffer } from "node:buffer";
import { describe, expect, it } from "vitest";
import { strings } from "../test/strings.ts";
import { redactSecrets } from "./redact.ts";

const MARK = "[secret]";

describe("redactSecrets", () => {
  it("removes the raw form, the form of encodeURIComponent and the form of URLSearchParams", () => {
    const secret = "k3y/with space!(x)~";
    const query = new URLSearchParams({ key: secret }).toString();
    expect(query).toBe("key=k3y%2Fwith+space%21%28x%29%7E");
    const text = `raw ${secret}, path /v1/${encodeURIComponent(secret)}/x, query ?${query}&b=1`;
    expect(redactSecrets(text, [secret])).toBe(`raw ${MARK}, path /v1/${MARK}/x, query ?key=${MARK}&b=1`);
  });

  it("removes the password and the Basic form of a pair, and keeps the user", () => {
    const pair = { user: "client-id-0001", password: "client-secret-0001" };
    const basic = Buffer.from(`${pair.user}:${pair.password}`, "utf8").toString("base64");
    const text = `GET /token user=${pair.user} password=${pair.password} Authorization: Basic ${basic} form=${encodeURIComponent(basic)}`;
    expect(redactSecrets(text, [pair])).toBe(`GET /token user=${pair.user} password=${MARK} Authorization: Basic ${MARK} form=${MARK}`);
    expect(redactSecrets(text, [pair, pair.user])).not.toContain(pair.user);
  });

  it("gives the Basic form of each test string as Buffer does, with a lone surrogate as U+FFFD", () => {
    const texts = [...strings("text/secrets/basic", 1000), "a\ud800b", "\udc00", "😀\ud83d"];
    for (const password of texts.filter((text) => text !== "")) {
      const basic = Buffer.from(`user:${password}`, "utf8").toString("base64");
      expect(redactSecrets(basic, [{ user: "user", password }])).toBe(MARK);
    }
  });

  it("gives one mark for each test string that is all one secret", () => {
    for (const secret of strings("text/secrets/whole", 1000).filter((text) => text !== "")) {
      expect(redactSecrets(secret, [secret])).toBe(MARK);
    }
  });

  it("removes the longest secret at a position, so a secret in a secret gives one mark", () => {
    expect(redactSecrets("token=abcdefghijkl end=abcdefgh", ["abcdefgh", "abcdefghijkl"])).toBe(`token=${MARK} end=${MARK}`);
  });

  it("finds each secret as text, not as a pattern", () => {
    expect(redactSecrets("a.b*c(d) aXbbc(d)", ["a.b*c(d)"])).toBe(`${MARK} aXbbc(d)`);
    expect(redactSecrets("x$&y", ["$&"])).toBe(`x${MARK}y`);
  });

  it("puts the mark of the options as text", () => {
    expect(redactSecrets("key=abc12345", ["abc12345"], { mark: "$&$1***" })).toBe("key=$&$1***");
  });

  it("ignores an empty secret and an empty password, and keeps a text with no secrets", () => {
    expect(redactSecrets("a text", [])).toBe("a text");
    expect(redactSecrets("a text", ["", { user: "a", password: "" }])).toBe("a text");
  });

  it("removes a secret with a lone surrogate in its raw form", () => {
    expect(redactSecrets("x\ud800y", ["\ud800"])).toBe(`x${MARK}y`);
  });
});
