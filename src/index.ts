/**
 * argv-strict — strict typed argv parser for TypeScript.
 *
 * Public surface:
 *   - parse(argv, schema, options?) -> { values, positional }
 *   - defineSchema(schema) -> schema (identity helper for inference)
 *   - formatHelp(schema, options?) -> string
 *   - ArgvError (with .code and .optionName)
 *   - Schema, OptionSpec, OptionType, ParseOptions, ParseResult,
 *     InferValue, InferValues, HelpOptions, ArgvErrorCode
 */

export { ArgvError } from "./errors";
export type { ArgvErrorCode } from "./errors";
export { defineSchema } from "./schema";
export type {
  BaseOption,
  BooleanOption,
  IntegerOption,
  InferValue,
  InferValues,
  NumberArrayOption,
  NumberOption,
  OptionSpec,
  OptionType,
  Schema,
  StringArrayOption,
  StringOption,
} from "./schema";
export { parse } from "./parse";
export type { ParseOptions, ParseResult } from "./parse";
export { formatHelp } from "./help";
export type { HelpOptions } from "./help";
