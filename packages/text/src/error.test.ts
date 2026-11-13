import { runInNewContext } from "node:vm";
import { describe, expect, it } from "vitest";
import { strings } from "../test/strings.ts";
import { errorMessage } from "./index.ts";

describe("errorMessage", () => {
  it("gives the message of an Error and of its subclasses", () => {
    expect(errorMessage(new Error("boom"))).toBe("boom");
    expect(errorMessage(new TypeError("bad type"))).toBe("bad type");
    expect(errorMessage(new Error(""))).toBe("");
    expect(errorMessage(new AggregateError([], "all failed"))).toBe("all failed");
  });

  it("gives the message of an Error from another realm", () => {
    const error: unknown = runInNewContext("new Error('boom')");
    // The test is of the structural check only when instanceof is false.
    expect(error instanceof Error).toBe(false);
    expect(errorMessage(error)).toBe("boom");
    expect(errorMessage(runInNewContext("new RangeError('far')"))).toBe("far");
  });

  it("gives the message text of an object that is not an Error", () => {
    expect(errorMessage({ message: "plain" })).toBe("plain");
    expect(errorMessage({ message: 42 })).toBe("[object Object]");
  });

  it("gives String(message) for an Error with a message that is not a text", () => {
    expect(errorMessage(Object.assign(new Error("x"), { message: 42 }))).toBe("42");
    expect(errorMessage(Object.assign(new Error("x"), { message: undefined }))).toBe("undefined");
  });

  it("gives String(message) for an Error from another realm with a message that is not a text", () => {
    const error: unknown = runInNewContext("const e = new Error('x'); e.message = 42; e");
    expect(error instanceof Error).toBe(false);
    expect(errorMessage(error)).toBe("42");
    expect(errorMessage(runInNewContext("const e = new TypeError('x'); e.message = null; e"))).toBe("null");
  });

  it("gives String(value) for each other value", () => {
    expect(errorMessage("text")).toBe("text");
    expect(errorMessage(42)).toBe("42");
    expect(errorMessage(10n)).toBe("10");
    expect(errorMessage(true)).toBe("true");
    expect(errorMessage(undefined)).toBe("undefined");
    expect(errorMessage(null)).toBe("null");
    expect(errorMessage(Symbol("s"))).toBe("Symbol(s)");
    expect(errorMessage({ toString: () => "custom" })).toBe("custom");
    expect(errorMessage([1, 2])).toBe("1,2");
  });

  it("does not throw when String throws", () => {
    expect(errorMessage(Object.create(null))).toBe("[object Object]");
    expect(
      errorMessage({
        toString() {
          throw new Error("no");
        },
      }),
    ).toBe("[object Object]");
    const getter = new Error("x");
    Object.defineProperty(getter, "message", {
      get() {
        throw new Error("no");
      },
    });
    expect(errorMessage(getter)).toBe("[object Error]");
    const message = Object.assign(new Error("x"), { message: Object.create(null) as unknown });
    expect(errorMessage(message)).toBe("[object Error]");
  });

  it("gives [object] for a revoked Proxy", () => {
    const { proxy, revoke } = Proxy.revocable({}, {});
    revoke();
    expect(errorMessage(proxy)).toBe("[object]");
  });

  it("gives each text, and the message of an Error of each text", () => {
    for (const text of strings("errorMessage", 500)) {
      expect(errorMessage(text)).toBe(text);
      expect(errorMessage(new Error(text))).toBe(text);
    }
  });
});
