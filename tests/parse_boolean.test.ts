import { ArgvError, defineSchema, parse } from "../src";

describe("parse - booleans (no string coercion)", () => {
  test("--flag sets true", () => {
    const schema = defineSchema({ verbose: { type: "boolean" } });
    const { values } = parse(["--verbose"], schema, { env: {} });
    expect(values.verbose).toBe(true);
  });

  test("--no-flag sets false", () => {
    const schema = defineSchema({ verbose: { type: "boolean" } });
    const { values } = parse(["--no-verbose"], schema, { env: {} });
    expect(values.verbose).toBe(false);
  });

  test("missing flag is undefined unless default given", () => {
    const schema = defineSchema({ verbose: { type: "boolean" } });
    const { values } = parse([], schema, { env: {} });
    expect(values.verbose).toBeUndefined();
  });

  test("missing flag uses default if present", () => {
    const schema = defineSchema({
      verbose: { type: "boolean", default: false },
    });
    const { values } = parse([], schema, { env: {} });
    expect(values.verbose).toBe(false);
  });

  test("--flag=true is rejected (no =value form for booleans)", () => {
    const schema = defineSchema({ verbose: { type: "boolean" } });
    expect(() => parse(["--verbose=true"], schema, { env: {} })).toThrow(
      /does not accept "=value"/,
    );
  });

  test("--no-flag=anything is rejected", () => {
    const schema = defineSchema({ verbose: { type: "boolean" } });
    expect(() => parse(["--no-verbose=1"], schema, { env: {} })).toThrow(
      /does not accept "=value" via "--no-...".form/,
    );
  });

  test("specifying both --flag and --no-flag throws DUPLICATE", () => {
    const schema = defineSchema({ verbose: { type: "boolean" } });
    try {
      parse(["--verbose", "--no-verbose"], schema, { env: {} });
      fail("should have thrown");
    } catch (error) {
      expect((error as ArgvError).code).toBe("DUPLICATE_OPTION");
    }
  });

  test("alias for boolean works", () => {
    const schema = defineSchema({
      verbose: { type: "boolean", alias: "v" },
    });
    const { values } = parse(["-v"], schema, { env: {} });
    expect(values.verbose).toBe(true);
  });

  test("boolean does not coerce 'yes'/'1' from positional value", () => {
    const schema = defineSchema({
      verbose: { type: "boolean" },
    });
    const { values, positional } = parse(["--verbose", "yes"], schema, {
      env: {},
    });
    expect(values.verbose).toBe(true);
    expect(positional).toEqual(["yes"]);
  });
});
