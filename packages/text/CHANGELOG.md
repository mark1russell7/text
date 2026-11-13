# Changelog of @mark1russell7/text

## 0.0.5

PATCH: a new export before 1.0. The root entry has `errorMessage`, the text of a thrown value.

- `errorMessage` gives the message of an error. It reads the field `message`, so an `Error` from another realm also gives its message.
- The function does not throw. A value that makes `String` throw gives the tag of `Object.prototype.toString`, and a revoked `Proxy` gives `[object]`.

Runtime dependencies: no change against `0.0.4` (none).

## 0.0.4

PATCH: a new export before 1.0. The new entry `@mark1russell7/text/redact` has `redactSecrets` and its types `Secret` and `RedactOptions`.

- `redactSecrets` puts a mark in place of each secret in a text: the raw form, the forms of `encodeURIComponent` and `URLSearchParams`, and the Base64 form of an HTTP Basic pair.
- The function is in its own entry, so the root entry stays at 531 bytes. The entry `./redact` is 705 bytes after `esbuild` and `gzip` at level 9, and a test holds it at 800 bytes or fewer.

Runtime dependencies: no change against `0.0.3` (none).

## 0.0.2

PATCH: new exports before 1.0. The escapes of a GitHub Actions workflow command: `escapeWorkflowData` and `escapeWorkflowProperty`.

- `escapeWorkflowData` changes `%`, CR and LF to `%25`, `%0D` and `%0A`. `escapeWorkflowProperty` also changes `:` and `,` to `%3A` and `%2C`.
- The 5 copies of the atlas list with these escapes are test fixtures. Each gives the output of its home function, with no difference.
- The root entry is 321 bytes after `esbuild` and `gzip` at level 9, in place of 250. The limit of the test stays at 700 bytes.

Runtime dependencies: no change against `0.0.1` (none). The new dev dependency `@vitest/coverage-v8` gives the coverage of the shared CI.

## 0.0.1

The first version. It has the escapes: `escapeHtml`, `escapeAttribute`, `escapeRegExp` and `escapeMarkdown`.

- The tests run 53 copies of these functions from other repositories as fixtures. `test/differences.ts` gives each difference and its reason.
- The root entry is 250 bytes after `esbuild` and `gzip` at level 9. A test holds it at 700 bytes or fewer.

Runtime dependencies: none.
