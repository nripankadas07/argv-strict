# argv-strict

Strict typed argv parser for TypeScript — every option is declared up
front in a typed schema, booleans are never coerced from strings, and
unknown flags are always errors.

`argv-strict` is the tighter sibling of [parseopts-ts](https://github.com/nripankadas07/parseopts-ts).
Same zero-dependency footprint, same `--key=value`/`--key value`/`-k v`/
clustered-flag handling, but the parser refuses to guess: `--debug=true`
is a hard error (use `--debug` or `--no-debug`), `--port abc` throws
`INVALID_VALUE`, and an unknown `--foo` always throws `UNKNOWN_OPTION`.

## Install

```bash
npm install argv-strict
```

Requires Node 18+ and TypeScript 5.x.
