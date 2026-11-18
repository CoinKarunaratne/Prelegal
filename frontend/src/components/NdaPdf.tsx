import { Document, Font, Link, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import type { Nodes, Root, RootContent } from "mdast";
import type { ReactNode } from "react";

/**
 * The completed Mutual NDA as a PDF document, rendered from the same filled-in
 * trees as the HTML preview. Loaded on demand, so @react-pdf/renderer is only
 * downloaded when the user asks for a PDF. Call `registerPdfFonts` first.
 */
export function NdaPdf({ coverPage, standardTerms }: { coverPage: Root; standardTerms: Root }) {
  return (
    <Document title="Mutual Non-Disclosure Agreement" author="Prelegal" creator="Prelegal">
      {[coverPage, standardTerms].map((tree, i) => (
        <Page key={i} size="LETTER" style={styles.page}>
          <View style={styles.body}>{renderChildren(tree, renderBlock)}</View>
          <Text
            fixed
            style={styles.footer}
            render={({ pageNumber, totalPages }) => `Mutual Non-Disclosure Agreement — page ${pageNumber} of ${totalPages}`}
          />
        </Page>
      ))}
    </Document>
  );
}

let fontsRegistered = false;

/**
 * Register the Noto fonts (Latin, Greek and Cyrillic). The PDF standard fonts
 * only cover Western European characters, so names like "Łukasz" would break.
 * `baseUrl` is "/fonts" in the browser, or a directory path in Node.
 */
export function registerPdfFonts(baseUrl: string) {
  if (fontsRegistered) return;
  fontsRegistered = true;
  Font.register({
    family: "Noto Serif",
    fonts: [
      { src: `${baseUrl}/NotoSerif-Regular.ttf` },
      { src: `${baseUrl}/NotoSerif-Bold.ttf`, fontWeight: "bold" },
      { src: `${baseUrl}/NotoSerif-Italic.ttf`, fontStyle: "italic" },
    ],
  });
  Font.register({
    family: "Noto Sans",
    fonts: [
      { src: `${baseUrl}/NotoSans-Regular.ttf` },
      { src: `${baseUrl}/NotoSans-Bold.ttf`, fontWeight: "bold" },
    ],
  });
  // Legal text should never be hyphenated; see `wrapLongWords` for long values.
  Font.registerHyphenationCallback((word) => [word]);
}

const BLANK = "________________";

/**
 * Wrap long unbroken user input (e.g. an email address in a narrow signature
 * table cell) onto several lines, preferably after ".", "@", "-", "_" or "/".
 * react-pdf would otherwise overflow the cell, or, if allowed to split words,
 * add hyphens that look like part of the address.
 */
function wrapLongWords(value: string, max = 26): string {
  return value.replace(new RegExp(`\\S{${max + 1},}`, "g"), (word) => {
    const lines: string[] = [];
    let rest = word;
    while (rest.length > max) {
      const cut = Math.max(...[".", "@", "-", "_", "/"].map((c) => rest.lastIndexOf(c, max - 1)));
      const at = cut > 0 ? cut + 1 : max;
      lines.push(rest.slice(0, at));
      rest = rest.slice(at);
    }
    return [...lines, rest].join("\n");
  });
}

function renderChildren(node: Nodes, render: (child: RootContent, key: number) => ReactNode): ReactNode {
  return "children" in node ? (node.children as RootContent[]).map(render) : null;
}

function renderBlock(node: RootContent, key: number): ReactNode {
  switch (node.type) {
    case "heading":
      return (
        <Text key={key} style={styles[`h${Math.min(node.depth, 3)}` as "h1" | "h2" | "h3"]} minPresenceAhead={40}>
          {renderChildren(node, renderInline)}
        </Text>
      );
    case "paragraph":
      return (
        <Text key={key} style={styles.paragraph}>
          {renderChildren(node, renderInline)}
        </Text>
      );
    case "list":
      return (
        <View key={key} style={styles.list}>
          {node.children.map((item, i) => (
            <View key={i} style={styles.listItem}>
              {typeof item.checked === "boolean" ? (
                <View style={styles.checkbox}>
                  <Text style={styles.checkmark}>{item.checked ? "X" : ""}</Text>
                </View>
              ) : (
                <Text style={styles.marker}>{node.ordered ? `${(node.start ?? 1) + i}.` : "•"}</Text>
              )}
              <View style={styles.listBody}>{renderChildren(item, renderBlock)}</View>
            </View>
          ))}
        </View>
      );
    case "table":
      return (
        <View key={key} style={styles.table} wrap={false}>
          {node.children.map((row, r) => (
            <View key={r} style={[styles.tableRow, r === 0 ? styles.tableHeadRow : undefined]}>
              {row.children.map((cell, c) => (
                <View key={c} style={[styles.tableCell, c === 0 ? styles.tableFirstCell : undefined]}>
                  <Text style={[styles.tableText, r === 0 || c === 0 ? styles.bold : undefined]}>
                    {renderChildren(cell, renderInline)}
                  </Text>
                </View>
              ))}
            </View>
          ))}
        </View>
      );
    case "thematicBreak":
      return <View key={key} style={styles.rule} />;
    default:
      return null;
  }
}

function renderInline(node: RootContent, key: number): ReactNode {
  switch (node.type) {
    case "text":
    case "inlineCode":
      return node.value;
    case "strong":
      return (
        <Text key={key} style={styles.bold}>
          {renderChildren(node, renderInline)}
        </Text>
      );
    case "emphasis":
      return (
        <Text key={key} style={styles.italic}>
          {renderChildren(node, renderInline)}
        </Text>
      );
    case "link":
      return (
        <Link key={key} src={node.url} style={styles.link}>
          {renderChildren(node, renderInline)}
        </Link>
      );
    case "tag":
      return (
        <Text key={key} style={node.variant === "hint" ? styles.hint : node.variant === "term" ? styles.bold : undefined}>
          {renderChildren(node, renderInline)}
        </Text>
      );
    case "field":
      return (
        <Text key={key} style={styles.bold}>
          {wrapLongWords(node.value) || BLANK}
        </Text>
      );
    case "break":
      return "\n";
    default:
      return null;
  }
}

const styles = StyleSheet.create({
  page: { paddingTop: 48, paddingBottom: 60, paddingHorizontal: 60 },
  // Typography lives here rather than on Page: a lineHeight on Page stops the
  // fixed footer from rendering at all.
  body: { fontFamily: "Noto Serif", fontSize: 9.5, lineHeight: 1.45, color: "#1c1917" },
  footer: {
    position: "absolute",
    bottom: 28,
    left: 60,
    right: 60,
    fontFamily: "Noto Sans",
    fontSize: 7.5,
    color: "#78716c",
    textAlign: "center",
  },
  h1: { fontWeight: "bold", fontSize: 16, textAlign: "center", marginBottom: 10 },
  h2: { fontWeight: "bold", fontSize: 10, letterSpacing: 0.5, marginBottom: 6 },
  h3: { fontWeight: "bold", fontSize: 10.5, marginTop: 8, marginBottom: 2 },
  paragraph: { marginBottom: 5 },
  bold: { fontWeight: "bold" },
  italic: { fontStyle: "italic" },
  link: { color: "#115e59", textDecoration: "none" },
  hint: { fontFamily: "Noto Sans", fontWeight: "normal", fontSize: 7.5, color: "#57534e" },
  list: { marginBottom: 4 },
  listItem: { flexDirection: "row" },
  marker: { width: 18 },
  listBody: { flex: 1 },
  checkbox: {
    width: 9,
    height: 9,
    borderWidth: 0.8,
    borderColor: "#1c1917",
    marginTop: 3,
    marginRight: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  checkmark: { fontFamily: "Noto Sans", fontWeight: "bold", fontSize: 7, lineHeight: 1 },
  table: { marginTop: 8, marginBottom: 10, borderTopWidth: 0.8, borderLeftWidth: 0.8, borderColor: "#a8a29e" },
  // Tall enough to sign by hand.
  tableRow: { flexDirection: "row", minHeight: 30 },
  tableHeadRow: { minHeight: 0, backgroundColor: "#f5f5f4" },
  tableCell: { flex: 1, padding: 5, borderRightWidth: 0.8, borderBottomWidth: 0.8, borderColor: "#a8a29e" },
  tableFirstCell: { flex: 0.8 },
  tableText: { fontSize: 9 },
  rule: { borderBottomWidth: 0.8, borderColor: "#a8a29e", marginVertical: 10 },
});
