import { Node, mergeAttributes } from "@tiptap/core";

/**
 * Custom block-level `pageBreak` node. Visually renders as a styled
 * separator that ends the current "page" sheet and starts the next one;
 * in DOCX/PDF export, translates into an actual page break.
 *
 * Inserted automatically by the template helpers (between major sections)
 * and manually via the toolbar's "Page break" button.
 */
declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    pageBreak: {
      insertPageBreak: () => ReturnType;
    };
  }
}

export const PageBreakNode = Node.create({
  name: "pageBreak",
  group: "block",
  atom: true,
  selectable: true,
  draggable: false,

  parseHTML() {
    return [{ tag: "div[data-page-break]" }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, {
        "data-page-break": "",
        class: "page-break",
        contenteditable: "false",
      }),
      ["div", { class: "page-break-rule" }],
      ["span", { class: "page-break-label" }, "— Page break —"],
    ];
  },

  addCommands() {
    return {
      insertPageBreak:
        () =>
        ({ commands }) =>
          commands.insertContent({ type: this.name }),
    };
  },

  addKeyboardShortcuts() {
    return {
      "Mod-Enter": () => this.editor.commands.insertPageBreak(),
    };
  },
});
