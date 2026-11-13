# Roadmap

This file is the plan of text. The Status page of the site reads it, and the tracker of the project mirrors it.

The scope goes by groups of purpose, in this order: the escapes, case conversion, padding and truncation, templates, and English word forms.

| ID | Item | Priority | Status | Summary |
| --- | --- | --- | --- | --- |
| X1 | The escapes | P1 | done | `@mark1russell7/text` 0.0.1 with `escapeHtml`, `escapeAttribute`, `escapeRegExp` and `escapeMarkdown`. The 53 copies of the atlas list are test fixtures, with each difference and its reason. The site has a demo. |
| X2 | The escapes of workflow commands | P2 | done | `@mark1russell7/text` 0.0.2 with `escapeWorkflowData` and `escapeWorkflowProperty`, for the text of a GitHub Actions workflow command. The 5 copies of the atlas list are test fixtures. |
| X3 | The PRs to the copies | P1 | in progress | A pull request to each repository with a copy replaces the copy with an import of `@mark1russell7/text`. 50 of the 58 copies give the output of a home function. The other 8 are other functions and stay. |
| X4 | Case conversion | P2 | next | Camel case, kebab case, snake case and title case, with the copies of the atlas as fixtures. |
| X5 | Padding and truncation | P2 | next | Padding and truncation by code points and by graphemes, with the copies of the atlas as fixtures. |
| X6 | Templates | P3 | next | The text templates of the copies of the atlas, with the copies as fixtures. |
| X7 | English word forms | P3 | in progress | `countOf` in 0.0.3 gives a count with a noun. Plural forms and lists with "and" are next, with the copies of the atlas as fixtures. |
| X8 | A word search | P3 | done | `wordSearch` and `searchKey` in 0.0.3. The search folds the case with no rules of a locale, and the tests pin the Unicode cases. |
| X9 | The removal of secrets | P2 | in progress | `redactSecrets` in 0.0.4, in the entry `@mark1russell7/text/redact`. It removes the raw, URL and HTTP Basic forms of each secret. The API clients of the market are its first users. |
