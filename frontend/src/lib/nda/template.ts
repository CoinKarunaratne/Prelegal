import fs from "node:fs";
import path from "node:path";
import type { Root } from "mdast";
import { parseMarkdown } from "./markdown";

// The repository's `templates/` directory (the app runs from `frontend/`).
// Paths are literal so the bundler can see exactly which files are read.
const COVER_PAGE_PATH = path.join(process.cwd(), "..", "templates", "Mutual-NDA-Cover-Page.md");
const STANDARD_TERMS_PATH = path.join(process.cwd(), "..", "templates", "Mutual-NDA.md");

export interface NdaTemplate {
  coverPage: Root;
  standardTerms: Root;
}

/**
 * Exact snippets of Common Paper's Mutual NDA cover page (v1.0) and the
 * `{{placeholder}}` tokens that replace them. `{{check:x}}` at the start of a
 * task-list item marks a checkbox whose state comes from the form.
 *
 * Tokens are swapped for form values only after parsing, so nothing a user
 * types is ever interpreted as markdown.
 */
const COVER_PAGE_REPLACEMENTS: [find: string, replace: string][] = [
  [
    "[Evaluating whether to enter into a business relationship with the other party.]",
    "{{purpose}}",
  ],
  ["[Today’s date]", "{{effectiveDate}}"],
  [
    "- [x]     Expires [1 year(s)] from Effective Date.",
    "- [ ] {{check:mndaTermExpires}}Expires {{mndaTermYears}} from Effective Date.",
  ],
  [
    "- [ ]     Continues until terminated",
    "- [ ] {{check:mndaTermUntilTerminated}}Continues until terminated",
  ],
  [
    "- [x]     [1 year(s)] from Effective Date,",
    "- [ ] {{check:confidentialityFixed}}{{confidentialityYears}} from Effective Date,",
  ],
  ["- [ ]     In perpetuity.", "- [ ] {{check:confidentialityPerpetual}}In perpetuity."],
  ["[Fill in state]", "{{governingLaw}}"],
  [
    "[Fill in city or county and state, i.e. “courts located in New Castle, DE”]",
    "{{jurisdiction}}",
  ],
  ["List any modifications to the MNDA", "{{modifications}}"],
  ["| Print Name | |", "| Print Name | {{party1.name}} | {{party2.name}} |"],
  ["| Title | | |", "| Title | {{party1.title}} | {{party2.title}} |"],
  ["| Company | | |", "| Company | {{party1.company}} | {{party2.company}} |"],
  [
    "| Notice Address <label>Use either email or postal address</label> | | |",
    "| Notice Address <label>Use either email or postal address</label> | {{party1.noticeAddress}} | {{party2.noticeAddress}} |",
  ],
];

/** Replace the cover page's bracketed blanks with placeholder tokens. */
export function prepareCoverPage(markdown: string): string {
  return COVER_PAGE_REPLACEMENTS.reduce((md, [find, replace]) => {
    const count = md.split(find).length - 1;
    if (count !== 1) {
      throw new Error(
        `Mutual NDA cover page template has changed: expected "${find}" once, found it ${count} times.`,
      );
    }
    return md.replace(find, () => replace);
  }, markdown);
}

/** Read and parse the Mutual NDA templates. Runs at build time on the server. */
export function loadNdaTemplate(): NdaTemplate {
  return {
    coverPage: parseMarkdown(prepareCoverPage(fs.readFileSync(COVER_PAGE_PATH, "utf-8"))),
    standardTerms: parseMarkdown(fs.readFileSync(STANDARD_TERMS_PATH, "utf-8")),
  };
}
