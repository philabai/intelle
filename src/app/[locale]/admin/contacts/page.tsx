"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card } from "@/components/ui/Card";
import type { ContactSubmission } from "@/lib/types";

export default function ContactsPage() {
  const [contacts, setContacts] = useState<ContactSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("contact_submissions")
      .select("*")
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        setContacts((data as ContactSubmission[]) || []);
        setLoading(false);
      });
  }, []);

  async function updateStatus(id: string, status: string) {
    const supabase = createClient();
    await supabase.from("contact_submissions").update({ status }).eq("id", id);
    setContacts((prev) => prev.map((c) => (c.id === id ? { ...c, status: status as ContactSubmission["status"] } : c)));
  }

  const statusColors: Record<string, string> = {
    new: "bg-brand-blue/10 text-brand-blue",
    read: "bg-yellow-500/10 text-yellow-400",
    replied: "bg-brand-teal/10 text-brand-teal",
    archived: "bg-muted/10 text-muted",
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-8">Contact Submissions</h1>
      {loading ? (
        <p className="text-muted">Loading...</p>
      ) : contacts.length === 0 ? (
        <p className="text-muted">No submissions yet.</p>
      ) : (
        <div className="space-y-3">
          {contacts.map((contact) => (
            <Card key={contact.id} hover={false} className="p-4">
              <div className="flex items-start justify-between cursor-pointer" onClick={() => setSelected(selected === contact.id ? null : contact.id)}>
                <div>
                  <div className="flex items-center gap-3">
                    <p className="font-medium text-white">{contact.name}</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${statusColors[contact.status]}`}>{contact.status}</span>
                  </div>
                  <p className="text-sm text-muted">{contact.email} {contact.company && `| ${contact.company}`}</p>
                  <p className="text-xs text-muted/60 mt-1">{new Date(contact.created_at).toLocaleString()}</p>
                </div>
                <svg className={`w-5 h-5 text-muted transition-transform ${selected === contact.id ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
              {selected === contact.id && (
                <div className="mt-4 pt-4 border-t border-card-border">
                  {contact.service_interest && <p className="text-sm text-muted mb-2"><span className="text-muted/60">Interest:</span> {contact.service_interest}</p>}
                  {contact.phone && <p className="text-sm text-muted mb-2"><span className="text-muted/60">Phone:</span> {contact.phone}</p>}
                  <p className="text-sm text-foreground whitespace-pre-wrap">{contact.message}</p>
                  <div className="mt-4 flex gap-2">
                    <button onClick={() => updateStatus(contact.id, "read")} className="text-xs px-3 py-1 rounded bg-yellow-500/10 text-yellow-400 hover:bg-yellow-500/20 cursor-pointer">Mark Read</button>
                    <button onClick={() => updateStatus(contact.id, "replied")} className="text-xs px-3 py-1 rounded bg-brand-teal/10 text-brand-teal hover:bg-brand-teal/20 cursor-pointer">Mark Replied</button>
                    <button onClick={() => updateStatus(contact.id, "archived")} className="text-xs px-3 py-1 rounded bg-muted/10 text-muted hover:bg-muted/20 cursor-pointer">Archive</button>
                  </div>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
