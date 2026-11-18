# @mark1russell7/text

Plain text helpers in nine groups: the escapes of a text for five targets, the English word forms and a word search. The next three groups are the order of texts, the text of a thrown value and the removal of secrets. The last three are lengths with cuts and padding, marked parts and a scan of HTML.

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

`listOf(parts, options?)` joins the parts into an English list. A comma goes between the parts, and the conjunction goes before the last part. The option `conjunction` sets the word, and its default is "and". With the option `serialComma`, a comma also goes before the conjunction in a list of three parts or more.

The entry `@mark1russell7/text/english` has `listOf` and `countOf`. The root entry has only `countOf`, to keep its size.

```ts
import { listOf } from "@mark1russell7/text/english";

listOf([]); // ""
listOf(["a", "b"]); // "a and b"
listOf(["a", "b", "c"]); // "a, b and c"
listOf(["a", "b", "c"], { conjunction: "or", serialComma: true }); // "a, b, or c"
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

### A ranked search

The entry `@mark1russell7/text/search` also ranks the documents of a corpus for a query with TF-IDF and the cosine similarity. Each function is pure and has no I/O.

- `searchWords(text, options)` gives the search keys of the words of a text (Unicode Standard Annex 29). The options remove stop words, refuse words and change words.
- `inverseDocumentFrequency(documents, form)` gives the IDF of each term. The form `plain` is ln(N / df), so a term in each document has the weight 0. The form `smooth` is ln((N + 1) / (df + 1)) + 1.
- `termVector(words, idf)` gives the weights (1 + ln(tf)) × idf with a length of 1. `cosineSimilarity(a, b)` compares two vectors.
- `rankDocuments(corpus, query, form)` gives the score of each document, best first. A tie keeps the order of the corpus.
- `rankerOf(corpus, form)` computes the IDF and the vectors of a corpus one time. It gives a function of a query with the same scores as `rankDocuments`.

```ts
import { rankDocuments, searchWords } from "@mark1russell7/text/search";

const corpus = ["The release gate", "The topic graph of the site", "A graph page"].map((text) => searchWords(text));
rankDocuments(corpus, searchWords("topic graph")); // [{ index: 1, … }, { index: 2, … }, { index: 0, score: 0 }]
```

## The order of texts

The entry `@mark1russell7/text/order` has two orders of texts. Each order is the same in each locale and in each copy of a program. The name of each function tells its unit.

- `compareCodeUnits(a, b)` compares the UTF-16 code units. The operator `<`, the default sort and canonical JSON (RFC 8785) use this order.
- `compareCodePoints(a, b)` compares the Unicode code points. A surrogate pair is one code point above U+FFFF.

The two orders are different only in one case. At the first code point that is different, one text has a code point above U+FFFF. The other text has a lone surrogate or a code unit from U+E000 to U+FFFF at that place.

```ts
import { compareCodePoints, compareCodeUnits } from "@mark1russell7/text/order";

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

### The shapes of a secret by its context

A password or a key of a service that is not in the table has no shape. Its context can still tell that it is a secret. The context is the name of a parameter, a flag, a field or a header, or the user part of a URL. `CONTEXT_SHAPES` has these shapes. A match is the value only, so the name stays. Use these shapes with `SECRET_SHAPES` on a log line or a command line. Do not use them to refuse a text, because they can match a text with no secret, for example `token: none`.

| Shape | What it finds |
| --- | --- |
| `secret-parameter` | The value after a name of a secret and `=` or `:`, for example `?access_token=v`, `GITHUB_TOKEN=v`, `"apiKey": "v"` and `X-Api-Key: v` |
| `secret-flag` | The value after a flag with a name of a secret and a space, for example `--password v`. A value that starts with `-`, `<`, `>` or `\|` is not a match |
| `url-password` | The password in `scheme://user:password@host` |
| `authorization` | The credential of an `Authorization` or `Proxy-Authorization` header, after its scheme |
| `user-password` | The password of `user:password` after the curl flag `-u`, `--user` or `--proxy-user` |

A name of a secret ends in one of these words, with no case: `token`, `secret`, `password`, `passwd`, `passphrase`, `credential`, `credentials`, `signature`, `sig` or `auth`. It can also end in `pwd` with one character before it. Or it can end in `key` after `api`, `access`, `secret`, `private`, `signing`, `encryption`, `master`, `license`, `ssh` or `client`. `key` alone is also a name. `isSecretName(name)` tells if a name agrees with this rule, for example the key of a field of a document.

A shape of your own can give the span of a part of its match: give the part a group with the name `secret`.

