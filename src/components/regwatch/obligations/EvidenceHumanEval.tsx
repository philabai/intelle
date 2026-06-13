"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "@/i18n/navigation";
import {
  saveEvidenceEvaluation,
  transcribeEvidenceAudio,
  type EvidenceHumanEvaluation,
} from "@/lib/regwatch/evidence-actions";

interface Props {
  obligationId: string;
  evidenceFileId: string;
  evaluation: EvidenceHumanEvaluation | null;
  canManage: boolean;
}

/**
 * Reviewer's human evaluation of one evidence file's AI analysis. Shows the
 * saved note (with author + time), or a "+ Add human evaluation" affordance
 * for the assigned reviewer / admins.
 */
export function EvidenceHumanEval({ obligationId, evidenceFileId, evaluation, canManage }: Props) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(evaluation?.text ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const canRecord =
    typeof window !== "undefined" &&
    typeof MediaRecorder !== "undefined" &&
    !!navigator.mediaDevices?.getUserMedia;

  async function startRecording() {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      chunksRef.current = [];
      mr.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      mr.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: mr.mimeType || "audio/webm" });
        await transcribe(blob);
      };
      mr.start();
      recorderRef.current = mr;
      setRecording(true);
    } catch {
      setError("Microphone unavailable or permission denied.");
    }
  }

  function stopRecording() {
    recorderRef.current?.stop();
    setRecording(false);
  }

  async function transcribe(blob: Blob) {
    setTranscribing(true);
    setError(null);
    try {
      const ext = blob.type.includes("mp4")
        ? "mp4"
        : blob.type.includes("ogg")
          ? "ogg"
          : "webm";
      const fd = new FormData();
      fd.set("audio", blob, `recording.${ext}`);
      const res = await transcribeEvidenceAudio(fd);
      if (!res.ok || !res.text) setError(res.error ?? "Couldn't transcribe the recording.");
      else setText((t) => (t.trim() ? `${t.trim()}\n${res.text}` : res.text!));
    } catch (e) {
      setError(`Transcription failed: ${(e as Error).message}`);
    } finally {
      setTranscribing(false);
    }
  }

  function save() {
    setError(null);
    start(async () => {
      const res = await saveEvidenceEvaluation({ obligationId, evidenceFileId, text });
      if (!res.ok) setError(res.error ?? "Could not save");
      else {
        setEditing(false);
        router.refresh();
      }
    });
  }

  if (evaluation && !editing) {
    return (
      <div className="rounded-md border border-brand-teal/40 bg-brand-teal/5 p-3">
        <div className="flex items-center justify-between gap-2">
          <p className="text-[10px] font-medium uppercase tracking-wider text-brand-teal">
            Human evaluation
          </p>
          {canManage && (
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="text-[10px] text-muted hover:text-foreground"
            >
              Edit
            </button>
          )}
        </div>
        <p className="mt-1.5 whitespace-pre-wrap text-xs text-foreground/90">{evaluation.text}</p>
        <p className="mt-1.5 text-[10px] text-muted">
          — {evaluation.by_name}, {new Date(evaluation.at).toLocaleString()}
        </p>
      </div>
    );
  }

  if (!canManage) return null;

  if (!editing) {
    return (
      <button
        type="button"
        onClick={() => setEditing(true)}
        className="inline-flex items-center gap-1.5 rounded-md border border-dashed border-card-border px-2.5 py-1.5 text-xs text-muted hover:border-brand-teal hover:text-foreground"
      >
        <span className="text-base leading-none">+</span> Add human evaluation
      </button>
    );
  }

  return (
    <div className="rounded-md border border-card-border bg-card-bg/30 p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[10px] font-medium uppercase tracking-wider text-muted">
          Human evaluation
        </p>
        {canRecord && (
          <button
            type="button"
            onClick={recording ? stopRecording : startRecording}
            disabled={transcribing}
            title="Dictate your note — recorded audio is transcribed (any language → English) into the box below"
            className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-[11px] disabled:opacity-60 ${
              recording
                ? "border-red-500/60 bg-red-500/15 text-red-200"
                : "border-card-border bg-card-bg text-foreground hover:border-brand-teal"
            }`}
          >
            {transcribing ? (
              "Transcribing…"
            ) : recording ? (
              <>
                <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-red-400" />
                Stop &amp; transcribe
              </>
            ) : (
              <>🎤 Record</>
            )}
          </button>
        )}
      </div>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={3}
        placeholder="Type your assessment, or tap Record to dictate it — do you agree with the AI? Add context, corrections, or the decision a reviewer should act on."
        className="mt-1.5 w-full rounded-md border border-card-border bg-background px-2.5 py-2 text-xs text-foreground focus:border-brand-blue focus:outline-none"
      />
      {error && <p className="mt-1 text-[11px] text-red-400">{error}</p>}
      <div className="mt-2 flex gap-2">
        <button
          type="button"
          onClick={save}
          disabled={pending}
          className="rounded-md bg-brand-blue px-3 py-1 text-xs font-medium text-white hover:bg-brand-blue/90 disabled:opacity-60"
        >
          {pending ? "Saving…" : "Save evaluation"}
        </button>
        <button
          type="button"
          onClick={() => {
            setEditing(false);
            setText(evaluation?.text ?? "");
            setError(null);
          }}
          className="rounded-md border border-card-border px-3 py-1 text-xs text-muted hover:text-foreground"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
