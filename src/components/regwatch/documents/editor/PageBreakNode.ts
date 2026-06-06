import { Node, mergeAttributes } from "@tiptap/core";
import { NodeSelection } from "@tiptap/pm/state";

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
        ({ chain, state }) => {
          const { selection } = state;
          // When a NodeSelection is active (user clicked an atom block like
          // an existing page-break), the default insertContent would replace
          // it — net-zero change. Jump past the selected node first and
          // insert [paragraph, pageBreak] so the new blank page lands AFTER.
          if (selection instanceof NodeSelection) {
            return chain()
              .setTextSelection(selection.to)
              .insertContent([
                { type: "paragraph" },
                { type: this.name },
              ])
              .run();
          }
          return chain().insertContent({ type: this.name }).run();
        },
    };
  },

  addKeyboardShortcuts() {
    return {
      "Mod-Enter": () => this.editor.commands.insertPageBreak(),
    };
  },
});
