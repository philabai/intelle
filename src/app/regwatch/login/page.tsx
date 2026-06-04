import Link from "next/link";
import { Suspense } from "react";
import { RegwatchAppShell } from "@/components/regwatch/AppShell";
import { RegwatchLoginForm } from "./LoginForm";

export const metadata = { title: "Sign in to RegWatch" };

export default function RegwatchLoginPage() {
  return (
    <RegwatchAppShell authed={false}>
      <div className="mx-auto flex max-w-md flex-col gap-6 px-4 py-16 sm:px-6">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Sign in</h1>
          <p className="mt-2 text-sm text-muted">
            Welcome back. Use your email and password, or request a magic link.
          </p>
        </div>
        <Suspense fallback={<div className="h-72 animate-pulse rounded-md bg-card-bg" />}>
          <RegwatchLoginForm />
        </Suspense>
        <p className="text-sm text-muted">
          New to RegWatch?{" "}
          <Link href="/regwatch/signup" className="text-brand-teal hover:underline">
            Create an account
          </Link>
          .
        </p>
      </div>
    </RegwatchAppShell>
  );
}
