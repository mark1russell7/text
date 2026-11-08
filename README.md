# text

Plain text helpers for TypeScript, in one package: [`@mark1russell7/text`](packages/text/README.md).

The first group is the escapes for HTML, attributes, regular expressions and Markdown. The next groups are case conversion, padding and truncation, templates and English word forms. `docs/ROADMAP.md` has the plan.

| Folder | Package | Contents |
| --- | --- | --- |
| `packages/text` | `@mark1russell7/text` | The helpers |
| `packages/site` | (private) | The site, with a demo of the escapes |

## Checks

```sh
pnpm install
pnpm typecheck
pnpm test
pnpm lint:ste
pnpm check:conventions
```
