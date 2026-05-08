import { ArgvError, defineSchema } from "../src";

describe("defineSchema - validation", () => {
  test("rejects null", () => {
    expect(() =>
      defineSchema(null as unknown as Record<string, never>),
    ).toThrow(/schema must be an object/);
  });

  test("rejects bad option name", () => {
    expect(() =>
      defineSchema({ "1bad": { type: "string" } }),
    ).toThrow(/option name "1bad"/);
  });

  test("rejects no- prefix in option name", () => {
    expect(() =>
      defineSchema({ "no-cache": { type: "boolean" } }),
    ).toThrow(/must not start with "no-"/);
  });

  test("rejects multi-character alias", () => {
    expect(() =>
      defineSchema({
        verbose: { type: "boolean", alias: "vv" },
      }),
    ).toThrow(/alias for "verbose"/);
  });

  test("rejects non-letter alias", () => {
    expect(() =>
      defineSchema({
        verbose: { type: "boolean", alias: "1" },
      }),
    ).toThrow(/alias for "verbose"/);
  });

  test("rejects duplicate alias across options", () => {
    expect(() =>
      defineSchema({
        verbose: { type: "boolean", alias: "v" },
        version: { type: "boolean", alias: "v" },
      }),
    ).toThrow(/alias "v" is used by more than one option/);
  });

  test("error has BAD_SCHEMA code", () => {
    try {
      defineSchema({ "1bad": { type: "string" } });
      fail("should have thrown");
    } catch (error) {
      expect(error).toBeInstanceOf(ArgvError);
      expect((error as ArgvError).code).toBe("BAD_SCHEMA");
    }
  });
});
