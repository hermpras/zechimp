import crypto from "node:crypto";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export type DrawResult = {
  success: boolean;
  error?: string;
  raffleId?: string;
  wlSpots?: number;
  totalEntries?: number;
  totalUniqueUsers?: number;
  winnersCount?: number;
  secretSeed?: string;
  seedHash?: string;
  snapshotHash?: string;
  winners?: {
    winner_position: number;
    user_id: string;
    entry_id: string;
  }[];
};

/**
 * Deterministic PRNG using HMAC-SHA256 counter stream.
 *
 * Converts HMAC output bytes to deterministic uint32 values.
 */
class DeterministicPRNG {
  private secretSeed: string;
  private messagePrefix: string;
  private counter = 0;
  private buffer: Buffer = Buffer.alloc(0);
  private bufferOffset = 0;

  constructor(secretSeed: string, raffleId: string, snapshotHash: string) {
    this.secretSeed = secretSeed;
    this.messagePrefix = `${raffleId}:${snapshotHash}`;
  }

  private fillBuffer() {
    const hmac = crypto.createHmac("sha256", this.secretSeed);

    hmac.update(`${this.messagePrefix}:${this.counter}`);

    this.buffer = hmac.digest();
    this.bufferOffset = 0;
    this.counter++;
  }

  public nextUint32(): number {
    if (this.bufferOffset + 4 > this.buffer.length) {
      this.fillBuffer();
    }

    const val = this.buffer.readUInt32BE(this.bufferOffset);

    this.bufferOffset += 4;

    return val;
  }

  /**
   * Returns deterministic integer in range [0, maxExclusive).
   */
  public nextInt(maxExclusive: number): number {
    if (maxExclusive <= 0) {
      return 0;
    }

    const maxUint32 = 0xffffffff;

    const limit = maxUint32 - (maxUint32 % maxExclusive);

    let rand = this.nextUint32();

    while (rand >= limit) {
      rand = this.nextUint32();
    }

    return rand % maxExclusive;
  }
}

/**
 * Executes a deterministic cryptographic draw for a CLOSED raffle.
 *
 * Selects unique winning users based on entry snapshot weighting.
 */
