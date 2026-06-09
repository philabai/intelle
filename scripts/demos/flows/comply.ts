import type { Demo } from "../runtime";

export const meta = {
  id: "comply",
  title: "Managing Compliance",
  subtitle: "Footprint, asset hierarchy and obligations",
  authed: true,
  file: "3-comply",
};

async function opt(label: string, fn: () => Promise<void>) {
  try {
    await fn();
  } catch (e) {
    console.log(`  (skipped ${label}: ${(e as Error).message.split("\n")[0]})`);
  }
}

export async function run(demo: Demo) {
  await demo.goto("/regwatch/comply", "Comply — your compliance cockpit");
  await demo.wait(1200);

  await demo.goto("/regwatch/settings/footprint", "First, define your footprint");
  await demo.wait(1200);
  await demo.caption("Geographies, activities, substances and topics drive the scoring", 2200);
  await demo.scroll(300);

  await demo.goto("/regwatch/assets", "Model your operations as an asset hierarchy");
  await demo.wait(1200);
  await opt("expand-asset", async () => {
    await demo.click('button[aria-label="Expand"]', "Site → Unit → Equipment Class → Equipment");
    await demo.wait(900);
  });
  await opt("expand-asset-2", async () => {
    await demo.click('button[aria-label="Expand"] >> nth=1', "Expand down to a specific asset");
    await demo.wait(900);
  });

  await demo.goto("/regwatch/obligations", "Obligations pin a regulation to an asset");
  await demo.wait(1200);
  await demo.caption("Each obligation carries a severity, status and reviewer", 2000);
  await opt("open-obligation", async () => {
    await demo.click('a[href^="/regwatch/obligations/"]:not([href$="/obligations"])', "Open an obligation to manage it");
    await demo.wait(1600);
    await demo.scroll(400);
    await demo.caption("Attach evidence, route for review, and sign off", 2200);
  });
}
