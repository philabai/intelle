import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  pdf,
} from "@react-pdf/renderer";

import {
  sanitiseBodyDoc,
  type PMLike,
} from "@/lib/regwatch/templates/sanitise-body-doc";

const styles = StyleSheet.create({
  page: {
    paddingTop: 72,
    paddingBottom: 72,
    paddingHorizontal: 72,
    fontSize: 11,
    fontFamily: "Helvetica",
    color: "#1a1a1a",
    lineHeight: 1.5,
  },
  title: { fontSize: 22, fontFamily: "Helvetica-Bold", marginBottom: 16 },
  h1: { fontSize: 18, fontFamily: "Helvetica-Bold", marginTop: 14, marginBottom: 8 },
  h2: { fontSize: 14, fontFamily: "Helvetica-Bold", marginTop: 12, marginBottom: 6 },
  h3: { fontSize: 12, fontFamily: "Helvetica-Bold", marginTop: 10, marginBottom: 4 },
  paragraph: { marginBottom: 6 },
  italic: { fontStyle: "italic", color: "#555555" },
  bullet: { flexDirection: "row", marginLeft: 12, marginBottom: 4 },
  bulletGlyph: { width: 12 },
  table: {
    marginVertical: 8,
    borderStyle: "solid",
    borderColor: "#cccccc",
    borderWidth: 0.5,
  },
  tableRow: { flexDirection: "row" },
  tableCell: {
    flex: 1,
    padding: 6,
    borderStyle: "solid",
    borderColor: "#cccccc",
    borderRightWidth: 0.5,
    borderBottomWidth: 0.5,
  },
  tableCellLastRow: { borderBottomWidth: 0 },
  tableCellLastCol: { borderRightWidth: 0 },
  tableHeaderCell: { fontFamily: "Helvetica-Bold", backgroundColor: "#f0f0f0" },
  hr: {
    borderBottomWidth: 0.5,
    borderBottomColor: "#bbbbbb",
    borderStyle: "solid",
    marginVertical: 8,
  },
});

interface PageBucket {
  blocks: React.ReactNode[];
}

/**
 * ProseMirror JSON → PDF via @react-pdf/renderer.
 *
 * Page breaks: we split the doc's top-level content array on every
 * `pageBreak` node, then emit one <Page> per bucket. This mirrors the
 * DOCX export (where the page break is a real W:br type=page) and the
 * editor's visual page-break renderer.
 */
