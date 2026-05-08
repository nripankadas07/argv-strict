import * as api from "../src";

describe("public surface", () => {
  test("exports parse, defineSchema, formatHelp, ArgvError", () => {
    expect(typeof api.parse).toBe("function");
    expect(typeof api.defineSchema).toBe("function");
    expect(typeof api.formatHelp).toBe("function");
    expect(api.ArgvError.prototype instanceof Error).toBe(true);
  });

  test("ArgvError preserves prototype chain", () => {
    const error = new api.ArgvError("INVALID_VALUE", "x", "name");
    expect(error instanceof api.ArgvError).toBe(true);
    expect(error instanceof Error).toBe(true);
    expect(error.name).toBe("ArgvError");
    expect(error.code).toBe("INVALID_VALUE");
    expect(error.optionName).toBe("name");
  });

  test("ArgvError without optionName", () => {
    const error = new api.ArgvError("BAD_SCHEMA", "schema bad");
    expect(error.optionName).toBeUndefined();
  });
});

describe("default options behavior", () => {
  test("parse called without options uses process.env", () => {
    const { defineSchema, parse } = require("../src");
    const schema = defineSchema({ verbose: { type: "boolean" } });
    const { values, positional } = parse(["--verbose"], schema);
    expect(values.verbose).toBe(true);
    expect(positional).toEqual([]);
  });

  test("parse without options reads env-backed value from process.env", () => {
    const { defineSchema, parse } = require("../src");
    const schema = defineSchema({
      name: { type: "string", env: "ARGV_STRICT_TEST_NAME" },
    });
    const original = process.env.ARGV_STRICT_TEST_NAME;
    process.env.ARGV_STRICT_TEST_NAME = "alice";
    try {
      const { values } = parse([], schema);
      expect(values.name).toBe("alice");
    } finally {
      if (original === undefined) {
        delete process.env.ARGV_STRICT_TEST_NAME;
      } else {
        process.env.ARGV_STRICT_TEST_NAME = original;
      }
    }
  });
});
