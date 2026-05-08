/**
 * Help-text generator for argv-strict schemas.
 *
 * `formatHelp(schema)` returns a single string with one line per option,
 * suitable for printing under your program's usage banner.
 */

import { OptionSpec, Schema } from "./schema";

export interface HelpOptions {
  /** Title printed above the option list. */
  title?: string;
  /** Width to pad option names to. */
  pad?: number;
}

export function formatHelp(schema: Schema, options: HelpOptions = {}): string {
  const lines: string[] = [];
  if (options.title !== undefined) {
    lines.push(options.title);
    lines.push("");
  }
  const names = Object.keys(schema).sort();
  const pad = options.pad ?? computePad(schema, names);
  for (const name of names) {
    lines.push(formatOptionLine(name, schema[name], pad));
  }
  return lines.join("\n");
}

function computePad(schema: Schema, names: readonly string[]): number {
  let width = 0;
  for (const name of names) {
    const head = headFor(name, schema[name]);
    if (head.length > width) {
      width = head.length;
    }
  }
  return width + 2;
}

function headFor(name: string, spec: OptionSpec): string {
  const aliasPart = spec.alias === undefined ? "" : `-${spec.alias}, `;
  if (spec.type === "boolean") {
    return `  ${aliasPart}--${name}`;
  }
  return `  ${aliasPart}--${name} <${spec.type}>`;
}

function formatOptionLine(name: string, spec: OptionSpec, pad: number): string {
  const head = headFor(name, spec);
  const padded = head.padEnd(pad, " ");
  const suffix = describeSuffix(spec);
  const description = spec.description ?? "";
  const trailing = [description, suffix].filter((part) => part !== "").join("  ");
  return trailing === "" ? padded.trimEnd() : `${padded} ${trailing}`;
}

function describeSuffix(spec: OptionSpec): string {
  const tags: string[] = [];
  if (spec.required) {
    tags.push("[required]");
  }
  if (spec.default !== undefined) {
    tags.push(`[default: ${formatDefault(spec.default)}]`);
  }
  if (
    (spec.type === "string" ||
      spec.type === "number" ||
      spec.type === "integer" ||
      spec.type === "string-array" ||
      spec.type === "number-array") &&
    spec.choices !== undefined
  ) {
    tags.push(`[choices: ${spec.choices.join(", ")}]`);
  }
  if (spec.env !== undefined) {
    tags.push(`[env: ${spec.env}]`);
  }
  return tags.join(" ");
}

function formatDefault(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map(formatDefault).join(", ")}]`;
  }
  if (typeof value === "string") {
    return `"${value}"`;
  }
  return String(value);
}
