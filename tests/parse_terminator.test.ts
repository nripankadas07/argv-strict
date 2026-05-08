import { defineSchema, parse } from "../src";

describe("parse - positional and -- terminator", () => {
  test("positionals collected separately", () => {
    const schema = defineSchema({ verbose: { type: "boolean" } });
    const { positional } = parse(
      ["--verbose", "alpha", "beta"],
      schema,
      { env: {} },
    );
    expect(positional).toEqual(["alpha", "beta"]);
  });

  test("-- terminator passes everything through as positional", () => {
    const schema = defineSchema({
      verbose: { type: "boolean" },
      name: { type: "string" },
    });
    const { values, positional } = parse(
      ["--verbose", "--", "--name", "alice"],
      schema,
      { env: {} },
    );
    expect(values.verbose).toBe(true);
    expect(values.name).toBeUndefined();
    expect(positional).toEqual(["--name", "alice"]);
  });

  test("negative-number-looking token treated as value", () => {
    const schema = defineSchema({ n: { type: "number" } });
    const { values } = parse(["--n", "-42"], schema, { env: {} });
    expect(values.n).toBe(-42);
  });

  test("negative number is positional when no option awaits it", () => {
    const schema = defineSchema({ verbose: { type: "boolean" } });
    const { positional } = parse(["--verbose", "-7"], schema, { env: {} });
    expect(positional).toEqual(["-7"]);
  });

  test("unknown long option throws", () => {
    const schema = defineSchema({ verbose: { type: "boolean" } });
    expect(() => parse(["--unknown"], schema, { env: {} })).toThrow(
      /unknown option "--unknown"/,
    );
  });

  test("unknown short option throws", () => {
    const schema = defineSchema({ verbose: { type: "boolean", alias: "v" } });
    expect(() => parse(["-q"], schema, { env: {} })).toThrow(
      /unknown short option/,
    );
  });

  test("missing value at end of argv throws", () => {
    const schema = defineSchema({ name: { type: "string" } });
    expect(() => parse(["--name"], schema, { env: {} })).toThrow(
      /requires a value/,
    );
  });
});
