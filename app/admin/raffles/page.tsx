import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { RaffleManager } from "./raffle-manager";
import type { Database } from "@/database/types";

type RaffleRow = Database["public"]["Tables"]["raffles"]["Row"];

export const dynamic = "force-dynamic";

export default async function AdminRafflesPage() {
  const adminClient = createSupabaseAdminClient();

  // Fetch all raffles
  const { data: rafflesData } = await adminClient
    .from("raffles")
    .select("*")
    .order("created_at", { ascending: false });

  const raffles = (rafflesData || []) as RaffleRow[];

  // Fetch entry counts per raffle
  const { data: entriesData } = await adminClient
    .from("raffle_entries")
    .select("raffle_id");

  const entryCounts: Record<string, number> = {};
  (entriesData || []).forEach((e) => {
    entryCounts[e.raffle_id] = (entryCounts[e.raffle_id] || 0) + 1;
  });

  // Fetch winner counts per raffle
  const { data: winnersData } = await adminClient
    .from("raffle_winners")
    .select("raffle_id");

  const winnerCounts: Record<string, number> = {};
  (winnersData || []).forEach((w) => {
    winnerCounts[w.raffle_id] = (winnerCounts[w.raffle_id] || 0) + 1;
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-black text-[var(--foreground)] sm:text-4xl">
          Raffle Operations & Deterministic Draw Console
        </h1>
        <p className="mt-2 text-sm text-[var(--muted)]">
          Manage raffle access codes, freeze entry snapshots (CLOSE), and execute cryptographic HMAC-SHA256 draws.
        </p>
      </div>

      <RaffleManager
        raffles={raffles}
        entryCounts={entryCounts}
        winnerCounts={winnerCounts}
      />
    </div>
  );
}
