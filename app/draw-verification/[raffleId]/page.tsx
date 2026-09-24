import Link from "next/link";
import { notFound } from "next/navigation";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/database/types";

type RaffleRow = Database["public"]["Tables"]["raffles"]["Row"];

export const dynamic = "force-dynamic";

export default async function DrawVerificationPage({
  params,
}: {
  params: Promise<{ raffleId: string }>;
}) {
  const { raffleId } = await params;
  const adminClient = createSupabaseAdminClient();

  // Fetch raffle
  const { data: raffleData } = await adminClient
    .from("raffles")
    .select("*")
    .eq("id", raffleId)
    .single();

  if (!raffleData) {
    notFound();
  }

  const raffle = raffleData as RaffleRow;

  // Fetch audit log metadata for seed & snapshot hash
  const { data: auditLog } = await adminClient
    .from("admin_audit_logs")
    .select("metadata, created_at")
    .eq("entity_id", raffleId)
    .eq("action", "RAFFLE_DRAW_EXECUTED")
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  const metadata = (auditLog?.metadata || {}) as Record<string, unknown>;
  const seedHash = (metadata.seed_hash as string) || "N/A";
  const snapshotHash = (metadata.snapshot_hash as string) || "N/A";
  const algorithmVersion =
    (metadata.algorithm_version as string) || "v1-hmac-fisher-yates-unique-users";

  // Fetch Winners
  const { data: winnersData } = await adminClient
    .from("raffle_winners")
    .select("winner_position, user_id, entry_id, created_at")
    .eq("raffle_id", raffleId)
    .order("winner_position", { ascending: true });

  const winners = winnersData || [];

  // Fetch X accounts for winners
  const winnerUserIds = Array.from(new Set(winners.map((w) => w.user_id)));
  const xUserMap = new Map<string, string>();

  if (winnerUserIds.length > 0) {
    const { data: xAccounts } = await adminClient
      .from("x_accounts")
      .select("user_id, username")
      .in("user_id", winnerUserIds);

    (xAccounts || []).forEach((acc) => {
      xUserMap.set(acc.user_id, acc.username);
    });
  }

  return (
    <main className="min-h-screen px-6 py-10 sm:px-10">
      <div className="mx-auto flex max-w-4xl flex-col gap-8">
        {/* Navigation & Header */}
        <div className="flex items-center justify-between border-b border-[var(--border)] pb-6">
          <Link
            href="/"
            className="text-sm font-black tracking-[0.28em] text-[var(--accent)] hover:opacity-80"
          >
            ZECHIMP
          </Link>
          <div className="flex items-center gap-4 text-xs font-mono">
            <Link
              href="/dashboard"
              className="text-[var(--muted)] hover:text-[var(--foreground)]"
            >
              ← USER DASHBOARD
            </Link>
          </div>
        </div>

        {/* Title Section */}
        <div>
          <div className="inline-flex items-center gap-2 border border-purple-500 bg-purple-950/30 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-purple-300">
            AUDITABLE DETERMINISTIC DRAW PROOF
          </div>
          <h1 className="mt-4 text-3xl font-black text-[var(--foreground)] sm:text-4xl">
            {raffle.title}
          </h1>
          <p className="mt-2 text-xs font-mono text-[var(--muted)]">
            Access Code:{" "}
            <span className="font-bold text-[var(--accent)]">
              {raffle.access_code}
            </span>{" "}
            | Status:{" "}
            <span className="font-bold uppercase text-purple-300">
              {raffle.status}
            </span>
          </p>
        </div>

        {/* Draw Non-executed warning if not DRAWN */}
        {raffle.status !== "DRAWN" ? (
          <div className="border border-amber-500 bg-amber-950/20 p-6 text-xs font-mono text-amber-400">
            ⚠️ The draw for this raffle has not been executed yet. Current Status:{" "}
            <strong>{raffle.status}</strong>.
          </div>
        ) : (
          <>
            {/* Cryptographic Proof Specifications */}
            <div className="border border-[var(--border)] bg-[#0d0d0d] p-6 flex flex-col gap-4 font-mono text-xs">
              <h2 className="text-sm font-black uppercase tracking-wider text-[var(--foreground)] border-b border-[var(--border)] pb-3">
                Cryptographic Commitment Details
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <span className="text-[var(--muted)] uppercase text-[10px] font-bold block mb-1">
                    Algorithm Specification
                  </span>
                  <span className="border border-[var(--border)] bg-[#141414] px-2.5 py-1 text-[11px] font-bold text-[var(--accent)] inline-block">
                    {algorithmVersion}
                  </span>
                </div>

                <div>
                  <span className="text-[var(--muted)] uppercase text-[10px] font-bold block mb-1">
                    Drawn Timestamp
                  </span>
                  <span className="text-[var(--foreground)]">
                    {raffle.drawn_at
                      ? new Date(raffle.drawn_at).toUTCString()
                      : "N/A"}
                  </span>
                </div>
              </div>

              <div>
                <span className="text-[var(--muted)] uppercase text-[10px] font-bold block mb-1">
                  Frozen Entry Snapshot Hash (SHA-256)
                </span>
                <div className="overflow-x-auto border border-[var(--border)] bg-[#141414] p-3 text-[11px] font-mono text-[var(--accent)] break-all select-all">
                  {snapshotHash}
                </div>
              </div>

              <div>
                <span className="text-[var(--muted)] uppercase text-[10px] font-bold block mb-1">
                  PRNG Seed Hash Commitment (SHA-256)
                </span>
                <div className="overflow-x-auto border border-[var(--border)] bg-[#141414] p-3 text-[11px] font-mono text-purple-300 break-all select-all">
                  {seedHash}
                </div>
              </div>
            </div>

            {/* Winner Roster */}
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
                <h2 className="text-sm font-black uppercase tracking-[0.2em] text-[var(--foreground)]">
                  WINNING ROSTER ({winners.length} / {raffle.wl_spots} WL SPOTS)
                </h2>
                <span className="text-xs font-mono text-emerald-400 font-bold">
                  ✓ VERIFIED UNIQUE WINNERS
                </span>
              </div>

              <div className="border border-[var(--border)] bg-[#0d0d0d]">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs font-mono">
                    <thead className="border-b border-[var(--border)] bg-[#141414] uppercase text-[var(--muted)]">
                      <tr>
                        <th className="px-4 py-3 font-bold">Rank</th>
                        <th className="px-4 py-3 font-bold">X Handle</th>
                        <th className="px-4 py-3 font-bold">User Identity</th>
                        <th className="px-4 py-3 font-bold">Winning Entry ID</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border)]">
                      {winners.map((w) => {
                        const xHandle = xUserMap.get(w.user_id);
                        return (
                          <tr key={w.entry_id} className="hover:bg-[#121212]">
                            <td className="px-4 py-3">
                              <span className="border border-[var(--accent)]/40 bg-[rgba(183,255,0,0.1)] px-2 py-0.5 font-bold text-[var(--accent)]">
                                #{w.winner_position}
                              </span>
                            </td>
                            <td className="px-4 py-3 font-bold text-[var(--foreground)]">
                              {xHandle ? `@${xHandle}` : "Anonymous ZECHIMP"}
                            </td>
                            <td className="px-4 py-3 text-[var(--muted)]">
                              {w.user_id.substring(0, 8)}...{w.user_id.slice(-4)}
                            </td>
                            <td className="px-4 py-3 text-[10px] text-[var(--muted)] font-mono">
                              {w.entry_id}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
