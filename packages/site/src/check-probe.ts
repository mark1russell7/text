// The probe of the home page for `site-pages check`: it uses each demo as a visitor does, at each width of the check.
declare const check: (name: string, ok: boolean, detail?: unknown) => void;
declare const $: (selector: string) => HTMLElement | null;
declare const $$: (selector: string) => HTMLElement[];
declare const click: (element: Element | string | null) => void;
declare const type: (element: Element | string | null, text: string) => void;
declare const until: (fn: () => unknown, ms?: number) => Promise<boolean>;

/** This function gives the text of an element, or an empty text. */
const text = (selector: string): string => $(selector)?.textContent ?? "";
/** This function finds a button of a row by its text. */
const chip = (row: string, label: string): HTMLElement | null => $$(`#${row} button`).find((element) => element.textContent === label) ?? null;

click(chip("html-chips", "A quote"));
check(
  "a raw quote and escapeHtml add attributes, and escapeAttribute keeps the title",
  await until(() => $$("#html-result .sp-verdict.sp-fail").length === 2 && text("#html-result").includes("adds the attributes autofocus, onfocus")),
  text("#html-result"),
);
check("the six escapes show the text", text("#out-attribute").includes("&quot; autofocus"), text("#out-attribute"));

click(chip("find-chips", "1+1=2?"));
check("the raw pattern finds 11=2, and the escaped pattern finds the text", await until(() => text("#find-result").includes("It finds 1 match: 11=2") && text("#find-result").includes("each one is your text")), text("#find-result"));
click(chip("find-chips", "An open ("));
check("the raw pattern ( throws", await until(() => text("#find-result").includes("new RegExp throws")), text("#find-result"));

check("the raw warning has two lines and another property", text("#wf-result").includes("Other properties") && text("#wf-result").includes("The runner reads your text"), text("#wf-result"));

check("slice breaks the family emoji of the first text", text("#cut-result").includes("Broken"), text("#cut-result"));
click(chip("len-chips", "A family"));
check("the family emoji is one grapheme of 8 code units", await until(() => $$("#len-graphemes li")[0]?.textContent === "👩‍👩‍👧8"), text("#len-graphemes"));
click("[data-unit='grapheme']");
check("the unit grapheme counts the family as one", await until(() => text("#cut-result").includes('unit: "grapheme"')), text("#cut-result"));

click(chip("search-chips", "strasse"));
check("wordSearch finds Straße and STRASSE", await until(() => text("#search-words") === "(2 matches)" && text("#search-plain") === "(1 match)"), `${text("#search-words")} ${text("#search-plain")}`);

check("replaceAll leaves three forms of the secrets", text("#sec-result").includes("3 forms of the secrets"), text("#sec-result"));
type("#sec-token", "plain");
check("a new token makes a new log", await until(() => ($("#sec-log") as HTMLTextAreaElement | null)?.value.includes("key=plain") === true), ($("#sec-log") as HTMLTextAreaElement | null)?.value);

click(chip("thrown-chips", "A revoked Proxy"));
check("errorMessage reads a revoked Proxy, and String throws", await until(() => text("#thrown-result").includes('"[object]"') && text("#thrown-result").includes("String(value): throws")), text("#thrown-result"));
click(chip("thrown-chips", "An Error of another window"));
check("errorMessage reads an Error of another window", await until(() => text("#thrown-result").includes('gives "The disk is full."')), text("#thrown-result"));

export {};
