/**
 * Error types for argv-strict.
 *
 * Every parse failure raises an `ArgvError`. The `code` field lets callers
 * map errors to messages or exit codes without parsing the message text.
 */

export type ArgvErrorCode =
  | "UNKNOWN_OPTION"
  | "MISSING_VALUE"
  | "INVALID_VALUE"
  | "INVALID_TYPE"
  | "DUPLICATE_OPTION"
  | "REQUIRED_MISSING"
  | "CHOICE_VIOLATION"
  | "BAD_NEGATION"
  | "VALIDATION_FAILED"
  | "BAD_SCHEMA";

export class ArgvError extends Error {
  public readonly code: ArgvErrorCode;
  public readonly optionName: string | undefined;

  constructor(code: ArgvErrorCode, message: string, optionName?: string) {
    super(message);
    this.name = "ArgvError";
    this.code = code;
    this.optionName = optionName;
    Object.setPrototypeOf(this, ArgvError.prototype);
  }
}
