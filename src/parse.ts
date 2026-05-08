/**
 * Argv parser entry point.
 *
 * `parse(argv, schema, options?)` returns a `ParseResult` containing the
 * typed values map and the positional arguments. Strict by default: every
 * unknown option throws, booleans never coerce from strings, and missing
 * required options throw after env fallback is consulted.
 */

import {
  checkChoices,
  coerceInteger,
  coerceNumber,
  coerceString,
} from "./coerce";
import { ArgvError } from "./errors";
import {
  InferValues,
  OptionSpec,
  Schema,
  validateSchema,
} from "./schema";

export interface ParseOptions {
  /** Override `process.env`. Pass `{}` to disable env fallback entirely. */
  env?: Readonly<Record<string, string | undefined>>;
  /**
   * Optional override for `argv0` style stripping. By default `parse`
   * reads exactly the array you pass in — no slicing.
   */
}

export interface ParseResult<S extends Schema> {
  values: InferValues<S>;
  positional: string[];
}

interface NameLookup {
  byLong: Map<string, string>;
  byAlias: Map<string, string>;
  booleanNoForms: Map<string, string>;
}

export function parse<S extends Schema>(
  argv: readonly string[],
  schema: S,
  options: ParseOptions = {},
): ParseResult<S> {
  validateSchema(schema);
  const lookup = buildLookup(schema);
  const seen = new Set<string>();
  const values = createInitial(schema);
  const positional: string[] = [];

  let index = 0;
  let pastTerminator = false;

  while (index < argv.length) {
    const token = argv[index];
    if (pastTerminator) {
      positional.push(token);
      index += 1;
      continue;
    }
    if (token === "--") {
      pastTerminator = true;
      index += 1;
      continue;
    }
    if (token.startsWith("--")) {
      index = handleLongOption(token, argv, index, schema, lookup, values, seen);
    } else if (
      token.startsWith("-") &&
      token.length > 1 &&
      !/^-\d/.test(token)
    ) {
      index = handleShortOption(token, argv, index, schema, lookup, values, seen);
    } else {
      positional.push(token);
      index += 1;
    }
  }

  applyEnvAndDefaults(schema, values, seen, options.env ?? process.env);
  enforceRequired(schema, values, seen);
  runValidators(schema, values);

  return { values, positional };
}

function buildLookup(schema: Schema): NameLookup {
  const byLong = new Map<string, string>();
  const byAlias = new Map<string, string>();
  const booleanNoForms = new Map<string, string>();
  for (const name of Object.keys(schema)) {
    byLong.set(name, name);
    const spec = schema[name];
    if (spec.alias !== undefined) {
      byAlias.set(spec.alias, name);
    }
    if (spec.type === "boolean") {
      booleanNoForms.set(`no-${name}`, name);
    }
  }
  return { byLong, byAlias, booleanNoForms };
}

function createInitial<S extends Schema>(schema: S): InferValues<S> {
  const values = {} as Record<string, unknown>;
  for (const name of Object.keys(schema)) {
    const spec = schema[name];
    if (spec.type === "string-array" || spec.type === "number-array") {
      values[name] = [];
    } else {
      values[name] = undefined;
    }
  }
  return values as InferValues<S>;
}

function handleLongOption(
  token: string,
  argv: readonly string[],
  index: number,
  schema: Schema,
  lookup: NameLookup,
  values: Record<string, unknown>,
  seen: Set<string>,
): number {
  const equals = token.indexOf("=");
  const head = equals === -1 ? token.slice(2) : token.slice(2, equals);
  const inline = equals === -1 ? undefined : token.slice(equals + 1);
  const negationTarget = lookup.booleanNoForms.get(head);
  if (negationTarget !== undefined) {
    if (inline !== undefined) {
      throw new ArgvError(
        "BAD_NEGATION",
        `boolean option "--${negationTarget}" does not accept "=value" via "--no-..." form`,
        negationTarget,
      );
    }
    assignBooleanFlag(negationTarget, false, values, seen);
    return index + 1;
  }
  const canonical = lookup.byLong.get(head);
  if (canonical === undefined) {
    throw new ArgvError(
      "UNKNOWN_OPTION",
      `unknown option "--${head}"`,
      head,
    );
  }
  const spec = schema[canonical];
  if (spec.type === "boolean") {
    if (inline !== undefined) {
      throw new ArgvError(
        "BAD_NEGATION",
        `boolean option "--${canonical}" does not accept "=value"; use --${canonical} or --no-${canonical}`,
        canonical,
      );
    }
    assignBooleanFlag(canonical, true, values, seen);
    return index + 1;
  }
  return consumeValue(canonical, spec, inline, argv, index, values, seen);
}

