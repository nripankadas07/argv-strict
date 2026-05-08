import { defineSchema, parse } from "../src";

describe("parse - required, defaults, env", () => {
  test("required string missing throws REQUIRED_MISSING", () => {
    const schema = defineSchema({
      name: { type: "string", required: true },
    });
    expect(() => parse([], schema, { env: {} })).toThrow(
      /required option "--name"/,
    );
  });

  test("required satisfied by env", () => {
    const schema = defineSchema({
      name: { type: "string", required: true, env: "APP_NAME" },
    });
    const { values } = parse([], schema, { env: { APP_NAME: "alice" } });
    expect(values.name).toBe("alice");
  });

  test("required satisfied by default", () => {
    const schema = defineSchema({
      name: { type: "string", required: true, default: "anon" },
    });
    const { values } = parse([], schema, { env: {} });
    expect(values.name).toBe("anon");
  });

  test("env empty string falls through to default", () => {
    const schema = defineSchema({
      name: {
        type: "string",
        env: "APP_NAME",
        default: "fallback",
      },
    });
    const { values } = parse([], schema, { env: { APP_NAME: "" } });
    expect(values.name).toBe("fallback");
  });

  test("argv overrides env", () => {
    const schema = defineSchema({
      name: { type: "string", env: "APP_NAME" },
    });
    const { values } = parse(["--name", "cli"], schema, {
      env: { APP_NAME: "env" },
    });
    expect(values.name).toBe("cli");
  });

  test("env loads number", () => {
    const schema = defineSchema({
      port: { type: "number", env: "PORT" },
    });
    const { values } = parse([], schema, { env: { PORT: "8080" } });
    expect(values.port).toBe(8080);
  });

  test("env rejects bad number", () => {
    const schema = defineSchema({
      port: { type: "number", env: "PORT" },
    });
    expect(() => parse([], schema, { env: { PORT: "abc" } })).toThrow(
      /finite number/,
    );
  });

  test("env loads integer", () => {
    const schema = defineSchema({
      port: { type: "integer", env: "PORT" },
    });
    const { values } = parse([], schema, { env: { PORT: "3000" } });
    expect(values.port).toBe(3000);
  });

  test("env loads boolean true via '1' / 'true'", () => {
    const schema = defineSchema({
      verbose: { type: "boolean", env: "VERBOSE" },
    });
    expect(parse([], schema, { env: { VERBOSE: "1" } }).values.verbose).toBe(
      true,
    );
    expect(parse([], schema, { env: { VERBOSE: "TRUE" } }).values.verbose).toBe(
      true,
    );
  });

  test("env loads boolean false via '0' / 'false'", () => {
    const schema = defineSchema({
      verbose: { type: "boolean", env: "VERBOSE" },
    });
    expect(parse([], schema, { env: { VERBOSE: "0" } }).values.verbose).toBe(
      false,
    );
    expect(
      parse([], schema, { env: { VERBOSE: "false" } }).values.verbose,
    ).toBe(false);
  });

  test("env rejects ambiguous boolean", () => {
    const schema = defineSchema({
      verbose: { type: "boolean", env: "VERBOSE" },
    });
    expect(() => parse([], schema, { env: { VERBOSE: "yes" } })).toThrow(
      /must be 0\/1\/true\/false/,
    );
  });

  test("env loads string-array as comma-split", () => {
    const schema = defineSchema({
      tag: { type: "string-array", env: "TAGS" },
    });
    const { values } = parse([], schema, { env: { TAGS: "a,b,c" } });
    expect(values.tag).toEqual(["a", "b", "c"]);
  });

  test("env loads number-array", () => {
    const schema = defineSchema({
      port: { type: "number-array", env: "PORTS" },
    });
    const { values } = parse([], schema, { env: { PORTS: "80,443" } });
    expect(values.port).toEqual([80, 443]);
  });

  test("env array trims whitespace", () => {
    const schema = defineSchema({
      tag: { type: "string-array", env: "TAGS" },
    });
    const { values } = parse([], schema, {
      env: { TAGS: " a , b , c " },
    });
    expect(values.tag).toEqual(["a", "b", "c"]);
  });

  test("required string-array missing throws", () => {
    const schema = defineSchema({
      tag: { type: "string-array", required: true },
    });
    expect(() => parse([], schema, { env: {} })).toThrow(
      /required option "--tag"/,
    );
  });

  test("default string-array is copied (not shared reference)", () => {
    const defaultTags = ["x"];
    const schema = defineSchema({
      tag: { type: "string-array", default: defaultTags },
    });
    const result = parse([], schema, { env: {} });
    (result.values.tag as string[]).push("y");
    expect(defaultTags).toEqual(["x"]);
  });
});

describe("parse - required satisfied", () => {
  test("required string-array satisfied by argv", () => {
    const { defineSchema, parse } = require("../src");
    const schema = defineSchema({
      tag: { type: "string-array", required: true },
    });
    const { values } = parse(["--tag", "a"], schema, { env: {} });
    expect(values.tag).toEqual(["a"]);
  });
});

describe("parse - required string-array via default", () => {
  test("required string-array satisfied by non-empty default", () => {
    const { defineSchema, parse } = require("../src");
    const schema = defineSchema({
      tag: {
        type: "string-array",
        required: true,
        default: ["x"],
      },
    });
    const { values } = parse([], schema, { env: {} });
    expect(values.tag).toEqual(["x"]);
  });
});
