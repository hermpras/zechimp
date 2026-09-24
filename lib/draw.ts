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
 * Converts HMAC output bytes to an unbiased random float in [0, 1).
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
   * Returns a deterministic integer in range [0, maxExclusive)
   */
  public nextInt(maxExclusive: number): number {
    if (maxExclusive <= 0) return 0;
    // Unbiased range selection
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
 * Selects unique winning users based on entry snapshot weighting.
 */
export async function executeDeterministicDraw(
  raffleId: string,
  providedSecretSeed?: string,
): Promise<DrawResult> {
  const adminClient = createSupabaseAdminClient();

  // 1. Fetch Raffle
  const { data: raffle, error: raffleErr } = await adminClient
    .from("raffles")
    .select("*")
    .eq("id", raffleId)
    .single();

  if (raffleErr || !raffle) {
    return { success: false, error: "Raffle not found." };
  }

  // Idempotency: If already DRAWN, return existing winners
  if (raffle.status === "DRAWN") {
    const { data: existingWinners } = await adminClient
      .from("raffle_winners")
      .select("winner_position, user_id, entry_id")
      .eq("raffle_id", raffleId)
      .order("winner_position", { ascending: true });

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

  // 2. Fetch all frozen entries ordered deterministically
  const { data: entries, error: entriesErr } = await adminClient
    .from("raffle_entries")
    .select("id, raffle_id, user_id, entry_index")
    .eq("raffle_id", raffleId)
    .order("user_id", { ascending: true })
    .order("entry_index", { ascending: true });

  if (entriesErr || !entries || entries.length === 0) {
    return { success: false, error: "No entries found for this raffle." };
  }

  // 3. Create canonical snapshot hash
  const canonicalEntries = entries.map((e) => ({
    id: e.id,
    user_id: e.user_id,
    entry_index: e.entry_index,
  }));
  const snapshotJson = JSON.stringify(canonicalEntries);
  const snapshotHash = crypto
    .createHash("sha256")
    .update(snapshotJson)
    .digest("hex");

  // 4. Secret Seed & Hash Commitment
  const secretSeed =
    providedSecretSeed || crypto.randomBytes(32).toString("hex");
  const seedHash = crypto.createHash("sha256").update(secretSeed).digest("hex");

  // 5. Initialize Deterministic PRNG Stream
  const prng = new DeterministicPRNG(secretSeed, raffleId, snapshotHash);

  // 6. Draw Unique Winning Users
  const uniqueUserIds = Array.from(new Set(entries.map((e) => e.user_id)));
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

      // Remove ALL remaining entries belonging to the winning user so they cannot win twice
      activePool = activePool.filter((e) => e.user_id !== chosenEntry.user_id);
    } else {
      // Safety fallback: remove single entry
      activePool.splice(drawnIdx, 1);
    }
  }

  // 7. Persist winners to raffle_winners
  const winnersToInsert = selectedWinners.map((w) => ({
    raffle_id: raffleId,
    entry_id: w.entry_id,
    user_id: w.user_id,
    winner_position: w.winner_position,
  }));

  const { error: insertWinnersErr } = await adminClient
    .from("raffle_winners")
    .insert(winnersToInsert);

  if (insertWinnersErr) {
    console.error("Failed to insert raffle winners:", insertWinnersErr);
    return { success: false, error: "Failed to persist winner records." };
  }

  // 8. Update Raffle Status to DRAWN
  const now = new Date().toISOString();
  await adminClient
    .from("raffles")
    .update({
      status: "DRAWN",
      drawn_at: now,
      updated_at: now,
    })
    .eq("id", raffleId);

  // 9. Record Admin Audit Log for reproducibility
  await adminClient.from("admin_audit_logs").insert({
    admin_user_id: selectedWinners[0]?.user_id || raffle.id, // reference ID for system actions
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
