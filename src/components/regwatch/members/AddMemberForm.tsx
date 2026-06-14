"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { addMemberByEmail } from "@/lib/regwatch/members-actions";

export function AddMemberForm() {
  const t = useTranslations("regwatch.members");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"admin" | "member">("member");
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<
    { kind: "ok" | "error"; text: string } | null
  >(null);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    startTransition(async () => {
      const res = await addMemberByEmail({ email: email.trim(), role });
      if (!res.ok) {
        setMessage({ kind: "error", text: res.error ?? t("couldNotAddMember") });
        return;
      }
      setMessage({
        kind: "ok",
        text: res.invited
          ? t("sentInvite", { email })
          : t("addedMember", { email }),
      });
      setEmail("");
    });
  }

  return (
    <form
      onSubmit={onSubmit}
      className="flex flex-col gap-3 sm:flex-row sm:items-end"
    >
      <label className="flex flex-1 flex-col gap-1 text-sm">
        <span className="text-xs font-medium uppercase tracking-wider text-muted">
          {t("email")}
        </span>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder={t("emailPlaceholder")}
          className="rounded-md border border-card-border bg-card-bg px-3 py-2 text-sm text-foreground placeholder:text-muted/60 focus:border-brand-blue focus:outline-none"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span className="text-xs font-medium uppercase tracking-wider text-muted">
          {t("role")}
        </span>
        <select
          value={role}
          onChange={(e) => setRole(e.target.value as "admin" | "member")}
          className="rounded-md border border-card-border bg-card-bg px-3 py-2 text-sm text-foreground focus:border-brand-blue focus:outline-none"
        >
          <option value="member">{t("roleMember")}</option>
          <option value="admin">{t("roleAdmin")}</option>
        </select>
      </label>
      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-brand-blue px-4 py-2 text-sm font-medium text-white hover:bg-brand-blue/90 disabled:cursor-not-allowed disabled:opacity-50 sm:self-stretch"
      >
        {pending ? t("adding") : t("addMember")}
      </button>
      {message && (
        <p
          className={`sm:basis-full text-xs ${
            message.kind === "ok" ? "text-brand-teal" : "text-red-400"
          }`}
        >
          {message.text}
        </p>
      )}
    </form>
  );
}