function handleShortOption(
  token: string,
  argv: readonly string[],
  index: number,
  schema: Schema,
  lookup: NameLookup,
  values: Record<string, unknown>,
  seen: Set<string>,
): number {
  const body = token.slice(1);
  const equals = body.indexOf("=");
  const flagPart = equals === -1 ? body : body.slice(0, equals);
  const inline = equals === -1 ? undefined : body.slice(equals + 1);

  if (flagPart.length > 1 && inline === undefined) {
    return handleClusteredFlags(flagPart, schema, lookup, values, seen, index);
  }

  const aliasName = flagPart;
  if (aliasName.length !== 1) {
    throw new ArgvError(
      "UNKNOWN_OPTION",
      `unexpected short option form "-${flagPart}="`,
      flagPart,
    );
  }
  const canonical = lookup.byAlias.get(aliasName);
  if (canonical === undefined) {
    throw new ArgvError(
      "UNKNOWN_OPTION",
      `unknown short option "-${aliasName}"`,
      aliasName,
    );
  }
  const spec = schema[canonical];
  if (spec.type === "boolean") {
    if (inline !== undefined) {
      throw new ArgvError(
        "BAD_NEGATION",
        `boolean option "-${aliasName}" does not accept "=value"`,
        canonical,
      );
    }
    assignBooleanFlag(canonical, true, values, seen);
    return index + 1;
  }
  return consumeValue(canonical, spec, inline, argv, index, values, seen);
}

function handleClusteredFlags(
  cluster: string,
  schema: Schema,
  lookup: NameLookup,
  values: Record<string, unknown>,
  seen: Set<string>,
  index: number,
): number {
  for (const character of cluster) {
    const canonical = lookup.byAlias.get(character);
    if (canonical === undefined) {
      throw new ArgvError(
        "UNKNOWN_OPTION",
        `unknown short option "-${character}" inside cluster "-${cluster}"`,
        character,
      );
    }
    const spec = schema[canonical];
    if (spec.type !== "boolean") {
      throw new ArgvError(
        "INVALID_TYPE",
        `option "-${character}" requires a value and cannot appear in a flag cluster`,
        canonical,
      );
    }
    assignBooleanFlag(canonical, true, values, seen);
  }
  return index + 1;
}

function consumeValue(
  name: string,
  spec: OptionSpec,
  inline: string | undefined,
  argv: readonly string[],
  index: number,
  values: Record<string, unknown>,
  seen: Set<string>,
): number {
  let raw: string;
  let advance: number;
  if (inline !== undefined) {
    raw = inline;
    advance = 1;
  } else {
    if (index + 1 >= argv.length) {
      throw new ArgvError(
        "MISSING_VALUE",
        `option "--${name}" requires a value`,
        name,
      );
    }
    raw = argv[index + 1];
    advance = 2;
  }
  assignTypedValue(name, spec, raw, values, seen);
  return index + advance;
}

function assignTypedValue(
  name: string,
  spec: OptionSpec,
  raw: string,
  values: Record<string, unknown>,
  seen: Set<string>,
): void {
  switch (spec.type) {
    case "string": {
      const value = coerceString(raw, name, spec.allowEmpty === true);
      checkChoices(value, spec.choices, name);
      assignScalar(name, value, values, seen);
      return;
    }
    case "number": {
      const value = coerceNumber(raw, name);
      checkChoices(value, spec.choices, name);
      assignScalar(name, value, values, seen);
      return;
    }
    case "integer": {
      const value = coerceInteger(raw, name);
      checkChoices(value, spec.choices, name);
      assignScalar(name, value, values, seen);
      return;
    }
    case "string-array": {
      const value = coerceString(raw, name, false);
      checkChoices(value, spec.choices, name);
      appendArray(name, value, values, seen);
      return;
    }
    case "number-array": {
      const value = coerceNumber(raw, name);
      checkChoices(value, spec.choices, name);
      appendArray(name, value, values, seen);
      return;
    }
  }
}

function assignBooleanFlag(
  name: string,
  value: boolean,
  values: Record<string, unknown>,
  seen: Set<string>,
): void {
  if (seen.has(name)) {
    throw new ArgvError(
      "DUPLICATE_OPTION",
      `boolean option "--${name}" was specified more than once`,
      name,
    );
  }
  values[name] = value;
  seen.add(name);
}

