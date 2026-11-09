import { byId, copyText, setupTheme } from "@mark1russell7/site-pages/chrome";
import { escapeAttribute, escapeHtml, escapeMarkdown, escapeRegExp, escapeWorkflowData, escapeWorkflowProperty } from "@mark1russell7/text";

setupTheme(byId<HTMLButtonElement>("theme"), "theme");

const copy = byId<HTMLButtonElement>("copy");
copy.addEventListener("click", () => {
  void copyText(copy, byId("install").textContent ?? "");
});

// The demo: each output shows the escape of the text in the box, at each change of the text.
const input = byId<HTMLTextAreaElement>("input");
const outputs = [
  [byId("out-html"), escapeHtml],
  [byId("out-attribute"), escapeAttribute],
  [byId("out-regexp"), escapeRegExp],
  [byId("out-markdown"), escapeMarkdown],
  [byId("out-workflow-data"), escapeWorkflowData],
  [byId("out-workflow-property"), escapeWorkflowProperty],
] as const;
const show = (): void => {
  for (const [output, escape] of outputs) output.textContent = escape(input.value);
};
input.addEventListener("input", show);
show();
