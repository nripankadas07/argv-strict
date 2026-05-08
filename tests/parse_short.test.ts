import { ArgvError, defineSchema, parse } from "../src";

describe("parse - short option forms", () => {
  test("short with separate value", () => {
    const schema = defineSchema({
      name: { type: "string", alias: "n" },
    });
    const { values } = parse(["-n", "alice"], schema, { env: {} });
    expect(values.name).toBe("alice");
  });

  test("short with =value form", () => {
    const schema = defineSchema({
      name: { type: "string", alias: "n" },
    });
    const { values } = parse(["-n=alice"], schema, { env: {} });
    expect(values.name).toBe("alice");
  });

  test("clustered boolean flags", () => {
    const schema = defineSchema({
      verbose: { type: "boolean", alias: "v" },
      quiet: { type: "boolean", alias: "q" },
      force: { type: "boolean", alias: "f" },
    });
    const { values } = parse(["-vqf"], schema, { env: {} });
    expect(values.verbose).toBe(true);
    expect(values.quiet).toBe(true);
    expect(values.force).toBe(true);
  });

  test("clustered with non-boolean throws INVALID_TYPE", () => {
    const schema = defineSchema({
      verbose: { type: "boolean", alias: "v" },
      name: { type: "string", alias: "n" },
    });
    try {
      parse(["-vn"], schema, { env: {} });
      fail("should have thrown");
    } catch (error) {
      expect((error as ArgvError).code).toBe("INVALID_TYPE");
    }
  });

  test("clustered with unknown letter throws UNKNOWN_OPTION", () => {
    const schema = defineSchema({
      verbose: { type: "boolean", alias: "v" },
    });
    expect(() => parse(["-vx"], schema, { env: {} })).toThrow(
      /unknown short option "-x"/,
    );
  });

  test("scalar option specified twice throws DUPLICATE_OPTION", () => {
    const schema = defineSchema({ name: { type: "string" } });
    try {
      parse(["--name", "a", "--name", "b"], schema, { env: {} });
      fail("should have thrown");
    } catch (error) {
      expect((error as ArgvError).code).toBe("DUPLICATE_OPTION");
    }
  });

  test("scalar option specified twice via alias throws", () => {
    const schema = defineSchema({
      name: { type: "string", alias: "n" },
    });
    expect(() =>
      parse(["--name", "a", "-n", "b"], schema, { env: {} }),
    ).toThrow(/specified more than once/);
  });
});

describe("parse - short option oddities", () => {
  test("multi-letter cluster with =value rejected", () => {
    const { defineSchema, parse } = require("../src");
    const schema = defineSchema({
      verbose: { type: "boolean", alias: "v" },
      quiet: { type: "boolean", alias: "q" },
    });
    expect(() => parse(["-vq=1"], schema, { env: {} })).toThrow(
      /unexpected short option form/,
    );
  });

  test("short alias for boolean rejects =value form", () => {
    const { defineSchema, parse } = require("../src");
    const schema = defineSchema({
      verbose: { type: "boolean", alias: "v" },
    });
    expect(() => parse(["-v=true"], schema, { env: {} })).toThrow(
      /does not accept "=value"/,
    );
  });
});
