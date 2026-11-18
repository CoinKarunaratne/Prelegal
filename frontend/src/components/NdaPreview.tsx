import type { Nodes, Root, RootContent } from "mdast";
import type { ReactNode } from "react";

/**
 * Renders a filled-in template tree as styled HTML for the live preview.
 * Template headings are shifted down one level (# → h2) so the page keeps a
 * single h1.
 */
export function NdaPreview({ coverPage, standardTerms }: { coverPage: Root; standardTerms: Root }) {
  return (
    <article className="nda-doc">
      <section>{renderChildren(coverPage)}</section>
      <hr className="my-10 border-dashed border-stone-300" aria-hidden />
      <section>{renderChildren(standardTerms)}</section>
    </article>
  );
}

function renderChildren(node: Nodes): ReactNode {
  return "children" in node ? (node.children as RootContent[]).map(renderNode) : null;
}

function renderNode(node: RootContent, key: number): ReactNode {
  switch (node.type) {
    case "heading": {
      const Tag = `h${Math.min(node.depth + 1, 5)}` as "h2" | "h3" | "h4" | "h5";
      return <Tag key={key}>{renderChildren(node)}</Tag>;
    }
    case "paragraph":
      return <p key={key}>{renderChildren(node)}</p>;
    case "list": {
      const List = node.ordered ? "ol" : "ul";
      return (
        <List
          key={key}
          start={node.ordered ? (node.start ?? undefined) : undefined}
          className={node.children.some((item) => typeof item.checked === "boolean") ? "task-list" : undefined}
        >
          {renderChildren(node)}
        </List>
      );
    }
    case "listItem":
      if (typeof node.checked !== "boolean") return <li key={key}>{renderChildren(node)}</li>;
      return (
        <li key={key} data-checked={node.checked}>
          <span className="checkbox" role="img" aria-label={node.checked ? "Selected" : "Not selected"}>
            {node.checked ? "✕" : ""}
          </span>
          <div>{renderChildren(node)}</div>
        </li>
      );
    case "table": {
      const [head, ...rows] = node.children;
      return (
        <div key={key} className="table-wrap">
          <table>
            <thead>
              <tr>
                {head?.children.map((cell, c) => (
                  <th key={c} scope="col">
                    {renderChildren(cell)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, r) => (
                <tr key={r}>
                  {row.children.map((cell, c) =>
                    c === 0 ? (
                      <th key={c} scope="row">
                        {renderChildren(cell)}
                      </th>
                    ) : (
                      <td key={c}>{renderChildren(cell)}</td>
                    ),
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }
    case "strong":
      return <strong key={key}>{renderChildren(node)}</strong>;
    case "emphasis":
      return <em key={key}>{renderChildren(node)}</em>;
    case "link":
      return (
        <a key={key} href={node.url} target="_blank" rel="noreferrer">
          {renderChildren(node)}
        </a>
      );
    case "tag":
      return (
        <span key={key} className={node.variant}>
          {renderChildren(node)}
        </span>
      );
    case "field":
      return (
        <mark key={key} className={node.value ? "field" : "field field-empty"}>
          {node.value || node.label}
        </mark>
      );
    case "text":
      return node.value;
    case "inlineCode":
      return <code key={key}>{node.value}</code>;
    case "break":
      return <br key={key} />;
    case "thematicBreak":
      return <hr key={key} />;
    default:
      // Raw HTML and anything else the templates don't use is skipped.
      return null;
  }
}
