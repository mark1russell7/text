# Changelog of @mark1russell7/text

## 0.0.10

PATCH: new exports before 1.0. The new entry `@mark1russell7/text/html` has `scanHtml`, its types and `HTML_SKIP`.

- `scanHtml` scans HTML for its text and its start tags in one linear pass, with no DOM. Each start tag gives its name and its attributes.
- The content of each element of the option `skip` gives no text and no element. The default is `script`, `style` and `template`.
- The content of a script, a style, a title or a text area has no tags.
- The scan comes from `noScriptText` of `@mark1russell7/site-pages`. After this version is on npm, site-pages keeps only its floor of text, and its check of the icon link uses the same scan.
- A test holds the entry `./html` at 1100 bytes or fewer, a limit predicted before its first measure. The root entry does not change.

Runtime dependencies: no change against `0.0.9` (none).

## 0.0.9

PATCH: new exports before 1.0. The new entry `@mark1russell7/text/order` has two orders of texts: `compareCodeUnits` and `compareCodePoints`.

- `compareCodeUnits` compares the UTF-16 code units, as the operator `<` and the default sort do.
- `compareCodePoints` compares the Unicode code points. A surrogate pair is one code point, and a lone surrogate is its own code point.
- The two orders are different only in one case. At the first code point that is different, one text has a code point above U+FFFF. The other text has a lone surrogate or a code unit from U+E000 to U+FFFF.
- A test compares `compareCodePoints` with a reference order for each two texts of 3 code units or fewer, with each pair and each lone surrogate. The same test holds the rule of the case where the two orders are different.
- The six copies of the order of the code units in `mark1russell7/alerts` move to `compareCodeUnits` after this version is on npm.
- The orders are in their own entry, so the root entry does not change. With the orders, the root entry had 867 bytes after `esbuild` and `gzip` at level 9, above its limit of 700 bytes. A test holds the entry `./order` at 400 bytes or fewer.

Runtime dependencies: no change against `0.0.8` (none).

## 0.0.8

PATCH: new exports before 1.0. The entry `@mark1russell7/text/redact` finds the tokens of known services by their shape.

- `findSecretShapes` finds each token of a known shape in a text: GitHub, npm, Anthropic, AWS, Slack, Bearer values and private key blocks. Each match gives the name of its shape and its span, not the token.
- `redactSecretShapes` puts a mark in place of each match.
- `findSecretShapesInValue` examines each string of a value, for example a JSON document, and gives the path to each match.
- `SECRET_SHAPES` is the catalog. Each function also takes its own list of shapes.
- The entry `./redact` is 1692 bytes after `esbuild` and `gzip` at level 9, and a test holds it at 1900 bytes or fewer. The root entry does not change.

Runtime dependencies: no change against `0.0.7` (none).

## 0.0.7

PATCH: a new export before 1.0. The new entry `@mark1russell7/text/parts` has `partsAt` and `partsOf`, and their type `TextPart`.

- `partsAt` divides a text into parts at ranges of code units. It sorts the ranges, joins the ranges that overlap and clamps each range to the text.
- `partsOf` divides a text into parts at each copy of a text, from the start, with no overlap.
- The two functions come from `@mark1russell7/site-pages`, which drops its copies in a later version.
- The entry `./parts` is 326 bytes after `esbuild` and `gzip` at level 9, and a test holds it at 450 bytes or fewer. The root entry does not change.

Runtime dependencies: no change against `0.0.6` (none).

## 0.0.6

PATCH: a new export before 1.0. The new entry `@mark1russell7/text/length` has `textLength`, `truncate` and `pad`, and their types `TextUnit`, `TextBoundary`, `TruncateOptions` and `PadOptions`.

- Each function counts in UTF-16 code units, in code points or in graphemes. The graphemes come from `Intl.Segmenter`.
- `truncate` cuts a text to `max` units or fewer, with the mark "…" at the end. The cut keeps each grapheme whole by default, and it never splits a surrogate pair.
- `pad` adds a fill at the start, at the end or at the two sides, to a width. It does not add a part of a grapheme of the fill.
- The 18 copies of a cut in the atlas list are test fixtures. `test/cut-differences.ts` gives each difference and its reason.
- The entry `./length` is 721 bytes after `esbuild` and `gzip` at level 9, and a test holds it at 850 bytes or fewer. The root entry does not change.

Runtime dependencies: no change against `0.0.5` (none).

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
