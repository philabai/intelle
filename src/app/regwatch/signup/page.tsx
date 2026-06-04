import Link from "next/link";
import { RegwatchAppShell } from "@/components/regwatch/AppShell";
import { RegwatchSignupForm } from "./SignupForm";

export const metadata = { title: "Create your RegWatch account" };

export default function RegwatchSignupPage() {
  return (
    <RegwatchAppShell authed={false}>
      <div className="mx-auto flex max-w-md flex-col gap-6 px-4 py-16 sm:px-6">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Create your account</h1>
          <p className="mt-2 text-sm text-muted">
            Free tier: browse the full corpus + 5 Iris Q&A queries per day. Upgrade later
            for footprint scoring, the Relevance Feed, and critical alerts.
          </p>
        </div>
        <RegwatchSignupForm />
        <p className="text-sm text-muted">
          Already have an account?{" "}
          <Link href="/regwatch/login" className="text-brand-teal hover:underline">
            Sign in
          </Link>
          .
        </p>
      </div>
    </RegwatchAppShell>
  );
}
