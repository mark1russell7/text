/**
 * The committed list of the differences between the copies of `cut-copies.json` and `truncate`.
 *
 * The call `truncate(subject, copy.max, { mark: copy.mark })` replaces each copy. The subject is the text, or the JSON
 * form of the text for a copy with the call `json`. A copy that is not in this list gives the output of the home on
 * each text of the test. A copy in this list gives `to(home)` on each subject where `when(subject, copy)` is true. The
 * test also finds at least one text where the copy and the home give different output, so no entry is out of date.
 */
import { graphemeEnds } from "./strings.ts";

/** The fields of a copy that a relation reads. */
export interface CutCall {
  /** The most code units in the output of the copy, and the `max` of the home call. */
  readonly max: number;
  /** The mark of the copy and of the home call. */
  readonly mark: string;
}

/** One difference: its reason, and the relation between the output of the copy and the output of the home. */
export interface CutDifference {
  /** The ids of the copies (`repo/path:line`) that have this difference. */
  readonly copies: readonly string[];
  /** The difference and its reason, in plain words. */
  readonly reason: string;
  /** The output of the copy, from the output of the home. The default is the same output. */
  readonly to?: (home: string) => string;
  /** The subjects where the relation holds. The default is all subjects. */
  readonly when?: (subject: string, copy: CutCall) => boolean;
}

/** The text fits, or the copy cuts it at a grapheme boundary. Then the home cuts at the same index. */
const fitsOrCutsAtGrapheme = (subject: string, { max, mark }: CutCall): boolean =>
  subject.length <= max || graphemeEnds(subject).has(max - mark.length);

export const cutDifferences: readonly CutDifference[] = [
  {
    copies: [
      "client/packages/client/src/procedures/envelope.ts:185",
      "client/packages/client/src/procedures/narrowing.ts:108",
      "client/packages/compiler/src/print.ts:8",
      "coeval/packages/core/src/conform.ts:944",
      "coeval/packages/core/src/types.ts:1238",
      "coeval/packages/site/src/lib/conformance.ts:179",
      "highways/packages/site/src/atlas.ts:30",
      "market/packages/market-sources/src/parse.ts:78",
      "release-train/packages/site/src/main.ts:232",
      "render/packages/splay/src/ops.ts:41",
      "splay-react/site/src/OutputTree.tsx:8",
    ],
    reason:
      "The copy cuts at a code unit, so it can cut a surrogate pair, a flag, an emoji sequence or a letter and its combining mark. The home cuts at the grapheme boundary before that index. When the index is a grapheme boundary, the outputs are the same.",
    when: fitsOrCutsAtGrapheme,
  },
  {
    copies: [
      "client/packages/claude-cli/src/events.ts:128",
      "client/packages/http/src/exchange.ts:371",
      "crawler/packages/polite-crawler/src/cli-line.ts:1264",
      "crawler/packages/polite-crawler/src/sitemaps.ts:117",
      "rigor/packages/statistics/src/response-parse.ts:27",
    ],
    reason:
      "The copy cuts each text longer than its limit, and keeps the limit before the mark. Thus its output has up to the limit and the mark, and the home call has that length as max. A text a little longer than the limit fits in max, so the home gives it back, but the copy cuts it. The copy also cuts at a code unit, not at a grapheme boundary.",
    when: (subject, { max, mark }) =>
      subject.length <= max - mark.length || (subject.length > max && graphemeEnds(subject).has(max - mark.length)),
  },
  {
    copies: ["rigor/packages/bench/src/gate-line.ts:89"],
    reason:
      "The copy keeps each surrogate pair whole, but it can cut a flag, an emoji sequence or a letter and its combining mark. The home cuts at the grapheme boundary before that index. When the index is a grapheme boundary, the outputs are the same.",
    when: fitsOrCutsAtGrapheme,
  },
  {
    copies: ["crawler/packages/polite-crawler/src/pdf.ts:183"],
    reason:
      "The copy has no mark, and it keeps each surrogate pair whole. It also removes the white space at the end of its output, also when the text fits. The home gives back a text that fits as it is, and it cuts at a grapheme boundary.",
    to: (home) => home.trimEnd(),
    when: fitsOrCutsAtGrapheme,
  },
];
