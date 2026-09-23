import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { hasPublicSupabaseEnv } from "@/lib/env";
import { LoginWithXButton, LogoutButton } from "@/app/components/auth-button";

export default async function Home() {
  const hasSupabaseEnv = hasPublicSupabaseEnv();
  const supabase = hasSupabaseEnv ? await createSupabaseServerClient() : null;
  const user = supabase ? (await supabase.auth.getUser()).data.user : null;

  return (
    <main className="min-h-screen px-6 py-8 sm:px-10">
      <section className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-5xl flex-col justify-center gap-10">
        <div className="flex items-center justify-between border-b border-[var(--border)] pb-5">
          <p className="text-sm font-black tracking-[0.28em] text-[var(--accent)]">
            ZECHIMP
          </p>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--muted)]">
            Whitelist Campaign System
          </p>
        </div>

        <div className="max-w-3xl">
          <p className="mb-4 text-sm font-bold uppercase tracking-[0.22em] text-[var(--muted)]">
            Phase 03 — Authentication & Identity
          </p>
          <h1 className="text-5xl font-black leading-[0.95] sm:text-7xl">
            ZECHIMP Authentication
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-8 text-[var(--muted)]">
            Connect your X account to access the whitelist campaign, track points, and claim your spot.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          {user ? (
            <>
              <Link
                href="/dashboard"
                className="inline-flex items-center justify-center border border-[var(--accent)] bg-[var(--accent)] px-6 py-3.5 text-xs font-black uppercase tracking-[0.2em] text-[#090909] transition-all hover:bg-transparent hover:text-[var(--accent)]"
              >
                GO TO DASHBOARD
              </Link>
              <LogoutButton />
            </>
          ) : (
            <LoginWithXButton />
          )}
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <StatusPanel label="App Router" value="Ready" />
          <StatusPanel
            label="Supabase Auth"
            value={hasSupabaseEnv ? (user ? "Authenticated" : "No session") : "Env needed"}
          />
          <StatusPanel label="Phase" value="03" />
        </div>
      </section>
    </main>
  );
}

function StatusPanel({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-[var(--border)] bg-[var(--background-raised)] p-5">
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--muted)]">
        {label}
      </p>
      <p className="mt-3 text-2xl font-black text-[var(--foreground)]">{value}</p>
    </div>
  );
}
