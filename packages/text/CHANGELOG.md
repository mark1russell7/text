# Changelog of @mark1russell7/text

## 0.0.21

An automated dependency update changes the shipped files, so this PATCH ships them.

## 0.0.20

PATCH: a new entry and a new export before 1.0. The new entry `@mark1russell7/text/plain-text` has `plainText`. The other entries do not change.

- `plainText(html)` gives the plain text of a part of HTML: `scanHtml`, then `decodeReferences`, with one space for each run of white space.
- `undefined`, and a text with no characters, give `undefined`.
- Three source adapters of alerts had a copy of it. They import it after this release.
- Each tag gives one space, as in `scanHtml`. Thus `<b>3</b>,` gives `3 ,`.
- The function has its own entry. In `./references` it bundled `scanHtml`: 9456 bytes, more than the 9000 bytes of that entry. Thus `./html` and `./references` do not change.

Runtime dependencies: no change against `0.0.19` (none).

## 0.0.19

PATCH: a new export before 1.0. The new entry `@mark1russell7/text/print` has `createPrinter`. The root entry does not change.

- `createPrinter({ out, err?, secrets? })` gives a printer of the output of a command-line tool: `line`, `table`, `status`, `warn`, `error` and `json`.
- The streams are parameters, so the entry imports no `node:` module, and a test gives a buffer.
- Before each write, the printer removes each known secret and each shape of a token.
- A table measures each cell in graphemes, and a line has no spaces at its end.
- The printer is for the output of a CLI. A diagnostic of a library or a service goes to a log record with its trace context, not to the printer.
- The limit of `./print` is 3800 bytes, predicted before its first measure.

Runtime dependencies: no change against `0.0.18` (none).

## 0.0.17

PATCH: a new export before 1.0. The new entry `@mark1russell7/text/shell` has `escapeShell`. The root entry does not change.

- `escapeShell(text)` gives one word that a POSIX shell reads as the text, with no expansion and no split into words.
- A text of safe characters only stays as it is. Each other text goes in single quotes, and each `'` becomes `'\''`. The empty text becomes `''`.
- A text with NUL gives a `RangeError`, because a shell word cannot hold NUL.
- On Linux, the tests start `sh -c` with `printf` and compare the words that the shell read, on 26 hard cases and 1000 seeded strings.
- The first version put `escapeShell` in the root entry. The root entry had 784 bytes in CI, more than its limit of 700 bytes. So `escapeShell` is in its own entry, `./shell`, with a limit of 250 bytes.
- The first user is a generator of setup scripts for servers.

Runtime dependencies: no change against `0.0.16` (none).

## 0.0.16

PATCH: a new export before 1.0. The new entry `@mark1russell7/text/references` has `decodeReferences`. The root entry and the entry `./html` do not change.

- `decodeReferences(text)` decodes the character references of HTML content, as the tokenizer of the HTML Living Standard does.
- The named references come from the table of the standard, with its 2231 names. The longest name wins, and the 106 legacy names are also correct with no semicolon.
- A decimal or hexadecimal reference gives its code point. The value 0, a surrogate and a value above `0x10FFFF` give U+FFFD, and `0x80` to `0x9F` give the characters of windows-1252.
- An ampersand with no reference stays as text. The function does not throw, and it is linear in the length of the text.
- The script `scripts/html-references.ts` makes the table module `src/html-references.ts` from `entities.json` of the standard (CC BY 4.0).
- The first prediction put the decoder in `./html`, with a limit of 9000 bytes. The entry had 9425 bytes in CI. So the decoder is in its own entry, `./references`, with a limit of 9000 bytes. The limit of `./html` stays at 1100 bytes.
- The first users are the alert sources with HTML descriptions in a feed. News feeds need the same function.

Runtime dependencies: no change against `0.0.15` (none).

## 0.0.15

PATCH: a new export before 1.0. The entry `@mark1russell7/text/search` has `rankerOf`.

- `rankerOf(corpus, form)` computes the IDF and the vector of each document one time. It gives a function `(query) => DocumentScore[]`.
- For each query, the ranker gives the same scores as `rankDocuments(corpus, query, form)`. A property test on 500 seeded corpora holds this.
- `rankDocuments` uses `rankerOf`, so the two functions share one path. Its results do not change.

## 0.0.14

PATCH: new exports before 1.0. The new entry `@mark1russell7/text/search` has a ranked search with TF-IDF. The root entry does not change.

- `searchWords(text, options)` gives the search keys of the words of a text. The options are stop words, a test of a word and a stem.
- `inverseDocumentFrequency(documents, form)` gives the IDF of each term, in the form `plain` (the default) or `smooth`.
- `termVector(words, idf)` and `cosineSimilarity(a, b)` give the TF-IDF vector of a text and the similarity of two vectors.
- `rankDocuments(corpus, query, form)` ranks the documents of a corpus for a query.
- Property tests on seeded corpora: the order of the documents does not change a weight or a score. A term in each document has the plain weight 0.

## 0.0.12

PATCH: new exports before 1.0. The entry `@mark1russell7/text/redact` finds a secret by its context.

- `CONTEXT_SHAPES` finds the value of a secret by the text around it: a parameter, a variable or a field with the name of a secret (`secret-parameter`), a flag (`secret-flag`), the password of a URL (`url-password`), an `Authorization` header (`authorization`) and the user option of curl (`user-password`). A match is the value only, so the name stays.
- `isSecretName(name)` tells if a name is the name of a secret, by the same rule.
- A shape can give the span of a part of its match, with a group with the name `secret`. The shapes of `SECRET_SHAPES` have no such group, so their matches do not change.
- The default shapes of `findSecretShapes` and `redactSecretShapes` do not change. A caller adds `CONTEXT_SHAPES` to its list.
- headroom redacts the command lines in its logs with these shapes after this version is on npm.
- The limit of the entry `./redact` is 2400 bytes, predicted before the code. The measure is 2275 bytes.

Runtime dependencies: no change against `0.0.11` (none).

## 0.0.11

PATCH: a new export before 1.0. The new entry `@mark1russell7/text/english` has `countOf` and the new `listOf`.

- `listOf(parts, options?)` joins the parts into an English list: "a", "a and b" or "a, b and c". No part gives an empty text.
- The option `conjunction` sets the word before the last part, and its default is "and". The option `serialComma` adds a comma before the conjunction in a list of three parts or more.
- The list join comes from `listText` of `@mark1russell7/site-pages`. After this version is on npm, site-pages uses `listOf`, `countOf` and `escapeAttribute` in place of its three copies.
- The root entry does not change, because it has 663 of its 700 bytes. A test holds the entry `./english` at 300 bytes or fewer, a limit predicted before its first measure.

Runtime dependencies: no change against `0.0.10` (none).

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
