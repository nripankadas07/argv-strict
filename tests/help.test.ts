import { defineSchema, formatHelp } from "../src";

describe("formatHelp", () => {
  test("renders title and option lines", () => {
    const schema = defineSchema({
      name: { type: "string", description: "user name", alias: "n" },
      verbose: { type: "boolean", alias: "v" },
    });
    const help = formatHelp(schema, { title: "myprog [options]" });
    expect(help).toContain("myprog [options]");
    expect(help).toContain("--name <string>");
    expect(help).toContain("-n, --name");
    expect(help).toContain("user name");
    expect(help).toContain("--verbose");
  });

  test("annotates required, default, env, choices", () => {
    const schema = defineSchema({
      level: {
        type: "string",
        choices: ["info", "warn"] as const,
        default: "info",
        description: "log level",
        env: "LOG_LEVEL",
      },
      name: { type: "string", required: true },
    });
    const help = formatHelp(schema);
    expect(help).toContain("[required]");
    expect(help).toContain('[default: "info"]');
    expect(help).toContain("[choices: info, warn]");
    expect(help).toContain("[env: LOG_LEVEL]");
  });

  test("no title when not provided", () => {
    const schema = defineSchema({ x: { type: "boolean" } });
    const help = formatHelp(schema);
    expect(help.startsWith("  --x")).toBe(true);
  });

  test("default array formatted as bracketed list", () => {
    const schema = defineSchema({
      tag: { type: "string-array", default: ["a", "b"] },
    });
    const help = formatHelp(schema);
    expect(help).toContain('[default: ["a", "b"]]');
  });

  test("respects custom pad", () => {
    const schema = defineSchema({ x: { type: "boolean" } });
    const help = formatHelp(schema, { pad: 20 });
    expect(help.startsWith("  --x")).toBe(true);
  });

  test("default number rendered without quotes", () => {
    const schema = defineSchema({
      port: { type: "integer", default: 8080 },
    });
    const help = formatHelp(schema);
    expect(help).toContain("[default: 8080]");
  });
});
