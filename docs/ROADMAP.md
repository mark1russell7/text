# Roadmap

This file is the plan of text. The Status page of the site reads it, and the tracker of the project mirrors it.

The scope goes by groups of purpose, in this order: the escapes, case conversion, padding and truncation, templates, and English word forms.

| ID | Item | Priority | Status | Summary |
| --- | --- | --- | --- | --- |
| X1 | The escapes | P1 | done | `@mark1russell7/text` 0.0.1 with `escapeHtml`, `escapeAttribute`, `escapeRegExp` and `escapeMarkdown`. The 53 copies of the atlas list are test fixtures, with each difference and its reason. The site has a demo. |
| X2 | The escapes of workflow commands | P2 | done | `@mark1russell7/text` 0.0.2 with `escapeWorkflowData` and `escapeWorkflowProperty`, for the text of a GitHub Actions workflow command. The 5 copies of the atlas list are test fixtures. |
| X3 | The PRs to the copies | P1 | in progress | A pull request to each repository with a copy replaces the copy with an import of `@mark1russell7/text`. 50 of the 58 copies give the output of a home function. The other 8 are other functions and stay. |
| X4 | Case conversion | P2 | next | Camel case, kebab case, snake case and title case, with the copies of the atlas as fixtures. |
| X5 | Padding and truncation | P2 | done | `textLength`, `truncate` and `pad` in 0.0.6, in the entry `@mark1russell7/text/length`. They count code units, code points or graphemes, and a cut keeps each grapheme whole. The 18 copies of a cut in the atlas are test fixtures. The atlas has no copy of a padding function. |
| X6 | Templates | P3 | next | The text templates of the copies of the atlas, with the copies as fixtures. |
| X7 | English word forms | P3 | in progress | `countOf` in 0.0.3 gives a count with a noun. Plural forms and lists with "and" are next, with the copies of the atlas as fixtures. |
| X8 | A word search | P3 | done | `wordSearch` and `searchKey` in 0.0.3. The search folds the case with no rules of a locale, and the tests pin the Unicode cases. |
| X9 | The removal of secrets | P2 | in progress | `redactSecrets` in 0.0.4, in the entry `@mark1russell7/text/redact`. It removes the raw, URL and HTTP Basic forms of each secret. The API clients of the market are its first users. |
| X10 | The text of a thrown value | P2 | done | `errorMessage` in 0.0.5 gives the message of an error, also from another realm, and does not throw. |
| X11 | The live demo site | P2 | done | The home page of the site runs seven demos of the package in the browser: the HTML parser reads each escape, a pattern finds the text, the runner reads a warning, cuts and padding by grapheme, a word search, the forms of a secret in a log and the text of each thrown value. |
| X12 | The decode of character references | P2 | done | `decodeReferences` in 0.0.16, in the entry `@mark1russell7/text/html`. It decodes the named and numeric references of HTML content as the standard does, with the 2231 names of its table. Feeds with HTML descriptions are its first users. |
