import { ArgvError, defineSchema, parse } from "../src";

describe("parse - basic types", () => {
  test("strings via --name=value", () => {
    const schema = defineSchema({ name: { type: "string" } });
    const { values } = parse(["--name=alice"], schema, { env: {} });
    expect(values.name).toBe("alice");
  });

  test("strings via --name value", () => {
    const schema = defineSchema({ name: { type: "string" } });
    const { values } = parse(["--name", "alice"], schema, { env: {} });
    expect(values.name).toBe("alice");
  });

  test("numbers parse from finite decimals", () => {
    const schema = defineSchema({ ratio: { type: "number" } });
    const { values } = parse(["--ratio", "0.25"], schema, { env: {} });
    expect(values.ratio).toBe(0.25);
  });

  test("numbers reject NaN-producing input", () => {
    const schema = defineSchema({ ratio: { type: "number" } });
    expect(() => parse(["--ratio", "abc"], schema, { env: {} })).toThrow(
      /expected a finite number/,
    );
  });

  test("integers reject decimals", () => {
    const schema = defineSchema({ count: { type: "integer" } });
    expect(() => parse(["--count", "3.5"], schema, { env: {} })).toThrow(
      /expected an integer/,
    );
  });

  test("integers reject overflow above safe range", () => {
    const schema = defineSchema({ count: { type: "integer" } });
    expect(() =>
      parse(["--count", "9007199254740993"], schema, { env: {} }),
    ).toThrow(/exceeds safe range/);
  });

  test("number scientific notation accepted", () => {
    const schema = defineSchema({ ratio: { type: "number" } });
    const { values } = parse(["--ratio", "1e-3"], schema, { env: {} });
    expect(values.ratio).toBe(0.001);
  });

  test("number rejects Infinity literal", () => {
    const schema = defineSchema({ ratio: { type: "number" } });
    expect(() => parse(["--ratio", "Infinity"], schema, { env: {} })).toThrow(
      /finite number/,
    );
  });

  test("string rejects empty unless allowEmpty", () => {
    const schema = defineSchema({ name: { type: "string" } });
    expect(() => parse(["--name="], schema, { env: {} })).toThrow(
      /rejects the empty string/,
    );
  });

  test("string allows empty when allowEmpty=true", () => {
    const schema = defineSchema({
      name: { type: "string", allowEmpty: true },
    });
    const { values } = parse(["--name="], schema, { env: {} });
    expect(values.name).toBe("");
  });

  test("error has code and optionName", () => {
    const schema = defineSchema({ count: { type: "integer" } });
    try {
      parse(["--count", "x"], schema, { env: {} });
      fail("should have thrown");
    } catch (error) {
      expect(error).toBeInstanceOf(ArgvError);
      const err = error as ArgvError;
      expect(err.code).toBe("INVALID_VALUE");
      expect(err.optionName).toBe("count");
    }
  });
});

describe("parse - extra coverage", () => {
  test("number rejects huge exponent that overflows to Infinity", () => {
    const { defineSchema, parse } = require("../src");
    const schema = defineSchema({ ratio: { type: "number" } });
    expect(() => parse(["--ratio", "1e1000"], schema, { env: {} })).toThrow(
      /finite number/,
    );
  });
});
