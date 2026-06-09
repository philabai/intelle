import type { Demo } from "../runtime";

export const meta = {
  id: "author",
  title: "Authoring a Document",
  subtitle: "Draft and version a company SOP in-app",
  authed: true,
  file: "4-author",
};

async function opt(label: string, fn: () => Promise<void>) {
  try {
    await fn();
  } catch (e) {
    console.log(`  (skipped ${label}: ${(e as Error).message.split("\n")[0]})`);
  }
}

export async function run(demo: Demo) {
  await demo.goto("/regwatch/documents", "Author — your company's SOPs, policies and permits");
  await demo.wait(1200);
  await demo.caption("Organise documents into folders, by kind and owner", 2000);

  await opt("open-doc", async () => {
    await demo.click('a[href^="/regwatch/documents/"]:not([href$="/documents"])', "Open a document");
    await demo.wait(1400);
  });

  await opt("edit", async () => {
    await demo.click('a[href*="/edit"], button:has-text("Edit")', "Open the editor");
    await demo.wait(1600);
  });

  await opt("type-body", async () => {
    await demo.caption("A full rich-text editor — write directly in the app", 1600);
    await demo.click(".ProseMirror");
    await demo.page.locator(".ProseMirror").pressSequentially(
      "\n1. Purpose\nThis procedure defines pressure-relief testing for the Crude Distillation Unit.\n",
      { delay: 28 },
    );
    await demo.wait(1200);
  });

  await opt("version", async () => {
    await demo.caption("Save a version with release notes — full revision history", 1800);
    await demo.click('button:has-text("Save version"), button:has-text("Version")');
    await demo.wait(1400);
  });

  await demo.caption("Cite regulations, crosswalk clauses, and route for review", 2200);
}
