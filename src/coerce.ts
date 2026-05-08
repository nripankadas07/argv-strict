/**
 * Strict scalar coercers for argv-strict.
 *
 * Booleans are deliberately NOT coerced from strings — they are only ever
 * set by the presence of `--flag` (true) or `--no-flag` (false). The
 * coercers in this module handle the typed value parsers for everything
 * else (numbers, integers, strings, and the per-element parsers for
 * arrays).
 */

import { ArgvError } from "./errors";

const FINITE_NUMBER = /^-?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?$/;
const STRICT_INTEGER = /^-?\d+$/;

export function coerceString(
  raw: string,
  optionName: string,
  allowEmpty: boolean,
): string {
  if (raw === "" && !allowEmpty) {
    throw new ArgvError(
      "INVALID_VALUE",
      `option "--${optionName}" rejects the empty string`,
      optionName,
    );
  }
  return raw;
}

export function coerceNumber(raw: string, optionName: string): number {
  if (!FINITE_NUMBER.test(raw)) {
    throw new ArgvError(
      "INVALID_VALUE",
      `option "--${optionName}" expected a finite number, got "${raw}"`,
      optionName,
    );
  }
  const value = Number(raw);
  if (!Number.isFinite(value)) {
    throw new ArgvError(
      "INVALID_VALUE",
      `option "--${optionName}" expected a finite number, got "${raw}"`,
      optionName,
    );
  }
  return value;
}

export function coerceInteger(raw: string, optionName: string): number {
  if (!STRICT_INTEGER.test(raw)) {
    throw new ArgvError(
      "INVALID_VALUE",
      `option "--${optionName}" expected an integer, got "${raw}"`,
      optionName,
    );
  }
  const value = Number(raw);
  if (!Number.isSafeInteger(value)) {
    throw new ArgvError(
      "INVALID_VALUE",
      `option "--${optionName}" integer "${raw}" exceeds safe range`,
      optionName,
    );
  }
  return value;
}

export function checkChoices<T>(
  value: T,
  choices: readonly T[] | undefined,
  optionName: string,
): void {
  if (choices === undefined) {
    return;
  }
  if (!choices.includes(value)) {
    throw new ArgvError(
      "CHOICE_VIOLATION",
      `option "--${optionName}" must be one of ${formatChoices(choices)}, got ${formatValue(value)}`,
      optionName,
    );
  }
}

function formatChoices<T>(choices: readonly T[]): string {
  return choices.map(formatValue).join(", ");
}

function formatValue<T>(value: T): string {
  return typeof value === "string" ? `"${value}"` : String(value);
}
