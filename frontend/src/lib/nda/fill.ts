import type { ListItem, Nodes, Root, RootContent, Text } from "mdast";
import {
  CHECK_KEYS,
  FIELD_LABELS,
  resolveValues,
  type CheckKey,
  type FieldKey,
  type NdaValues,
  type ResolvedValues,
} from "./values";

const TOKEN = /\{\{(check:)?([\w.]+)\}\}/g;

/**
 * Return a copy of a prepared template tree with every `{{placeholder}}`
 * replaced by a `field` node and every `{{check:x}}` task item ticked or not.
 * The input tree is not modified.
 */
export function fillTemplate(tree: Root, values: NdaValues): Root {
  return fillNode(tree, resolveValues(values)) as Root;
}

function fillNode(node: Nodes, resolved: ResolvedValues): Nodes {
  if (!("children" in node)) return node;

  const children = (node.children as RootContent[]).flatMap((child) =>
    child.type === "text" ? splitText(child, resolved) : [fillNode(child, resolved) as RootContent],
  );

  const check = node.type === "listItem" ? findCheckKey(node) : undefined;
  if (check) return { ...node, checked: resolved.checks[check], children } as ListItem;
  return { ...node, children } as Nodes;
}

/** Split a text node around its placeholder tokens. Check tokens are removed. */
function splitText(node: Text, { fields }: ResolvedValues): RootContent[] {
  const out: RootContent[] = [];
  let last = 0;
  for (const match of node.value.matchAll(TOKEN)) {
    const [token, isCheck, key] = match;
    if (match.index > last) out.push({ type: "text", value: node.value.slice(last, match.index) });
    last = match.index + token.length;

    if (isCheck) {
      if (!CHECK_KEYS.includes(key as CheckKey)) throw new Error(`Unknown checkbox "${key}"`);
      continue;
    }
    if (!(key in FIELD_LABELS)) throw new Error(`Unknown placeholder "{{${key}}}"`);
    out.push({ type: "field", value: fields[key as FieldKey], label: FIELD_LABELS[key as FieldKey] });
  }
  if (last < node.value.length) out.push({ type: "text", value: node.value.slice(last) });
  return out;
}

function findCheckKey(item: ListItem): CheckKey | undefined {
  const first = item.children[0];
  if (first?.type !== "paragraph") return undefined;
  const text = first.children[0];
  if (text?.type !== "text") return undefined;
  return /^\{\{check:([\w.]+)\}\}/.exec(text.value)?.[1] as CheckKey | undefined;
}
