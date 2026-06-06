import { Node, mergeAttributes } from "@tiptap/core";

/**
 * Inline `citedClause` node — renders as a clickable pill in the editor
 * and the read-only / PDF views, with attributes pinning the citation
 * to a specific regulation version. PR-6's supersession cron will flag
 * pills whose `pinnedVersion` no longer matches the regulation's latest
 * `last_changed_at`, surfacing them in the review panel's citation
 * review queue.
 *
 * Attributes:
 *   - regId         : UUID of regulatory_items row
 *   - clauseAnchor  : human anchor on the regulation side (e.g. "Article 6(2)")
 *   - pinnedVersion : regulation's last_changed_at at insertion time
 *   - displayText   : what shows inside the pill (citation + anchor)
 */
declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    citedClause: {
      insertCitedClause: (attrs: {
        regId: string;
        clauseAnchor: string;
        pinnedVersion: string | null;
        displayText: string;
      }) => ReturnType;
    };
  }
}

export const CitedClauseExtension = Node.create({
  name: "citedClause",
  group: "inline",
  inline: true,
  atom: true,
  selectable: true,
  draggable: false,

  addAttributes() {
    return {
      regId: { default: "" },
      clauseAnchor: { default: "" },
      pinnedVersion: { default: null as string | null },
      displayText: { default: "" },
    };
  },

  parseHTML() {
    return [{ tag: "span[data-cited-clause]" }];
  },

  renderHTML({ HTMLAttributes, node }) {
    const display =
      (node.attrs.displayText as string | undefined) ||
      (node.attrs.clauseAnchor as string | undefined) ||
      "Cited clause";
    return [
      "span",
      mergeAttributes(HTMLAttributes, {
        "data-cited-clause": "",
        "data-reg-id": node.attrs.regId,
        "data-clause-anchor": node.attrs.clauseAnchor,
        "data-pinned-version": node.attrs.pinnedVersion ?? "",
        class: "cited-clause",
        title: `Cited regulation clause — ${display}`,
      }),
      `🔗 ${display}`,
    ];
  },

  addCommands() {
    return {
      insertCitedClause:
        (attrs) =>
        ({ chain }) =>
          chain()
            .focus()
            .insertContent({ type: this.name, attrs })
            .insertContent(" ")
            .run(),
    };
  },
});