export async function bodyDocToPdfBuffer(
  bodyDoc: unknown,
  meta: { title: string },
): Promise<Buffer> {
  const root = sanitiseBodyDoc(bodyDoc) as PMLike | null;
  const buckets = splitOnPageBreaks(root, meta.title);
  const docElement = (
    <Document title={meta.title} creator="intelle.io RegWatch">
      {buckets.map((bucket, idx) => (
        <Page key={idx} size="LETTER" style={styles.page} wrap>
          {bucket.blocks}
        </Page>
      ))}
    </Document>
  );
  const instance = pdf(docElement);
  const blob = await instance.toBlob();
  const arrayBuffer = await blob.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

function splitOnPageBreaks(root: PMLike | null, title: string): PageBucket[] {
  const buckets: PageBucket[] = [];
  let current: PageBucket = {
    blocks: [<Text key="__title" style={styles.title}>{title}</Text>],
  };
  if (!root || !Array.isArray(root.content)) {
    return [current];
  }
  let keyCounter = 0;
  for (const block of root.content as PMLike[]) {
    if (block.type === "pageBreak") {
      buckets.push(current);
      current = { blocks: [] };
      continue;
    }
    const node = renderBlock(block, keyCounter++);
    if (node) current.blocks.push(node);
  }
  buckets.push(current);
  return buckets;
}

function renderBlock(block: PMLike, key: number): React.ReactNode | null {
  switch (block.type) {
    case "heading":
      return renderHeading(block, key);
    case "paragraph":
      return (
        <Text key={key} style={styles.paragraph}>
          {renderInline(block.content as PMLike[] | undefined)}
        </Text>
      );
    case "bulletList":
      return renderList(block, key, false);
    case "orderedList":
      return renderList(block, key, true);
    case "table":
      return renderTable(block, key);
    case "horizontalRule":
      return <View key={key} style={styles.hr} />;
    case "blockquote":
      return (
        <View key={key} style={{ marginLeft: 16, marginVertical: 6 }}>
          {((block.content as PMLike[] | undefined) ?? []).map((c, i) =>
            renderBlock(c, i),
          )}
        </View>
      );
    default:
      return null;
  }
}

function renderHeading(block: PMLike, key: number): React.ReactNode {
  const level = (block.attrs?.level as number | undefined) ?? 1;
  const style = level === 1 ? styles.h1 : level === 2 ? styles.h2 : styles.h3;
  return (
    <Text key={key} style={style}>
      {renderInline(block.content as PMLike[] | undefined)}
    </Text>
  );
}

function renderInline(content: PMLike[] | undefined): React.ReactNode[] {
  if (!content) return [];
  return content
    .filter((c) => c.type === "text" && typeof c.text === "string")
    .map((c, i) => {
      const marks = (c.marks as PMLike[] | undefined) ?? [];
      const isBold = marks.some((m) => m.type === "bold");
      const isItalic = marks.some((m) => m.type === "italic");
      const isUnderline = marks.some((m) => m.type === "underline");
      const style: Record<string, string | number> = {};
      if (isBold) style.fontFamily = "Helvetica-Bold";
      if (isItalic) {
        style.fontFamily =
          style.fontFamily === "Helvetica-Bold" ? "Helvetica-BoldOblique" : "Helvetica-Oblique";
      }
      if (isUnderline) style.textDecoration = "underline";
      if (isItalic && !isBold) style.color = "#555555";
      return (
        <Text key={i} style={style as Record<string, string | number>}>
          {c.text}
        </Text>
      );
    });
}

function renderList(
  block: PMLike,
  key: number,
  ordered: boolean,
): React.ReactNode {
  const items = (block.content as PMLike[] | undefined) ?? [];
  return (
    <View key={key}>
      {items.map((item, idx) => {
        const inner =
          ((item.content as PMLike[] | undefined) ?? []).filter(
            (n) => n.type === "paragraph",
          ) ?? [];
        const glyph = ordered ? `${idx + 1}.` : "•";
        return (
          <View key={idx} style={styles.bullet}>
            <Text style={styles.bulletGlyph}>{glyph}</Text>
            <Text style={{ flex: 1 }}>
              {inner.flatMap((p, j) => [
                ...renderInline(p.content as PMLike[] | undefined),
                j < inner.length - 1 ? "\n" : null,
              ])}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

function renderTable(block: PMLike, key: number): React.ReactNode {
  const rows = (block.content as PMLike[] | undefined) ?? [];
  return (
    <View key={key} style={styles.table}>
      {rows.map((r, ri) => {
        const cells = (r.content as PMLike[] | undefined) ?? [];
        const isLastRow = ri === rows.length - 1;
        return (
          <View key={ri} style={styles.tableRow}>
            {cells.map((c, ci) => {
              const isLastCol = ci === cells.length - 1;
              const isHeader = c.type === "tableHeader";
              const cellStyle = [
                styles.tableCell,
                isLastRow ? styles.tableCellLastRow : null,
                isLastCol ? styles.tableCellLastCol : null,
                isHeader ? styles.tableHeaderCell : null,
              ].filter(Boolean) as Record<string, unknown>[];
              const inner = (c.content as PMLike[] | undefined) ?? [];
              return (
                <View key={ci} style={cellStyle as never}>
                  {inner.map((node, ni) => renderBlock(node, ni))}
                </View>
              );
            })}
          </View>
        );
      })}
    </View>
  );
}
