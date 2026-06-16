import { listChannels, type BufferProfile } from "@/lib/content/buffer";

export const metadata = { title: "Platforms — Outreach" };
export const dynamic = "force-dynamic";

const CONFIGURED = [
  { service: "linkedin", label: "LinkedIn", env: "BUFFER_LINKEDIN_CHANNEL_ID" },
  { service: "twitter", label: "X / Twitter", env: "BUFFER_TWITTER_CHANNEL_ID" },
];

export default async function OutreachPlatformsPage() {
  let profiles: BufferProfile[] = [];
  let error: string | null = null;
  try {
    ({ profiles } = await listChannels());
  } catch (e) {
    error = e instanceof Error ? e.message : String(e);
  }

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-semibold text-white">Platforms</h1>
      <p className="mt-1 text-sm text-muted">
        Publishing runs through Buffer. Connect or reconnect channels in Buffer; this page reflects what
        the access token can see and which channel IDs are wired for the publish cron.
      </p>

      <h2 className="mt-6 text-sm font-medium uppercase tracking-wider text-muted">Publish targets</h2>
      <div className="mt-2 space-y-2">
        {CONFIGURED.map((c) => {
          const id = process.env[c.env];
          const match = profiles.find((p) => p.id === id);
          const visible = profiles.some((p) => p.service === c.service);
          return (
            <div key={c.env} className="flex items-center justify-between rounded-lg border border-card-border bg-card-bg px-4 py-3">
              <div>
                <p className="text-sm text-white">{c.label}</p>
                <p className="text-xs text-muted">{id ? `Channel ${id}` : `${c.env} not set`}</p>
              </div>
              <span className={`rounded-full px-2.5 py-1 text-xs ${id && match ? "bg-brand-teal/15 text-brand-teal" : id ? "bg-amber-400/15 text-amber-400" : "bg-red-500/15 text-red-400"}`}>
                {id && match ? "Connected" : id ? "ID set, not visible" : visible ? "Channel available — set ID" : "Not configured"}
              </span>
            </div>
          );
        })}
      </div>

      <h2 className="mt-6 text-sm font-medium uppercase tracking-wider text-muted">
        All Buffer channels {error ? "" : `(${profiles.length})`}
      </h2>
      {error ? (
        <div className="mt-2 rounded-lg border border-red-500/30 bg-red-500/5 p-4 text-sm text-red-300">
          Couldn’t reach Buffer: {error}
        </div>
      ) : profiles.length === 0 ? (
        <div className="mt-2 rounded-lg border border-dashed border-card-border bg-card-bg/40 p-6 text-center text-sm text-muted">
          No channels visible to this token.
        </div>
      ) : (
        <ul className="mt-2 divide-y divide-card-border rounded-lg border border-card-border bg-card-bg">
          {profiles.map((p) => (
            <li key={p.id} className="flex items-center justify-between px-4 py-2.5 text-sm">
              <span className="text-white">{p.displayName || p.name}</span>
              <span className="flex items-center gap-2 text-xs text-muted">
                <span className="rounded bg-white/10 px-1.5 py-0.5">{p.service}</span>
                <code className="text-[11px]">{p.id}</code>
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
