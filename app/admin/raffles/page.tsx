import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { RaffleManager } from "./raffle-manager";
import type { Database } from "@/database/types";

type RaffleRow = Database["public"]["Tables"]["raffles"]["Row"];

export type AdminClaimDetail = {
  claim_id: string;
  raffle_winner_id: string;
  user_id: string;
  winner_position: number;
  username: string;
  wallet_address: string;
  status: "CLAIMABLE" | "CLAIMED" | "EXPIRED";
  claimed_at: string | null;
  claim_deadline: string | null;
};

export type ClaimStats = {
  claimed: number;
  pending: number;
  expired: number;
};

export const dynamic = "force-dynamic";

export default async function AdminRafflesPage() {
  const adminClient = createSupabaseAdminClient();

  // 1. Fetch all raffles
  const { data: rafflesData } = await adminClient
    .from("raffles")
    .select("*")
    .order("created_at", { ascending: false });

  const raffles = (rafflesData || []) as RaffleRow[];

  // 2. Fetch entry counts per raffle
  const { data: entriesData } = await adminClient
    .from("raffle_entries")
    .select("raffle_id");

  const entryCounts: Record<string, number> = {};
  (entriesData || []).forEach((e) => {
    entryCounts[e.raffle_id] = (entryCounts[e.raffle_id] || 0) + 1;
  });

  // 3. Fetch winners per raffle
  const { data: winnersData } = await adminClient
    .from("raffle_winners")
    .select("id, raffle_id, user_id, winner_position")
    .order("winner_position", { ascending: true });

  const winnerCounts: Record<string, number> = {};
  (winnersData || []).forEach((w) => {
    winnerCounts[w.raffle_id] = (winnerCounts[w.raffle_id] || 0) + 1;
  });

  // 4. Fetch all wl_claims
  const { data: claimsData } = await adminClient
    .from("wl_claims")
    .select("*");

  const claims = claimsData || [];

  // Fetch X accounts & profiles for username resolution
  const allWinnerUserIds = Array.from(new Set((winnersData || []).map((w) => w.user_id)));

  const { data: xAccountsData } = await adminClient
    .from("x_accounts")
    .select("user_id, username")
    .in("user_id", allWinnerUserIds.length > 0 ? allWinnerUserIds : ["00000000-0000-0000-0000-000000000000"]);

  const { data: profilesData } = await adminClient
    .from("profiles")
    .select("user_id, username")
    .in("user_id", allWinnerUserIds.length > 0 ? allWinnerUserIds : ["00000000-0000-0000-0000-000000000000"]);

  const claimStats: Record<string, ClaimStats> = {};
  const claimsMap: Record<string, AdminClaimDetail[]> = {};

  raffles.forEach((r) => {
    claimStats[r.id] = { claimed: 0, pending: 0, expired: 0 };
    claimsMap[r.id] = [];
  });

  (winnersData || []).forEach((w) => {
    const claim = claims.find((c) => c.raffle_winner_id === w.id);
    const xAcc = xAccountsData?.find((x) => x.user_id === w.user_id);
    const prof = profilesData?.find((p) => p.user_id === w.user_id);
    const username = xAcc?.username || prof?.username || `User ${w.user_id.substring(0, 8)}`;

    const status: "CLAIMABLE" | "CLAIMED" | "EXPIRED" = claim?.status || "CLAIMABLE";

    if (!claimStats[w.raffle_id]) {
      claimStats[w.raffle_id] = { claimed: 0, pending: 0, expired: 0 };
    }

    if (status === "CLAIMED") {
      claimStats[w.raffle_id].claimed += 1;
    } else if (status === "EXPIRED") {
      claimStats[w.raffle_id].expired += 1;
    } else {
      claimStats[w.raffle_id].pending += 1; // CLAIMABLE = PENDING
    }

    if (!claimsMap[w.raffle_id]) {
      claimsMap[w.raffle_id] = [];
    }

    claimsMap[w.raffle_id].push({
      claim_id: claim?.id || "",
      raffle_winner_id: w.id,
      user_id: w.user_id,
      winner_position: w.winner_position,
      username,
      wallet_address: claim?.wallet_address || "",
      status,
      claimed_at: claim?.claimed_at || null,
      claim_deadline: claim?.claim_deadline || null,
    });
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-black text-[var(--foreground)] sm:text-4xl">
          Raffle Operations & Deterministic Draw Console
        </h1>
        <p className="mt-2 text-sm text-[var(--muted)]">
          Manage raffle access codes, freeze entry snapshots (CLOSE), execute cryptographic HMAC-SHA256 draws, monitor WL claims, and export claimed wallets to CSV.
        </p>
      </div>

      <RaffleManager
        raffles={raffles}
        entryCounts={entryCounts}
        winnerCounts={winnerCounts}
        claimStats={claimStats}
        claimsMap={claimsMap}
      />
    </div>
  );
}
