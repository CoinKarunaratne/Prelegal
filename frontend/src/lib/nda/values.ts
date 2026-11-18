export interface Party {
  company: string;
  name: string;
  title: string;
  /** Email or postal address for notices. */
  noticeAddress: string;
}

export interface NdaValues {
  purpose: string;
  /** ISO date (yyyy-mm-dd), or "" when not chosen yet. */
  effectiveDate: string;
  mndaTerm: { kind: "expires" | "untilTerminated"; years: number };
  confidentialityTerm: { kind: "years" | "perpetual"; years: number };
  governingLaw: string;
  jurisdiction: string;
  modifications: string;
  party1: Party;
  party2: Party;
}

const emptyParty: Party = { company: "", name: "", title: "", noticeAddress: "" };

/** Starting values; these match the defaults shown on Common Paper's cover page. */
export const defaultValues: NdaValues = {
  purpose: "Evaluating whether to enter into a business relationship with the other party.",
  effectiveDate: "",
  mndaTerm: { kind: "expires", years: 1 },
  confidentialityTerm: { kind: "years", years: 1 },
  governingLaw: "",
  jurisdiction: "",
  modifications: "",
  party1: emptyParty,
  party2: emptyParty,
};

/** Placeholder keys used in the prepared cover page, with the label shown when empty. */
export const FIELD_LABELS = {
  purpose: "Purpose",
  effectiveDate: "Effective Date",
  mndaTermYears: "number of years",
  confidentialityYears: "number of years",
  governingLaw: "Governing Law",
  jurisdiction: "Jurisdiction",
  modifications: "Modifications",
  "party1.company": "Company",
  "party1.name": "Name",
  "party1.title": "Title",
  "party1.noticeAddress": "Notice address",
  "party2.company": "Company",
  "party2.name": "Name",
  "party2.title": "Title",
  "party2.noticeAddress": "Notice address",
} as const;

export type FieldKey = keyof typeof FIELD_LABELS;

/** Checkbox keys used in the prepared cover page as `{{check:key}}`. */
export const CHECK_KEYS = [
  "mndaTermExpires",
  "mndaTermUntilTerminated",
  "confidentialityFixed",
  "confidentialityPerpetual",
] as const;

export type CheckKey = (typeof CHECK_KEYS)[number];

export interface ResolvedValues {
  fields: Record<FieldKey, string>;
  checks: Record<CheckKey, boolean>;
}

export function formatYears(years: number): string {
  if (!Number.isFinite(years) || years < 1) return "";
  return `${years} ${years === 1 ? "year" : "years"}`;
}

/** Formats an ISO date as e.g. "November 18, 2026" (timezone-independent). */
export function formatDate(isoDate: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate);
  if (!match) return "";
  const date = new Date(Date.UTC(+match[1], +match[2] - 1, +match[3]));
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
}

export function todayIso(now = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

/** Resolve the text for every placeholder and the state of every checkbox. */
export function resolveValues(values: NdaValues): ResolvedValues {
  const { party1, party2 } = values;
  return {
    fields: {
      purpose: values.purpose.trim(),
      effectiveDate: formatDate(values.effectiveDate),
      mndaTermYears: formatYears(values.mndaTerm.years),
      confidentialityYears: formatYears(values.confidentialityTerm.years),
      governingLaw: values.governingLaw.trim(),
      jurisdiction: values.jurisdiction.trim(),
      modifications: values.modifications.trim() || "None.",
      "party1.company": party1.company.trim(),
      "party1.name": party1.name.trim(),
      "party1.title": party1.title.trim(),
      "party1.noticeAddress": party1.noticeAddress.trim(),
      "party2.company": party2.company.trim(),
      "party2.name": party2.name.trim(),
      "party2.title": party2.title.trim(),
      "party2.noticeAddress": party2.noticeAddress.trim(),
    },
    checks: {
      mndaTermExpires: values.mndaTerm.kind === "expires",
      mndaTermUntilTerminated: values.mndaTerm.kind === "untilTerminated",
      confidentialityFixed: values.confidentialityTerm.kind === "years",
      confidentialityPerpetual: values.confidentialityTerm.kind === "perpetual",
    },
  };
}

/**
 * Characters the PDF fonts (Noto Serif/Sans: Latin, Greek, Cyrillic) cannot
 * draw, such as Chinese, Japanese, Arabic or emoji. Returns each one once.
 */
export function unsupportedPdfCharacters(values: NdaValues): string[] {
  const text = Object.values(resolveValues(values).fields).join("");
  return [...new Set([...text].filter((char) => !PDF_SUPPORTED_CHAR.test(char)))];
}

// Letters and combining marks of the scripts Noto covers, plus whitespace,
// ASCII/Latin-1 symbols, general punctuation (quotes, dashes) and currency.
const PDF_SUPPORTED_CHAR =
  /^[\p{Script=Latin}\p{Script=Greek}\p{Script=Cyrillic}\p{Script=Inherited}\s -ÿ -⁯₠-⃏]$/u;
