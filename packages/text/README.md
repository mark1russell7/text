# @mark1russell7/text

Plain text helpers in seven groups: the escapes of a text for five targets, the English word forms and a word search. The other four groups are the text of a thrown value, the removal of secrets, lengths with cuts and padding, and marked parts.

```sh
pnpm add @mark1russell7/text
```

| Function | Target | Changes |
| --- | --- | --- |
| `escapeHtml` | The content of an HTML element | `&`, `<` and `>`, to `&amp;`, `&lt;` and `&gt;` |
| `escapeAttribute` | An HTML attribute value in double or single quotes | `&`, `<`, `>`, `"` and `'`, to `&amp;`, `&lt;`, `&gt;`, `&quot;` and `&#39;` |
| `escapeRegExp` | A pattern of `new RegExp`, outside a character class | A backslash before each syntax character: `^ $ \ . * + ? ( ) [ ] { } \|` |
| `escapeMarkdown` | One line of CommonMark or GitHub Markdown | A backslash before each ASCII punctuation character, and a space for each line end |
| `escapeWorkflowData` | The data of a GitHub Actions workflow command | `%`, CR and LF, to `%25`, `%0D` and `%0A` |
| `escapeWorkflowProperty` | A property value of a workflow command | The characters of `escapeWorkflowData`, and `:` and `,` to `%3A` and `%2C` |