export async function executeDeterministicDraw(
  raffleId: string,
  providedSecretSeed?: string,
): Promise<DrawResult> {
  const adminClient = createSupabaseAdminClient();

  // 1. Fetch raffle
  const { data: raffle, error: raffleErr } = await adminClient
    .from("raffles")
    .select("*")
    .eq("id", raffleId)
    .single();

  if (raffleErr || !raffle) {
    return {
      success: false,
      error: "Raffle not found.",
    };
  }

  // 2. Idempotency:
  // If already DRAWN, return existing winners.
  if (raffle.status === "DRAWN") {
    const { data: existingWinners } = await adminClient
      .from("raffle_winners")
      .select("winner_position, user_id, entry_id")
      .eq("raffle_id", raffleId)
      .order("winner_position", {
        ascending: true,
      });

    return {
      success: true,
      raffleId,
      wlSpots: raffle.wl_spots,
      winnersCount: existingWinners?.length || 0,
      winners: existingWinners || [],
    };
  }

  if (raffle.status !== "CLOSED") {
    return {
      success: false,
      error: `Raffle must be in CLOSED status to execute draw (Current status: ${raffle.status}).`,
    };
  }

  // 3. Fetch all frozen entries ordered deterministically
  const { data: entries, error: entriesErr } = await adminClient
    .from("raffle_entries")
    .select("id, raffle_id, user_id, entry_index")
    .eq("raffle_id", raffleId)
    .order("user_id", {
      ascending: true,
    })
    .order("entry_index", {
      ascending: true,
    });

  if (entriesErr || !entries || entries.length === 0) {
    return {
      success: false,
      error: "No entries found for this raffle.",
    };
  }

  // 4. Create canonical snapshot hash
  const canonicalEntries = entries.map((entry) => ({
    id: entry.id,
    user_id: entry.user_id,
    entry_index: entry.entry_index,
  }));

  const snapshotJson = JSON.stringify(canonicalEntries);

  const snapshotHash = crypto
    .createHash("sha256")
    .update(snapshotJson)
    .digest("hex");

  // 5. Secret seed + hash commitment
  const secretSeed =
    providedSecretSeed || crypto.randomBytes(32).toString("hex");

  const seedHash = crypto.createHash("sha256").update(secretSeed).digest("hex");

  // 6. Initialize deterministic PRNG
  const prng = new DeterministicPRNG(secretSeed, raffleId, snapshotHash);

  // 7. Draw unique winning users
  const uniqueUserIds = Array.from(
    new Set(entries.map((entry) => entry.user_id)),
  );

  const totalTargetWinners = Math.min(raffle.wl_spots, uniqueUserIds.length);

  let activePool = [...canonicalEntries];

  const selectedWinners: {
    winner_position: number;
    user_id: string;
    entry_id: string;
  }[] = [];

  const wonUserIds = new Set<string>();

  while (selectedWinners.length < totalTargetWinners && activePool.length > 0) {
    const drawnIdx = prng.nextInt(activePool.length);

    const chosenEntry = activePool[drawnIdx];

    if (!wonUserIds.has(chosenEntry.user_id)) {
      wonUserIds.add(chosenEntry.user_id);

      selectedWinners.push({
        winner_position: selectedWinners.length + 1,
        user_id: chosenEntry.user_id,
        entry_id: chosenEntry.id,
      });

      // Remove ALL remaining entries belonging
      // to the winning user so they cannot win twice.
      activePool = activePool.filter(
        (entry) => entry.user_id !== chosenEntry.user_id,
      );
    } else {
      activePool.splice(drawnIdx, 1);
    }
  }

  // 8. Persist winners
  const winnersToInsert = selectedWinners.map((winner) => ({
    raffle_id: raffleId,
    entry_id: winner.entry_id,
    user_id: winner.user_id,
    winner_position: winner.winner_position,
  }));

  const { data: insertedWinners, error: insertWinnersErr } = await adminClient
    .from("raffle_winners")
    .insert(winnersToInsert)
    .select("id, user_id, raffle_id");

  if (insertWinnersErr || !insertedWinners) {
    console.error("Failed to insert raffle winners:", insertWinnersErr);

    return {
      success: false,
      error: "Failed to persist winner records.",
    };
  }

  // 9. Initialize WL claims for winners
  //
  // CLAIMABLE = winner has the right to claim.
  // CLAIMED = wallet has been locked.
  // EXPIRED = claim deadline passed.
  const claimsToInsert = insertedWinners.map((winner) => ({
    raffle_winner_id: winner.id,
    user_id: winner.user_id,
    raffle_id: winner.raffle_id,
    wallet_address: "",
    wallet_chain: "EVM",
    status: "CLAIMABLE" as const,
  }));

  const { error: claimInsertError } = await adminClient
    .from("wl_claims")
    .insert(claimsToInsert);

  if (claimInsertError) {
    console.error("Failed to initialize WL claims:", claimInsertError);

    return {
      success: false,
      error: "Failed to initialize WL claim records.",
    };
  }

  // 10. Update raffle status to DRAWN
  const now = new Date().toISOString();

  await adminClient
    .from("raffles")
    .update({
      status: "DRAWN",
      drawn_at: now,
      updated_at: now,
    })
    .eq("id", raffleId);

  // 11. Record admin audit log
  await adminClient.from("admin_audit_logs").insert({
    admin_user_id: selectedWinners[0]?.user_id || raffle.id,
    action: "RAFFLE_DRAW_EXECUTED",
    entity_type: "raffle",
    entity_id: raffleId,
    metadata: {
      secret_seed: secretSeed,
      seed_hash: seedHash,
      snapshot_hash: snapshotHash,
      total_entries: entries.length,
      total_unique_users: uniqueUserIds.length,
      winners_count: selectedWinners.length,
      algorithm_version: "v1-hmac-fisher-yates-unique-users",
    },
  });

  return {
    success: true,
    raffleId,
    wlSpots: raffle.wl_spots,
    totalEntries: entries.length,
    totalUniqueUsers: uniqueUserIds.length,
    winnersCount: selectedWinners.length,
    secretSeed,
    seedHash,
    snapshotHash,
    winners: selectedWinners,
  };
}
