import { DiagramComparison, type ComparisonSpec } from "./DiagramComparison";
import { DiagramStack, type StackSpec } from "./DiagramStack";
import { DiagramSequence, type SequenceSpec } from "./DiagramSequence";

export type DiagramSpec =
  | ({ type: "comparison" } & ComparisonSpec)
  | ({ type: "stack" } & StackSpec)
  | ({ type: "sequence" } & SequenceSpec);

/**
 * Parses the contents of a fenced code block whose info string starts with
 * "diagram-<type>". Returns null if the JSON is malformed.
 */
export function parseDiagramSpec(
  language: string,
  body: string
): DiagramSpec | null {
  const match = language.match(/^diagram-(comparison|stack|sequence)$/);
  if (!match) return null;
  const type = match[1] as DiagramSpec["type"];
  try {
    const spec = JSON.parse(body) as Omit<DiagramSpec, "type">;
    return { type, ...spec } as DiagramSpec;
  } catch {
    return null;
  }
}

export function DiagramRouter({ spec }: { spec: DiagramSpec }) {
  if (spec.type === "comparison") return <DiagramComparison spec={spec} />;
  if (spec.type === "stack") return <DiagramStack spec={spec} />;
  if (spec.type === "sequence") return <DiagramSequence spec={spec} />;
  return null;
}

export function DiagramErrorPlaceholder({ language, error }: { language: string; error: string }) {
  return (
    <div className="my-6 rounded-lg border border-yellow-500/30 bg-yellow-500/5 p-4 text-xs text-yellow-200 not-prose">
      <p className="font-semibold mb-1">Diagram could not be rendered ({language})</p>
      <p className="text-yellow-200/70">{error}</p>
    </div>
  );
}
