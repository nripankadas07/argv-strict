import { defineSchema, parse } from "../src";

describe("parse - arrays accumulate", () => {
  test("string-array collects multiple occurrences", () => {
    const schema = defineSchema({
      tag: { type: "string-array", alias: "t" },
    });
    const { values } = parse(
      ["--tag", "a", "-t", "b", "--tag=c"],
      schema,
      { env: {} },
    );
    expect(values.tag).toEqual(["a", "b", "c"]);
  });

  test("string-array default empty when missing", () => {
    const schema = defineSchema({ tag: { type: "string-array" } });
    const { values } = parse([], schema, { env: {} });
    expect(values.tag).toEqual([]);
  });

  test("string-array honors default", () => {
    const schema = defineSchema({
      tag: { type: "string-array", default: ["x"] },
    });
    const { values } = parse([], schema, { env: {} });
    expect(values.tag).toEqual(["x"]);
  });

  test("number-array parses each occurrence", () => {
    const schema = defineSchema({ port: { type: "number-array" } });
    const { values } = parse(
      ["--port", "8080", "--port", "9090"],
      schema,
      { env: {} },
    );
    expect(values.port).toEqual([8080, 9090]);
  });

  test("number-array rejects bad value", () => {
    const schema = defineSchema({ port: { type: "number-array" } });
    expect(() => parse(["--port", "x"], schema, { env: {} })).toThrow(
      /finite number/,
    );
  });

  test("string-array enforces choices", () => {
    const schema = defineSchema({
      level: {
        type: "string-array",
        choices: ["info", "warn"] as const,
      },
    });
    expect(() =>
      parse(["--level", "debug"], schema, { env: {} }),
    ).toThrow(/must be one of/);
  });
});
