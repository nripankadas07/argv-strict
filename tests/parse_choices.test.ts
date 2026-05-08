import { defineSchema, parse } from "../src";

describe("parse - choices and validators", () => {
  test("string choice valid", () => {
    const schema = defineSchema({
      level: { type: "string", choices: ["info", "warn"] as const },
    });
    const { values } = parse(["--level", "warn"], schema, { env: {} });
    expect(values.level).toBe("warn");
  });

  test("string choice invalid throws CHOICE_VIOLATION", () => {
    const schema = defineSchema({
      level: { type: "string", choices: ["info", "warn"] as const },
    });
    expect(() => parse(["--level", "debug"], schema, { env: {} })).toThrow(
      /must be one of "info", "warn"/,
    );
  });

  test("number choice", () => {
    const schema = defineSchema({
      port: { type: "number", choices: [80, 443] as const },
    });
    expect(parse(["--port", "443"], schema, { env: {} }).values.port).toBe(443);
    expect(() => parse(["--port", "8080"], schema, { env: {} })).toThrow(
      /must be one of/,
    );
  });

  test("integer choice", () => {
    const schema = defineSchema({
      n: { type: "integer", choices: [1, 2] as const },
    });
    expect(() => parse(["--n", "3"], schema, { env: {} })).toThrow(
      /must be one of/,
    );
  });

  test("validate returning true allows value", () => {
    const schema = defineSchema({
      port: {
        type: "integer",
        validate: (n) => (n > 0 ? true : "must be positive"),
      },
    });
    const { values } = parse(["--port", "8080"], schema, { env: {} });
    expect(values.port).toBe(8080);
  });

  test("validate returning string throws VALIDATION_FAILED", () => {
    const schema = defineSchema({
      port: {
        type: "integer",
        validate: (n) => (n > 0 ? true : "must be positive"),
      },
    });
    expect(() => parse(["--port", "0"], schema, { env: {} })).toThrow(
      /must be positive/,
    );
  });

  test("validator skipped when value undefined", () => {
    const schema = defineSchema({
      port: {
        type: "integer",
        validate: (n) => (n > 0 ? true : "fail"),
      },
    });
    const { values } = parse([], schema, { env: {} });
    expect(values.port).toBeUndefined();
  });
});