function assignScalar(
  name: string,
  value: unknown,
  values: Record<string, unknown>,
  seen: Set<string>,
): void {
  if (seen.has(name)) {
    throw new ArgvError(
      "DUPLICATE_OPTION",
      `scalar option "--${name}" was specified more than once`,
      name,
    );
  }
  values[name] = value;
  seen.add(name);
}

function appendArray(
  name: string,
  value: string | number,
  values: Record<string, unknown>,
  seen: Set<string>,
): void {
  const current = values[name] as Array<string | number>;
  current.push(value);
  seen.add(name);
}

function applyEnvAndDefaults(
  schema: Schema,
  values: Record<string, unknown>,
  seen: Set<string>,
  env: Readonly<Record<string, string | undefined>>,
): void {
  for (const name of Object.keys(schema)) {
    if (seen.has(name)) {
      continue;
    }
    const spec = schema[name];
    if (spec.env !== undefined) {
      const raw = env[spec.env];
      if (raw !== undefined && raw !== "") {
        applyEnvValue(name, spec, raw, values);
        seen.add(name);
        continue;
      }
    }
    if (spec.default !== undefined && !seen.has(name)) {
      if (spec.type === "string-array" || spec.type === "number-array") {
        values[name] = [...(spec.default as readonly unknown[])];
      } else {
        values[name] = spec.default;
      }
    }
  }
}

function applyEnvValue(
  name: string,
  spec: OptionSpec,
  raw: string,
  values: Record<string, unknown>,
): void {
  if (spec.type === "boolean") {
    if (raw === "1" || raw.toLowerCase() === "true") {
      values[name] = true;
      return;
    }
    if (raw === "0" || raw.toLowerCase() === "false") {
      values[name] = false;
      return;
    }
    throw new ArgvError(
      "INVALID_VALUE",
      `env "${spec.env}" for boolean "--${name}" must be 0/1/true/false, got "${raw}"`,
      name,
    );
  }
  if (spec.type === "string-array" || spec.type === "number-array") {
    const parts = raw.split(",").map((part) => part.trim());
    const collected: Array<string | number> = [];
    for (const part of parts) {
      if (spec.type === "number-array") {
        const value = coerceNumber(part, name);
        checkChoices(value, spec.choices, name);
        collected.push(value);
      } else {
        const value = coerceString(part, name, false);
        checkChoices(value, spec.choices, name);
        collected.push(value);
      }
    }
    values[name] = collected;
    return;
  }
  assignTypedValueFromEnv(name, spec, raw, values);
}

function assignTypedValueFromEnv(
  name: string,
  spec: OptionSpec,
  raw: string,
  values: Record<string, unknown>,
): void {
  switch (spec.type) {
    case "string": {
      const value = coerceString(raw, name, spec.allowEmpty === true);
      checkChoices(value, spec.choices, name);
      values[name] = value;
      return;
    }
    case "number": {
      const value = coerceNumber(raw, name);
      checkChoices(value, spec.choices, name);
      values[name] = value;
      return;
    }
    case "integer": {
      const value = coerceInteger(raw, name);
      checkChoices(value, spec.choices, name);
      values[name] = value;
      return;
    }
  }
}

function enforceRequired(
  schema: Schema,
  values: Record<string, unknown>,
  seen: Set<string>,
): void {
  for (const name of Object.keys(schema)) {
    const spec = schema[name];
    if (!spec.required) {
      continue;
    }
    if (seen.has(name)) {
      continue;
    }
    if (spec.type === "string-array" || spec.type === "number-array") {
      const current = values[name];
      if (Array.isArray(current) && current.length > 0) {
        continue;
      }
    } else if (values[name] !== undefined) {
      continue;
    }
    throw new ArgvError(
      "REQUIRED_MISSING",
      `required option "--${name}" was not provided`,
      name,
    );
  }
}

function runValidators(
  schema: Schema,
  values: Record<string, unknown>,
): void {
  for (const name of Object.keys(schema)) {
    const spec = schema[name];
    if (spec.validate === undefined) {
      continue;
    }
    const value = values[name];
    if (value === undefined) {
      continue;
    }
    const result = (spec.validate as (v: unknown) => true | string)(value);
    if (result !== true) {
      throw new ArgvError(
        "VALIDATION_FAILED",
        `option "--${name}" failed validation: ${result}`,
        name,
      );
    }
  }
}
