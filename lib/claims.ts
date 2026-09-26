import { createSupabaseAdminClient } from "@/lib/supabase/admin";

import type { WlClaimRow } from "@/database/types";

/**
 * Validates EVM public wallet address format.
 */
export function validateEvmWalletAddress(address: string): {
  valid: boolean;
  error?: string;
  normalizedAddress?: string;
} {
  if (!address || typeof address !== "string") {
    return { valid: false, error: "Wallet address is required." };
  }

  const trimmed = address.trim();

  if (!trimmed) {
    return { valid: false, error: "Wallet address cannot be empty." };
  }

  const evmRegex = /^0x[a-fA-F0-9]{40}$/;

  if (!evmRegex.test(trimmed)) {
    return {
      valid: false,
      error:
        "Invalid EVM wallet address. Must start with 0x followed by 40 hexadecimal characters.",
    };
  }

  return {
    valid: true,
    normalizedAddress: trimmed,
  };
}

export type WinnerClaimData = {
  winnerId: string;
  winnerPosition: number;
  claim: WlClaimRow;
};

/**
 * Retrieves or initializes the wallet claim record for a raffle winner.
 *
 * Claim lifecycle:
 *
 * CLAIMABLE -> CLAIMED
 * CLAIMABLE -> EXPIRED
 *
 * A wallet is considered locked once CLAIMED.
 */
export async function getOrCreateWinnerClaim(
  userId: string,
  raffleId: string,
): Promise<WinnerClaimData | null> {
  const adminClient = createSupabaseAdminClient();

  // Find winner record for this user and raffle.
  const { data: winner, error: winnerError } = await adminClient
    .from("raffle_winners")
    .select("id, winner_position")
    .eq("raffle_id", raffleId)
    .eq("user_id", userId)
    .maybeSingle();

  if (winnerError) {
    console.error("Failed to fetch raffle winner:", winnerError);
    throw new Error("Failed to load raffle winner.");
  }

  if (!winner) {
    return null;
  }

  // Look for an existing wallet claim.
  const { data: existingClaim, error: claimError } = await adminClient
    .from("wl_claims")
    .select("*")
    .eq("raffle_winner_id", winner.id)
    .maybeSingle();

  if (claimError) {
    console.error("Failed to fetch wl_claim:", claimError);
    throw new Error("Failed to load WL claim.");
  }

  if (existingClaim) {
    return {
      winnerId: winner.id,
      winnerPosition: winner.winner_position,
      claim: existingClaim as WlClaimRow,
    };
  }

  // Initialize a new claim as CLAIMABLE.
  //
  // The winner has been selected and is eligible to claim,
  // but no wallet address has been locked yet.
  const { data: newClaim, error: insertError } = await adminClient
    .from("wl_claims")
    .insert({
      raffle_winner_id: winner.id,
      user_id: userId,
      raffle_id: raffleId,
      wallet_address: null,
      wallet_chain: "EVM",
      status: "CLAIMABLE",
    })
    .select("*")
    .single();

  if (insertError || !newClaim) {
    console.error("Failed to create wl_claim record:", insertError);
    throw new Error("Failed to initialize WL claim record.");
  }

  return {
    winnerId: winner.id,
    winnerPosition: winner.winner_position,
    claim: newClaim as WlClaimRow,
  };
}
