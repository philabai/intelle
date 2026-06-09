/**
 * Tutorial videos shown on /regwatch/tutorials and embedded from the Help
 * drawer. Files live in the public Supabase Storage bucket under tutorials/.
 */

export interface Tutorial {
  slug: string;
  file: string; // object path within the bucket
  title: string;
  description: string;
  durationLabel: string;
}

export const TUTORIAL_BUCKET = "regwatch-tutorials";

export const TUTORIALS: Tutorial[] = [
  {
    slug: "regulations",
    file: "tutorials/1-regulations.mp4",
    title: "Exploring Regulations",
    description:
      "Browse the corpus by country and CFR hierarchy, search with Iris, and navigate by topic.",
    durationLabel: "~1 min",
  },
  {
    slug: "monitor",
    file: "tutorials/2-monitor.mp4",
    title: "Monitoring Your Feed",
    description:
      "Your footprint-scored Relevance Feed, weekly recap, saved searches and alerts.",
    durationLabel: "~1 min",
  },
  {
    slug: "comply",
    file: "tutorials/3-comply.mp4",
    title: "Managing Compliance",
    description:
      "Set up your footprint and asset hierarchy, then track obligations through review.",
    durationLabel: "~1 min",
  },
  {
    slug: "author",
    file: "tutorials/4-author.mp4",
    title: "Authoring a Document",
    description:
      "Draft, edit and version company SOPs and policies in the in-app editor.",
    durationLabel: "~1 min",
  },
];

/** Public URL for a Storage object in the public bucket. */
export function tutorialUrl(file: string): string {
  const base = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").replace(/\/$/, "");
  return `${base}/storage/v1/object/public/${TUTORIAL_BUCKET}/${file}`;
}