```ts
import { CONTEXT_SHAPES, isSecretName, redactSecretShapes, SECRET_SHAPES } from "@mark1russell7/text/redact";

const shapes = [...SECRET_SHAPES, ...CONTEXT_SHAPES];
redactSecretShapes("PGPASSWORD=hunter2 psql --token abc123", { shapes }); // "PGPASSWORD=[secret] psql --token [secret]"
redactSecretShapes("git clone https://user:p%40ss@example.com/r.git", { shapes }); // "git clone https://user:[secret]@example.com/r.git"
isSecretName("client_secret"); // true
isSecretName("PWD"); // false
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

## A scan of HTML

The entry `@mark1russell7/text/html` scans HTML for its text and its start tags, with no DOM. A check of a page uses it, for example for the text that a reader with no script gets, or for a `link` with `rel="icon"`.

- `scanHtml(html, options)` gives `text` and `elements`. Each element has its name in lower case, its attributes and the index of its `<`.
- The content of each element of `skip` gives no text and no element. The default `HTML_SKIP` is `script`, `style` and `template`.
- A comment, a tag, a doctype and a processing instruction each give one space, so two words in two elements stay two words.
- The content of a title or a text area is text with no tags.
- The scan is linear in the length of the HTML.

```ts
import { scanHtml } from "@mark1russell7/text/html";

const { text, elements } = scanHtml('<h1>Title</h1><script>draw()</script><link rel="icon" href="/favicon.svg">');
text.replace(/\s+/g, " ").trim(); // "Title"
elements.some((element) => element.name === "link" && element.attributes["rel"] === "icon"); // true

// The text of the body for a reader with no script:
scanHtml("<html><head><title>T</title></head><body><noscript>On</noscript>Body</body></html>", { skip: ["head", "script", "style", "template", "noscript"] }).text; // "    Body  "
```

## The copies that this package replaces

The tests run 58 copies of these functions from other repositories of the owner. Each copy comes from a list of the duplication atlas, at a pinned commit. The file `test/copies.json` has each copy, and `test/differences.ts` has each difference from the function of this package, with its reason. A copy that is not in the list gives the same output on each of the 1000 test strings.

The tests also examine 18 copies of a cut with a mark, from a later list of the atlas. The file `test/cut-copies.json` has each copy and the call of `truncate` that replaces it. The file `test/cut-differences.ts` has each difference, with its reason. Most copies cut at a code unit, so they can break a surrogate pair or a grapheme. The atlas has no copy of a padding function. The repositories call `padStart` and `padEnd` directly.

## Limits

- `escapeHtml` does not escape quotes. For an attribute value, use `escapeAttribute`.
- `escapeRegExp` gives a pattern for use outside a character class. In a class, `-` also has a meaning.
- `escapeMarkdown` does not change spaces. Four spaces at the start of a line make a code block.
- `wordSearch` keeps accents, so "cafe" does not find "café".
- `countOf` knows no irregular plural. Give the plural noun for each noun that does not add "s".
- `listOf` does not change the parts. A part with a comma makes a list that a reader cannot split again.
- `errorMessage` gives only the message. It does not add the name of the error, its `cause` or its stack.
- `redactSecrets` removes only the forms in its table. A secret in a JSON string with escapes, or in a different encoding, stays.
- `findSecretShapes` knows only the shapes in its table. A token directly after a letter or a digit is not a match. A token of a service that is not in the table stays.
- `CONTEXT_SHAPES` needs the name of a secret before the value. A value with a name that is not in the rule stays, and so does a quoted value that holds its own quote. A value with no quotes ends at a space, a quote, `&` or `#`.
- `textLength`, `truncate` and `pad` count graphemes with the `Intl.Segmenter` of the runtime. An old runtime can count a new emoji as more than one grapheme.
- In `pad`, a grapheme of the fill can join the text or the next copy of the fill. A combining mark and a lone regional indicator do this. Then the result has fewer graphemes than the width.
- `partsAt` counts in code units, as `String.prototype.slice` does. A range can cut a surrogate pair or a grapheme.
- The three functions count units, not the width on a screen. A wide character, for example 日, is one unit, as a narrow character is.
- `scanHtml` does not make a tree. It does not close an element with no end tag, and it does not move an element as a browser does.
- `scanHtml` keeps the character references of the text and of each attribute value. Thus `&amp;` stays as five characters.
- In `scanHtml`, a comment or a skipped element with no end is text. A browser hides the rest of the page in that case.
- In `scanHtml`, a tag in a word also gives a space. Thus `a<b>c</b>` gives the text `a c `.
