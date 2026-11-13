# @mark1russell7/text

Plain text helpers in four groups. The groups are the escapes of a text for five targets, the English word forms, a word search and the removal of secrets.

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

## The copies that this package replaces

The tests run 58 copies of these functions from other repositories of the owner. Each copy comes from a list of the duplication atlas, at a pinned commit. The file `test/copies.json` has each copy, and `test/differences.ts` has each difference from the function of this package, with its reason. A copy that is not in the list gives the same output on each of the 1000 test strings.

## Limits

- `escapeHtml` does not escape quotes. For an attribute value, use `escapeAttribute`.
- `escapeRegExp` gives a pattern for use outside a character class. In a class, `-` also has a meaning.
- `escapeMarkdown` does not change spaces. Four spaces at the start of a line make a code block.
- `wordSearch` keeps accents, so "cafe" does not find "café".
- `countOf` knows no irregular plural. Give the plural noun for each noun that does not add "s".
- `redactSecrets` removes only the forms in its table. A secret in a JSON string with escapes, or in a different encoding, stays.
