import type { ListItem, Nodes, Root, Table } from "mdast";
import { describe, expect, it } from "vitest";
import { fillTemplate } from "./fill";
import { parseMarkdown, type FieldNode, type TagNode } from "./markdown";
import { loadNdaTemplate, prepareCoverPage } from "./template";
import { defaultValues, formatDate, formatYears, unsupportedPdfCharacters, type NdaValues } from "./values";

function collect<T extends Nodes>(tree: Nodes, type: T["type"]): T[] {
  const found: T[] = [];
  const walk = (node: Nodes) => {
    if (node.type === type) found.push(node as T);
    if ("children" in node) node.children.forEach((c) => walk(c as Nodes));
  };
  walk(tree);
  return found;
}

/** Plain text of a tree, with fields rendered as their value (or [label] when empty). */
function textOf(node: Nodes): string {
  if (node.type === "text") return node.value;
  if (node.type === "field") return node.value || `[${node.label}]`;
  if ("children" in node) return node.children.map((c) => textOf(c as Nodes)).join("");
  return "";
}

const values: NdaValues = {
  ...defaultValues,
  purpose: "Exploring a *joint* venture | [link](http://x)",
  effectiveDate: "2026-11-18",
  mndaTerm: { kind: "untilTerminated", years: 2 },
  confidentialityTerm: { kind: "years", years: 3 },
  governingLaw: "Delaware",
  jurisdiction: "courts located in New Castle, DE",
  party1: { company: "Acme Inc.", name: "Ada Lovelace", title: "CEO", noticeAddress: "ada@acme.test" },
  party2: { company: "Globex", name: "Hank Scorpio", title: "CTO", noticeAddress: "hank@globex.test" },
};

describe("loadNdaTemplate", () => {
  const template = loadNdaTemplate();

  it("parses the cover page and standard terms from templates/", () => {
    expect(textOf(template.coverPage)).toContain("Mutual Non-Disclosure Agreement");
    expect(textOf(template.standardTerms)).toContain("Standard Terms");
    expect(collect(template.standardTerms, "list")[0]).toMatchObject({ ordered: true });
  });

  it("groups coverpage_link spans in the standard terms into term tags", () => {
    const tags = collect<TagNode>(template.standardTerms, "tag");
    expect(tags).toHaveLength(10);
    expect(tags.every((t) => t.variant === "term")).toBe(true);
    expect(tags.map(textOf)).toContain("Governing Law");
    expect(collect(template.standardTerms, "html")).toHaveLength(0);
  });

  it("marks cover page labels as hints and pads short table rows", () => {
    const hints = collect<TagNode>(template.coverPage, "tag").filter((t) => t.variant === "hint");
    expect(hints.map(textOf)).toContain("How Confidential Information may be used");
    const [table] = collect<Table>(template.coverPage, "table");
    expect(table.children.every((row) => row.children.length === 3)).toBe(true);
  });

  it("strips source positions", () => {
    expect(JSON.stringify(template)).not.toContain('"position"');
  });
});

describe("prepareCoverPage", () => {
  it("throws if an expected snippet is missing", () => {
    expect(() => prepareCoverPage("# Something else")).toThrow(/template has changed/);
  });
});

describe("fillTemplate", () => {
  const { coverPage } = loadNdaTemplate();
  const filled = fillTemplate(coverPage, values);
  const text = textOf(filled);

  it("substitutes form values into the cover page", () => {
    expect(text).toContain("November 18, 2026");
    expect(text).toContain("Governing Law: Delaware");
    expect(text).toContain("3 years from Effective Date");
    expect(text).toContain("Ada Lovelace");
    expect(text).toContain("hank@globex.test");
    expect(text).toContain("None."); // empty modifications
    expect(text).not.toMatch(/\{\{|\[Fill in|\[Today/);
  });

  it("never interprets user input as markdown", () => {
    const purpose = collect<FieldNode>(filled, "field").find((f) => f.value.startsWith("Exploring"));
    expect(purpose?.value).toBe("Exploring a *joint* venture | [link](http://x)");
    expect(collect(filled, "emphasis")).toHaveLength(0);
  });

  it("ticks exactly the chosen options", () => {
    const tasks = collect<ListItem>(filled, "listItem").filter((i) => i.checked !== null && i.checked !== undefined);
    expect(tasks.map((t) => [textOf(t).slice(0, 20), t.checked])).toEqual([
      [`Expires 2 years from`, false],
      ["Continues until term", true],
      ["3 years from Effecti", true],
      ["In perpetuity.", false],
    ]);
  });

  it("shows labels for fields that are still empty", () => {
    const empty = textOf(fillTemplate(coverPage, defaultValues));
    expect(empty).toContain("Governing Law: [Governing Law]");
    expect(empty).toContain("[Effective Date]");
  });

  it("does not modify the template tree", () => {
    const before = JSON.stringify(coverPage);
    fillTemplate(coverPage, values);
    expect(JSON.stringify(coverPage)).toBe(before);
  });
});

describe("parseMarkdown", () => {
  it("keeps the contents of unclosed tags", () => {
    expect(textOf(parseMarkdown("before <span class='x'>after") as Root)).toBe("before after");
  });

  it("handles nested tags", () => {
    const tree = parseMarkdown('<span class="coverpage_link">x <label>y</label></span>');
    const [outer, inner] = collect<TagNode>(tree, "tag");
    expect([outer.variant, inner.variant]).toEqual(["term", "hint"]);
    expect(textOf(outer)).toBe("x y");
  });
});

describe("unsupportedPdfCharacters", () => {
  const withName = (name: string) => ({ ...defaultValues, party1: { ...defaultValues.party1, name } });

  it("accepts Latin, Greek and Cyrillic text with punctuation", () => {
    expect(unsupportedPdfCharacters(withName("Łukasz Żółć, Şeyma, Αθήνα, Москва — “O’Brien” €5 Nguyễn"))).toEqual([]);
  });

  it("reports characters the PDF fonts cannot draw, once each", () => {
    expect(unsupportedPdfCharacters(withName("東京 東 🙂 مرحبا"))).toEqual(["東", "京", "🙂", "م", "ر", "ح", "ب", "ا"]);
  });
});

describe("formatting", () => {
  it("formats years and dates", () => {
    expect(formatYears(1)).toBe("1 year");
    expect(formatYears(5)).toBe("5 years");
    expect(formatYears(0)).toBe("");
    expect(formatDate("2026-01-01")).toBe("January 1, 2026");
    expect(formatDate("")).toBe("");
  });
});
