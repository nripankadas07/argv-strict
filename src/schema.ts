/**
 * Schema definitions and the `defineSchema` identity helper.
 *
 * A schema is a record keyed by long option name (without leading `--`).
 * Every entry has a `type` and may declare an alias, default, choices,
 * description, env-var fallback, custom validator, and `required` flag.
 */

import { ArgvError } from "./errors";

export type OptionType =
  | "string"
  | "number"
  | "integer"
  | "boolean"
  | "string-array"
  | "number-array";

export interface BaseOption<T> {
  alias?: string;
  description?: string;
  required?: boolean;
  default?: T;
  env?: string;
  validate?: (value: T) => true | string;
}

export interface StringOption extends BaseOption<string> {
  type: "string";
  choices?: readonly string[];
  allowEmpty?: boolean;
}

export interface NumberOption extends BaseOption<number> {
  type: "number";
  choices?: readonly number[];
}

export interface IntegerOption extends BaseOption<number> {
  type: "integer";
  choices?: readonly number[];
}

export interface BooleanOption extends BaseOption<boolean> {
  type: "boolean";
}

export interface StringArrayOption extends BaseOption<readonly string[]> {
  type: "string-array";
  choices?: readonly string[];
}

export interface NumberArrayOption extends BaseOption<readonly number[]> {
  type: "number-array";
  choices?: readonly number[];
}

export type OptionSpec =
  | StringOption
  | NumberOption
  | IntegerOption
  | BooleanOption
  | StringArrayOption
  | NumberArrayOption;

export type Schema = Record<string, OptionSpec>;

export type InferValue<O extends OptionSpec> = O extends StringOption
  ? string
  : O extends NumberOption | IntegerOption
    ? number
    : O extends BooleanOption
      ? boolean
      : O extends StringArrayOption
        ? string[]
        : O extends NumberArrayOption
          ? number[]
          : never;

export type InferValues<S extends Schema> = {
  [K in keyof S]: InferValue<S[K]> | undefined;
};

/** Identity function — kept so callers get full type inference. */
export function defineSchema<S extends Schema>(schema: S): S {
  validateSchema(schema);
  return schema;
}

const NAME_REGEX = /^[A-Za-z][A-Za-z0-9-]*$/;

export function validateSchema(schema: Schema): void {
  if (typeof schema !== "object" || schema === null) {
    throw new ArgvError("BAD_SCHEMA", "schema must be an object");
  }
  const aliases = new Set<string>();
  for (const name of Object.keys(schema)) {
    validateOptionEntry(name, schema[name], aliases);
  }
}

function validateOptionEntry(
  name: string,
  spec: OptionSpec,
  aliases: Set<string>,
): void {
  if (!NAME_REGEX.test(name)) {
    throw new ArgvError(
      "BAD_SCHEMA",
      `option name "${name}" must match ${NAME_REGEX.source}`,
      name,
    );
  }
  if (name.startsWith("no-")) {
    throw new ArgvError(
      "BAD_SCHEMA",
      `option name "${name}" must not start with "no-" (reserved for boolean negation)`,
      name,
    );
  }
  if (spec.alias === undefined) {
    return;
  }
  if (spec.alias.length !== 1 || !/^[A-Za-z]$/.test(spec.alias)) {
    throw new ArgvError(
      "BAD_SCHEMA",
      `alias for "${name}" must be a single ASCII letter, got "${spec.alias}"`,
      name,
    );
  }
  if (aliases.has(spec.alias)) {
    throw new ArgvError(
      "BAD_SCHEMA",
      `alias "${spec.alias}" is used by more than one option`,
      name,
    );
  }
  aliases.add(spec.alias);
}
