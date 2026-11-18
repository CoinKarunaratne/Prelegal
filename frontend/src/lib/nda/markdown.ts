import type { Html, Nodes, Parent, PhrasingContent, Root, RootContent, Table } from "mdast";
import remarkGfm from "remark-gfm";
import remarkParse from "remark-parse";
import { unified } from "unified";

/**
 * An inline HTML element from the templates, e.g.
 * `<span class="coverpage_link">Purpose</span>` or `<label>hint</label>`.
 * remark leaves these as separate open/close `html` nodes; we group them and
 * record what they mean so renderers don't need to know the template's HTML.
 */
export interface TagNode extends Parent {
  type: "tag";
  /** `hint`: explanatory `<label>` text. `term`: a reference to a cover page term. */
  variant?: "hint" | "term";
  children: PhrasingContent[];
}

/** A value from the form, substituted for a `{{key}}` placeholder. */
export interface FieldNode {
  type: "field";
  /** Text to show; empty when the user has not filled the field in yet. */
  value: string;
  /** Shown in place of an empty value, e.g. "Governing Law". */
  label: string;
}

declare module "mdast" {
  interface PhrasingContentMap {
    tag: TagNode;
    field: FieldNode;
  }
  interface RootContentMap {
    tag: TagNode;
    field: FieldNode;
  }
}

const OPEN_TAG = /^<(span|label)(?:\s+[^>]*?)?>$/;
const CLASS_ATTR = /\bclass="([^"]*)"/;
const CLOSE_TAG = /^<\/(span|label)>$/;

/** Parse template markdown (GFM) into an mdast tree with grouped inline tags. */
export function parseMarkdown(markdown: string): Root {
  const tree = unified().use(remarkParse).use(remarkGfm).parse(markdown);
  return normalize(tree) as Root;
}

/**
 * Strip source positions (keeps the tree small when sent to the client), group
 * inline tags, and pad table rows to the header's width (some template rows
 * have fewer cells).
 */
function normalize(node: Nodes): Nodes {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { position, ...rest } = node as Nodes & { position?: unknown };
  if (!("children" in node)) return rest as Nodes;

  const children = groupTags((node.children as RootContent[]).map((c) => normalize(c) as RootContent));
  if (node.type === "table") {
    const rows = children as Table["children"];
    const width = rows[0]?.children.length ?? 0;
    for (const row of rows) {
      while (row.children.length < width) row.children.push({ type: "tableCell", children: [] });
    }
  }
  return { ...rest, children } as Nodes;
}

function groupTags(children: RootContent[]): RootContent[] {
  const root: RootContent[] = [];
  // Each open tag remembers the list it will be added to once it closes.
  const stack: { tag: string; node: TagNode; open: Html; parent: RootContent[] }[] = [];
  const current = () => (stack.length ? stack[stack.length - 1].node.children : root) as RootContent[];

  for (const child of children) {
    if (child.type === "html") {
      const open = child.value.match(OPEN_TAG);
      if (open) {
        const node: TagNode = { type: "tag", variant: tagVariant(open[1], child.value), children: [] };
        stack.push({ tag: open[1], node, open: child, parent: current() });
        continue;
      }
      const close = child.value.match(CLOSE_TAG);
      if (close && stack.length && stack[stack.length - 1].tag === close[1]) {
        const { node, parent } = stack.pop()!;
        parent.push(node);
        continue;
      }
    }
    current().push(child);
  }

  // Unclosed tags: keep their contents rather than dropping text.
  while (stack.length) {
    const { node, open, parent } = stack.pop()!;
    parent.push(open, ...(node.children as RootContent[]));
  }
  return root;
}

function tagVariant(tag: string, html: string): TagNode["variant"] {
  if (tag === "label") return "hint";
  if (html.match(CLASS_ATTR)?.[1] === "coverpage_link") return "term";
  return undefined;
}