```ts
import { escapeAttribute, escapeHtml, escapeMarkdown, escapeRegExp, escapeWorkflowData, escapeWorkflowProperty } from "@mark1russell7/text";

escapeHtml("a < b & c"); // "a &lt; b &amp; c"
escapeAttribute(`say "hi"`); // "say &quot;hi&quot;"
new RegExp(`^${escapeRegExp("1+1=2?")}$`, "u").test("1+1=2?"); // true
console.log(`::warning title=${escapeWorkflowProperty("a: b")}::${escapeWorkflowData("50%
next")}`); // "::warning title=a%3A b::50%25%0Anext"
escapeMarkdown("a | b *c*"); // "a \\| b \\*c\\*"
```

## English word forms

`countOf(count, noun, plural?)` gives a count with a noun. Only the count 1 takes the singular noun. The default plural noun is the singular noun with "s" at the end.

```ts
import { countOf } from "@mark1russell7/text";

countOf(1, "site"); // "1 site"
countOf(1024, "site"); // "1,024 sites"
countOf(3, "match", "matches"); // "3 matches"
```

## A word search

`wordSearch(query)` gives a test of a text. A text agrees when it has each word of the search, in any order and in any case. A word can be a part of a longer word.

`searchKey(text)` gives the form that the test compares. It applies NFKC, then the lower case, the upper case and the lower case again. Then it changes the final sigma "ς" to "σ". It uses no rules of a locale.

```ts
import { searchKey, wordSearch } from "@mark1russell7/text";

wordSearch("news WORLD")("World News Today"); // true
wordSearch("strasse")("Hauptstraße 1"); // true
wordSearch("istanbul")("İSTANBUL"); // false: "İ" keeps its dot as U+0307
searchKey("ﬁle"); // "file"
```

## The order of texts

The two orders are the same in each locale and in each copy of a program. The name of each function tells its unit.

- `compareCodeUnits(a, b)` compares the UTF-16 code units. The operator `<`, the default sort and canonical JSON (RFC 8785) use this order.
- `compareCodePoints(a, b)` compares the Unicode code points. A surrogate pair is one code point above U+FFFF.

The two orders are different only for a code point above U+FFFF against a code unit from U+E000 to U+FFFF.

```ts
import { compareCodePoints, compareCodeUnits } from "@mark1russell7/text";

["b", "a"].sort(compareCodeUnits); // ["a", "b"]
compareCodeUnits("😀", "～"); // -1: the high surrogate U+D83D is below U+FF5E
compareCodePoints("😀", "～"); // 1: U+1F600 is above U+FF5E
```

## The text of a thrown value

`errorMessage(error)` gives the text of a thrown value, for a log line or a message on a screen. It does not throw.

```ts
import { errorMessage } from "@mark1russell7/text";

errorMessage(new Error("boom")); // "boom"
errorMessage("timeout"); // "timeout"
errorMessage(Object.create(null)); // "[object Object]"
```

| Value | Text |
| --- | --- |
| An object with a `message` text, also an `Error` from a `vm` context or an `iframe` | The message |
| An `Error` of any realm with a `message` that is not a text | `String(message)` |
| Each other value | `String(value)` |
| A value that makes `String` throw | The tag of `Object.prototype.toString`, for example `[object Object]` |
| A revoked `Proxy` | `[object]` |

## The removal of secrets

`redactSecrets(text, secrets, options?)` puts a mark in place of each secret in a text. Use it on an error message or a log line before it goes out. The function is in the entry `@mark1russell7/text/redact`, so the root entry stays small.

A secret goes into a text in more than one form. The function removes each of these forms:

| Form | Example of the secret `k/y!` | Where it goes |
| --- | --- | --- |
| The raw form | `k/y!` | A header, a body, a message |
| The form of `encodeURIComponent` | `k%2Fy!` | The path or the query of a URL |
| The form of `URLSearchParams` | `k%2Fy%21` | A query, or the body of an HTML form |
| The Base64 form of `user:password` | `dXNlcjprL3kh` | The value of an `Authorization: Basic` header |

A `Secret` is a string, or a pair `{ user, password }` for HTTP Basic. For a pair, the function removes the password and the Base64 form of the pair. The user stays, because a user name is not a secret. `RedactOptions` has `mark`, the text in place of each secret. The default mark is `[secret]`.

```ts
import { redactSecrets, type RedactOptions, type Secret } from "@mark1russell7/text/redact";

const secrets: Secret[] = ["k/y!", { user: "user", password: "k/y!" }];
redactSecrets("GET /v1/items?apiKey=k%2Fy!", secrets); // "GET /v1/items?apiKey=[secret]"
redactSecrets("Authorization: Basic dXNlcjprL3kh", secrets); // "Authorization: Basic [secret]"
const options: RedactOptions = { mark: "***" };
redactSecrets("token=k/y!", secrets, options); // "token=***"
```

The function examines the text one time. At each position, it removes the longest form that agrees, so a secret in a secret gives one mark. It ignores an empty secret.

### The shapes of tokens

`redactSecrets` needs the secret. A text can also hold a token that you do not know, for example the output of a command in the answer to a form. `findSecretShapes(text, shapes?)` finds the tokens of known services by their shape. Use it to refuse a text before you write it or send it. Each match gives the name of its shape and its span. It does not give the token.

| Shape | What it is |
| --- | --- |
| `github-fine-grained` | `github_pat_` and 82 or more characters |
| `github-classic`, `github-oauth`, `github-app-user`, `github-app-installation`, `github-app-refresh` | `ghp_`, `gho_`, `ghu_`, `ghs_` or `ghr_`, and 36 or more letters and digits |
| `npm` | `npm_` and 36 or more letters and digits |
| `anthropic` | `sk-ant-` and 32 or more characters |
| `aws-access-key` | `AKIA` or `ASIA`, and 16 capital letters and digits |
| `slack` | `xoxb-`, `xoxp-` and the other `xox` prefixes, and 10 or more characters |
| `bearer` | `Bearer` and a value of 20 or more characters, as in an `Authorization` header |
| `private-key` | A `PRIVATE KEY` block, to its end line or to the end of the text |

`SECRET_SHAPES` is the catalog. Each `SecretShape` has `id`, `label` and `pattern`. To find more shapes, give your own list. `redactSecretShapes(text, options?)` puts a mark in place of each match. Matches that overlap give one mark. `RedactShapeOptions` has `mark` and `shapes`.

`findSecretShapesInValue(value, shapes?)` examines each string of a value, for example the body of a JSON document. Each match also gives `path`, the keys and indexes to its string, and `inKey`. Do not examine the JSON text. An escape, for example `\n`, puts a letter directly before a token at the start of a line. Then the token is not a match.

```ts
import { findSecretShapes, redactSecretShapes } from "@mark1russell7/text/redact";

const answer = "token: " + "ghp_" + "A1b2C3d4E5f6".repeat(3);
findSecretShapes(answer); // [{ shape: "github-classic", start: 7, end: 47 }]
redactSecretShapes(answer); // "token: [secret]"
findSecretShapes("the prefix ghp_ in a sentence"); // []
```

## Lengths, truncation and padding

The entry `@mark1russell7/text/length` has three functions. Each function counts in the unit that you give. The default unit is `code-unit`.

| Unit | One unit | Length of the family emoji 👨‍👩‍👧‍👦 | Length of `e` and U+0301 (é) |
| --- | --- | --- | --- |
| `code-unit` | One UTF-16 code unit, as in `String.prototype.length` | 11 | 2 |
| `code-point` | One Unicode code point. A surrogate pair is one unit | 7 | 2 |
| `grapheme` | One extended grapheme cluster of `Intl.Segmenter` (UAX #29) | 1 | 1 |

- `textLength(text, unit?)` gives the length of a text in a unit.
- `truncate(text, max, options?)` cuts a text to `max` units or fewer, with a mark at the end. The default mark is "…".
- `pad(text, width, options?)` adds a fill at the start, at the end or at the two sides, to `width` units or fewer.

```ts
import { pad, textLength, truncate } from "@mark1russell7/text/length";

textLength("🇯🇵 ok", "grapheme"); // 4
truncate("Water main break on Elm Road", 12); // "Water main …"
truncate(title, 250, { unit: "code-point" }); // 250 code points or fewer, with "…" at the end
truncate("ab🇯🇵cd", 5); // "ab…": the cut does not break the flag
truncate("ab🇯🇵cd", 5, { boundary: "code-point" }); // "ab🇯…"
truncate("hello", 2, { mark: "..." }); // "he": the mark is longer than max, so the result has no mark
pad("7", 3, { side: "start", fill: "0" }); // "007"
pad("ab", 7, { fill: "-=" }); // "ab-=-=-"
pad("ab", 5, { fill: "😀" }); // "ab😀": the emoji has two code units, so one half does not go in
```

`truncate` obeys these rules:

- A text with `max` units or fewer comes back as it is, with no mark.
- The cut keeps each grapheme whole by default. With `boundary: "code-point"`, the cut keeps only each surrogate pair whole. The unit `grapheme` always keeps each grapheme whole.
- The result has `max` units or fewer, with the mark. A grapheme that does not fit goes out, so the result can be shorter than `max`.
- When the mark has more units than `max`, the result has no mark. It is the start of the text, with `max` units or fewer. Thus `truncate("hello", 0)` gives "".
- A `max` that is not an integer of 0 or more gives a `RangeError`. A unit or a boundary that is not in its type also gives a `RangeError`.

`pad` obeys these rules:

- A text with `width` units or more comes back as it is. The function does not cut a text.
- The fill goes again and again from its start, as in `padStart` and `padEnd`. The last copy can be a part of the fill.
- That part keeps each grapheme whole by default. Thus the result can be shorter than `width`.
- The side `both` puts the half of the fill at the start and the other half at the end. For an odd count, the end gets one more unit.
- An empty fill, a bad side and a `width` that is not an integer of 0 or more give a `RangeError`.

## Marked parts

The entry `@mark1russell7/text/parts` divides a text into parts. A part with `hit` is in a range or is a copy of a search. A page puts a `mark` element on each part with `hit`.

- `partsAt(text, ranges)` gives the parts at ranges of UTF-16 code units, `[start, end)`. It sorts the ranges, joins the ranges that overlap and clamps each range to the text.
- `partsOf(text, find)` gives the parts at each copy of `find`, from the start, with no overlap. The comparison is exact.

```ts
import { partsAt, partsOf } from "@mark1russell7/text/parts";

partsOf("one cat, two cats", "cat");
// [{ text: "one ", hit: false }, { text: "cat", hit: true }, { text: ", two ", hit: false }, { text: "cat", hit: true }, { text: "s", hit: false }]
partsAt("A wide river", [[2, 6]]);
// [{ text: "A ", hit: false }, { text: "wide", hit: true }, { text: " river", hit: false }]
```

The parts obey these rules:

- The texts of the parts, in their order, make the text again. No part is empty.
- Two ranges that touch stay two parts. Two ranges that overlap become one part.
- An empty range, an empty `find` and an empty text give no part with `hit`.

## The copies that this package replaces

The tests run 58 copies of these functions from other repositories of the owner. Each copy comes from a list of the duplication atlas, at a pinned commit. The file `test/copies.json` has each copy, and `test/differences.ts` has each difference from the function of this package, with its reason. A copy that is not in the list gives the same output on each of the 1000 test strings.

The tests also examine 18 copies of a cut with a mark, from a later list of the atlas. The file `test/cut-copies.json` has each copy and the call of `truncate` that replaces it. The file `test/cut-differences.ts` has each difference, with its reason. Most copies cut at a code unit, so they can break a surrogate pair or a grapheme. The atlas has no copy of a padding function. The repositories call `padStart` and `padEnd` directly.

## Limits

- `escapeHtml` does not escape quotes. For an attribute value, use `escapeAttribute`.
- `escapeRegExp` gives a pattern for use outside a character class. In a class, `-` also has a meaning.
- `escapeMarkdown` does not change spaces. Four spaces at the start of a line make a code block.
- `wordSearch` keeps accents, so "cafe" does not find "café".
- `countOf` knows no irregular plural. Give the plural noun for each noun that does not add "s".
- `errorMessage` gives only the message. It does not add the name of the error, its `cause` or its stack.
- `redactSecrets` removes only the forms in its table. A secret in a JSON string with escapes, or in a different encoding, stays.
- `findSecretShapes` knows only the shapes in its table. A token directly after a letter or a digit is not a match. A token of a service that is not in the table stays.
- `textLength`, `truncate` and `pad` count graphemes with the `Intl.Segmenter` of the runtime. An old runtime can count a new emoji as more than one grapheme.
- In `pad`, a grapheme of the fill can join the text or the next copy of the fill. A combining mark and a lone regional indicator do this. Then the result has fewer graphemes than the width.
- `partsAt` counts in code units, as `String.prototype.slice` does. A range can cut a surrogate pair or a grapheme.
- The three functions count units, not the width on a screen. A wide character, for example 日, is one unit, as a narrow character is.
