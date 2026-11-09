# Roadmap

This file is the plan of text. The Status page of the site reads it, and the tracker of the project mirrors it.

The scope goes by groups of purpose, in this order: the escapes, case conversion, padding and truncation, templates, and English word forms.

| ID | Item | Priority | Status | Summary |
| --- | --- | --- | --- | --- |
| X1 | The escapes | P1 | done | `@mark1russell7/text` 0.0.1 with `escapeHtml`, `escapeAttribute`, `escapeRegExp` and `escapeMarkdown`. The 53 copies of the atlas list are test fixtures, with each difference and its reason. The site has a demo. |
| X2 | The escapes of workflow commands | P2 | in progress | `escapeWorkflowData` and `escapeWorkflowProperty`, for the text of a GitHub Actions workflow command. The 5 copies of the atlas list are test fixtures. The strategist decided on 2026-11-08 that they come here. |
| X3 | The PRs to the copies | P1 | next | A pull request to each repository with a copy replaces the copy with an import of `@mark1russell7/text`, after the release of 0.0.1. |
| X4 | Case conversion | P2 | next | Camel case, kebab case, snake case and title case, with the copies of the atlas as fixtures. |
| X5 | Padding and truncation | P2 | next | Padding and truncation by code points and by graphemes, with the copies of the atlas as fixtures. |
| X6 | Templates | P3 | next | The text templates of the copies of the atlas, with the copies as fixtures. |
| X7 | English word forms | P3 | next | Plural forms and lists with "and", with the copies of the atlas as fixtures. |
