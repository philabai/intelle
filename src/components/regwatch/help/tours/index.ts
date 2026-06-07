import type { TourStep } from "../GuidedTour";

/**
 * Tour catalogue — each entry maps a URL pattern + tour id to its
 * step definitions. The HelpDrawer renders this list as the
 * "Available tours" section so users can manually restart any tour.
 *
 * Selectors point at `data-tour` attributes scattered through the
 * production UI; if the underlying control moves, only the data-tour
 * attribute needs to follow it, not the tour file.
 */

export interface TourEntry {
  id: string;
  title: string;
  subtitle: string;
  surfacePattern: RegExp; // matches against pathname
  steps: TourStep[];
}

const footprintTour: TourEntry = {
  id: "footprint-v1",
  title: "Set up your operations footprint",
  subtitle: "Tells Vantage which regulations actually affect you.",
  surfacePattern: /^\/regwatch\/(settings\/footprint|comply\/footprint|onboarding)/,
  steps: [
    {
      element: "[data-tour='footprint-geographies']",
      title: "Pick your jurisdictions",
      body: "Where you have assets or operate. The relevance feed prioritises regulations from these jurisdictions first.",
      side: "bottom",
    },
    {
      element: "[data-tour='footprint-naics']",
      title: "Add your activities (NAICS)",
      body: "Choose the industry classifications that fit your operations. Used to score regulation relevance.",
      side: "bottom",
    },
    {
      element: "[data-tour='footprint-topics']",
      title: "Pick monitored topics",
      body: "PFAS, methane, CBAM, process safety — whatever you care about most. You can refine these later.",
      side: "bottom",
    },
    {
      element: "[data-tour='footprint-save']",
      title: "Save and you're done",
      body: "Changes propagate to your Relevance Feed within a minute. You can revisit this page any time.",
      side: "top",
    },
  ],
};

const composeTour: TourEntry = {
  id: "compose-v1",
  title: "Compose a SOP with cited regulations",
  subtitle: "Side-by-side editing with one-click citations.",
  surfacePattern: /^\/regwatch\/documents\/[^/]+\/compose/,
  steps: [
    {
      element: "[data-tour='compose-reference-picker']",
      title: "Pick a regulation to reference",
      body: "Search any regulation in the corpus or pull from the regulations already linked to this doc.",
      side: "right",
    },
    {
      element: "[data-tour='compose-cite-btn']",
      title: "Cite the clause inline",
      body: "Select a paragraph in the left pane, click 'Cite this clause' — a citation pill drops into your editor at the cursor position with the regulation + clause + version pinned.",
      side: "left",
    },
    {
      element: "[data-tour='compose-autosave']",
      title: "Autosave keeps your work safe",
      body: "Every 3 seconds. The status here tells you if save succeeded or hit a conflict (only happens if someone else edited the doc).",
      side: "bottom",
    },
    {
      element: "[data-tour='compose-submit-review']",
      title: "When you're ready, submit for review",
      body: "Captures your e-signature and routes to assigned reviewers / approvers — see the Workflow drawer on the doc detail page.",
      side: "top",
    },
  ],
};

const crosswalkTour: TourEntry = {
  id: "crosswalk-v1",
  title: "Map sections to clauses (crosswalk)",
  subtitle: "The traceability matrix auditors love.",
  surfacePattern: /^\/regwatch\/documents\/[^/]+\/crosswalk/,
  steps: [
    {
      element: "[data-tour='crosswalk-pick-reg']",
      title: "Pick a linked regulation",
      body: "Only regulations already linked to this doc are pickable. Add more links on the doc detail page.",
      side: "right",
    },
    {
      element: "[data-tour='crosswalk-map-row']",
      title: "Drop a mapping",
      body: "Pick a paragraph in your doc + the matching clause in the regulation. The crosswalk row gets stamped on save.",
      side: "top",
    },
    {
      element: "[data-tour='crosswalk-badge']",
      title: "Traceability badge",
      body: "Every mapped pair shows here. The Citation Review Queue on the doc page flags any that have gone stale (regulation updated since you mapped).",
      side: "left",
    },
  ],
};

const obligationsTour: TourEntry = {
  id: "obligations-v1",
  title: "Set up your first compliance obligation",
  subtitle: "Asset × Regulation × Reviewer.",
  surfacePattern: /^\/regwatch\/obligations/,
  steps: [
    {
      element: "[data-tour='obligation-pick-asset']",
      title: "Pin to an asset",
      body: "Pick a site, area, or component from your asset hierarchy. (Set up the hierarchy under Assets → Setup if you haven't.)",
      side: "bottom",
    },
    {
      element: "[data-tour='obligation-pick-reg']",
      title: "Pin to a regulation",
      body: "Search the corpus, pick the regulation, optionally narrow to a specific clause anchor.",
      side: "bottom",
    },
    {
      element: "[data-tour='obligation-severity']",
      title: "Set severity + compliance status",
      body: "Severity drives priority in the relevance feed and reports. Status starts as 'unknown' until the reviewer assesses.",
      side: "bottom",
    },
    {
      element: "[data-tour='obligation-assign']",
      title: "Assign a reviewer",
      body: "They'll see this obligation in their Reviewer Inbox and can complete the assessment with evidence + e-signature.",
      side: "top",
    },
  ],
};

export const TOUR_CATALOGUE: TourEntry[] = [
  footprintTour,
  composeTour,
  crosswalkTour,
  obligationsTour,
];

export function tourForPathname(pathname: string): TourEntry | null {
  for (const t of TOUR_CATALOGUE) {
    if (t.surfacePattern.test(pathname)) return t;
  }
  return null;
}
