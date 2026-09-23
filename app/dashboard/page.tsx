import { redirect } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { LogoutButton } from "@/app/components/auth-button";
import type { Database } from "@/database/types";

type XAccountRow = Database["public"]["Tables"]["x_accounts"]["Row"];
type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];

export default async function DashboardPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/");
  }

  // Fetch X Account data
  const { data: xAccountData } = await supabase
    .from("x_accounts")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  const xAccount = xAccountData as XAccountRow | null;

  // Fetch Profile data
  const { data: profileData } = await supabase
    .from("profiles")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  const profile = profileData as ProfileRow | null;

  const username = xAccount?.username || profile?.username || "unknown";
  const displayName =
    xAccount?.display_name || profile?.display_name || username;
  const avatarUrl = xAccount?.avatar_url || profile?.avatar_url || null;
  const xUserId = xAccount?.x_user_id || "N/A";

  return (
    <main className="min-h-screen px-6 py-8 sm:px-10">
      <section className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-5xl flex-col gap-10">
        {/* Navigation Header */}
        <div className="flex items-center justify-between border-b border-[var(--border)] pb-5">
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="text-sm font-black tracking-[0.28em] text-[var(--accent)] hover:opacity-80"
            >
              ZECHIMP
            </Link>
            <span className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--muted)]">
              / Dashboard
            </span>
          </div>
          <LogoutButton />
        </div>

        {/* Header Title */}
        <div>
          <div className="inline-flex items-center gap-2 border border-[var(--accent)] bg-[rgba(183,255,0,0.1)] px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-[var(--accent)]">
            <span className="h-2 w-2 rounded-full bg-[var(--accent)] animate-pulse" />
            AUTHENTICATED SESSION
          </div>
          <h1 className="mt-4 text-4xl font-black leading-none sm:text-6xl">
            Identity Foundation
          </h1>
          <p className="mt-4 max-w-xl text-base text-[var(--muted)]">
            Your X identity has been synchronized with Supabase Auth.
          </p>
        </div>

        {/* Identity Card */}
        <div className="border border-[var(--border)] bg-[var(--background-raised)] p-6 sm:p-8">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-5">
              {avatarUrl ? (
                <Image
                  src={avatarUrl}
                  alt={displayName}
                  width={64}
                  height={64}
                  className="h-16 w-16 border border-[var(--border)] object-cover"
                  unoptimized
                />
              ) : (
                <div className="flex h-16 w-16 items-center justify-center border border-[var(--accent)] bg-[#121212] text-xl font-black text-[var(--accent)]">
                  {displayName.substring(0, 2).toUpperCase()}
                </div>
              )}
              <div>
                <h2 className="text-2xl font-black text-[var(--foreground)]">
                  {displayName}
                </h2>
                <p className="text-sm font-bold text-[var(--accent)]">
                  @{username}
                </p>
              </div>
            </div>

            <div className="inline-flex items-center gap-2 rounded-none border border-[var(--border)] bg-[#121212] px-4 py-2 text-xs font-bold uppercase tracking-wider text-[var(--foreground)]">
              <svg
                className="h-4 w-4 fill-current text-[var(--accent)]"
                viewBox="0 0 24 24"
              >
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
              X OAuth 2.0 Connected
            </div>
          </div>

          <div className="mt-8 grid gap-4 border-t border-[var(--border)] pt-6 sm:grid-cols-2">
            <div className="border border-[var(--border)] bg-[#090909] p-4">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--muted)]">
                Permanent X User ID (x_user_id)
              </p>
              <p className="mt-2 font-mono text-sm font-bold text-[var(--foreground)]">
                {xUserId}
              </p>
            </div>

            <div className="border border-[var(--border)] bg-[#090909] p-4">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--muted)]">
                Supabase Auth ID (user_id)
              </p>
              <p className="mt-2 font-mono text-xs font-bold text-[var(--foreground)] truncate">
                {user.id}
              </p>
            </div>
          </div>
        </div>

        {/* Footer info */}
        <div className="text-xs text-[var(--muted)]">
          <p>
            Phase 3 Authentication complete. Future phases will build campaign
            missions, point balances, and raffle entries on top of this identity.
          </p>
        </div>
      </section>
    </main>
  );
}
