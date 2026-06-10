"use client";

import { useEffect, useRef, useState } from "react";
import {
  tutorialUrl,
  type TutorialCourse,
} from "@/lib/regwatch/tutorials";

/**
 * Interactive chaptered tutorial player. Plays a course's sections back-to-back,
 * pausing after each with a Continue gate so it's a clickable walkthrough, not
 * one long video. Captions render as a synced banner (cue track), and a chapter
 * rail lets the viewer jump between sections.
 *
 * Audio (the baked Nova voiceover) plays after the initial "Start" gesture —
 * browsers block autoplay-with-sound until the user interacts.
 */
export function TutorialPlayer({ course }: { course: TutorialCourse }) {
  const sections = course.sections;
  const videoRef = useRef<HTMLVideoElement>(null);
  const [started, setStarted] = useState(false);
  const [idx, setIdx] = useState(0);
  const [ended, setEnded] = useState(false);
  const [caption, setCaption] = useState("");
  const [maxReached, setMaxReached] = useState(0);

  const section = sections[idx];
  const isLast = idx === sections.length - 1;

  // (Re)load + autoplay the active section once started.
  useEffect(() => {
    if (!started) return;
    const v = videoRef.current;
    if (!v) return;
    setEnded(false);
    setCaption("");
    v.currentTime = 0;
    void v.play().catch(() => {});
  }, [idx, started]);

  if (sections.length === 0) {
    return (
      <div className="grid aspect-video w-full place-items-center rounded-xl border border-dashed border-card-border bg-card-bg/30 text-sm text-muted">
        Coming soon
      </div>
    );
  }

  function onTimeUpdate() {
    const v = videoRef.current;
    if (!v || !section) return;
    const t = v.currentTime;
    const cue = section.cues.find((c) => t >= c.start && t < c.end);
    setCaption(cue?.text ?? "");
  }
  function start() {
    setStarted(true);
  }
  function goNext() {
    if (idx < sections.length - 1) {
      const next = idx + 1;
      setIdx(next);
      setMaxReached((m) => Math.max(m, next));
    }
  }
  function replay() {
    const v = videoRef.current;
    if (!v) return;
    setEnded(false);
    v.currentTime = 0;
    void v.play().catch(() => {});
  }
  function jumpTo(i: number) {
    setIdx(i);
    setMaxReached((m) => Math.max(m, i));
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_220px]">
      {/* Video stage */}
      <div className="relative overflow-hidden rounded-xl border border-card-border bg-black">
        <video
          ref={videoRef}
          src={tutorialUrl(section.file)}
          preload="metadata"
          playsInline
          controls={started}
          onTimeUpdate={onTimeUpdate}
          onEnded={() => {
            setEnded(true);
            setCaption("");
          }}
          className="aspect-video w-full bg-black"
        />

        {/* Caption banner (synced cue) */}
        {started && !ended && caption && (
          <div className="pointer-events-none absolute inset-x-0 bottom-14 flex justify-center px-4">
            <span className="rounded-xl border border-brand-teal/45 bg-[#0a0e1c]/90 px-5 py-3 text-center text-sm font-medium leading-snug text-white shadow-2xl shadow-black/45 backdrop-blur-sm sm:text-base">
              {caption}
            </span>
          </div>
        )}

        {/* Start overlay */}
        {!started && (
          <button
            type="button"
            onClick={start}
            className="absolute inset-0 grid place-items-center bg-black/55 transition hover:bg-black/45"
          >
            <span className="flex flex-col items-center gap-3">
              <span className="grid h-16 w-16 place-items-center rounded-full bg-brand-blue text-2xl text-white shadow-lg">
                ▶
              </span>
              <span className="text-sm font-medium text-white">
                Start tutorial · {sections.length} sections
              </span>
            </span>
          </button>
        )}

        {/* Continue gate */}
        {started && ended && (
          <div className="absolute inset-0 grid place-items-center bg-black/75 backdrop-blur-sm">
            <div className="flex flex-col items-center gap-4 px-6 text-center">
              <p className="text-sm text-white/80">
                {isLast
                  ? "That's the end of this walkthrough."
                  : `Section ${idx + 1} of ${sections.length} complete.`}
              </p>
              <div className="flex flex-wrap items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={replay}
                  className="rounded-md border border-card-border bg-background/80 px-4 py-2 text-sm text-foreground/90 hover:border-brand-blue hover:text-brand-blue"
                >
                  ↺ Replay section
                </button>
                {!isLast ? (
                  <button
                    type="button"
                    onClick={goNext}
                    className="rounded-md bg-brand-blue px-5 py-2 text-sm font-medium text-white hover:bg-brand-blue/90"
                  >
                    Continue → {sections[idx + 1].title}
                  </button>
                ) : (
                  <span className="rounded-md bg-brand-teal/15 px-4 py-2 text-sm font-medium text-brand-teal">
                    Done 🎉
                  </span>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Chapter rail */}
      <ol className="space-y-1">
        {sections.map((s, i) => {
          const done = i < maxReached || (i === idx && ended);
          const active = i === idx;
          return (
            <li key={s.slug}>
              <button
                type="button"
                onClick={() => jumpTo(i)}
                disabled={!started}
                className={`flex w-full items-start gap-2 rounded-md border px-3 py-2 text-left text-xs transition disabled:opacity-60 ${
                  active
                    ? "border-brand-blue/60 bg-brand-blue/10 text-foreground"
                    : "border-card-border bg-card-bg/30 text-muted hover:border-card-border/80 hover:text-foreground"
                }`}
              >
                <span
                  className={`mt-px grid h-4 w-4 shrink-0 place-items-center rounded-full text-[9px] font-semibold ${
                    active
                      ? "bg-brand-blue text-white"
                      : done
                        ? "bg-brand-teal/80 text-white"
                        : "bg-card-border text-muted"
                  }`}
                >
                  {done && !active ? "✓" : i + 1}
                </span>
                <span className="leading-snug">{s.title}</span>
              </button>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
