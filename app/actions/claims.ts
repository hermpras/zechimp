"use server";

import { revalidatePath } from "next/cache";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { validateEvmWalletAddress } from "@/lib/claims";

import type { WlClaimRow } from "@/database/types";

export type ClaimWalletResult = {
  success: boolean;
  error?: string;
  message?: string;
  claim?: WlClaimRow;
};

/**
 * Server action for a raffle winner to claim their WL spot
 * by locking in a wallet address.
 */
export async function claimWalletAction(
  raffleWinnerId: string,
  walletAddress: string,
): Promise<ClaimWalletResult> {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      success: false,
      error: "Unauthorized: Please sign in.",
    };
  }

  if (!raffleWinnerId) {
    return {
      success: false,
      error: "Winner record ID is required.",
    };
  }

  // 1. Validate EVM wallet address
  const validation = validateEvmWalletAddress(walletAddress);

  if (!validation.valid || !validation.normalizedAddress) {
    return {
      success: false,
      error: validation.error || "Invalid wallet address.",
    };
  }

  const normalizedAddress = validation.normalizedAddress;
  const adminClient = createSupabaseAdminClient();

  // 2. Fetch winner record and verify user ownership
  const { data: winner } = await adminClient
    .from("raffle_winners")
    .select("*")
    .eq("id", raffleWinnerId)
    .single();

  if (!winner) {
    return {
      success: false,
      error: "Winner record not found.",
    };
  }

  if (winner.user_id !== user.id) {
    return {
      success: false,
      error: "Unauthorized: Winner record does not belong to your user.",
    };
  }

  // 3. Fetch existing claim record
  const { data: claim } = await adminClient
    .from("wl_claims")
    .select("*")
    .eq("raffle_winner_id", winner.id)
    .maybeSingle();

  // 4. Already claimed = locked permanently
  if (claim && claim.status === "CLAIMED") {
    return {
      success: true,
      message: "WL allocation already claimed and locked.",
      claim: claim as WlClaimRow,
    };
  }

  // 5. Already expired
  if (claim && claim.status === "EXPIRED") {
    return {
      success: false,
      error: "The claim deadline for this raffle allocation has expired.",
    };
  }

  // 6. Check claim deadline
  if (claim && claim.claim_deadline) {
    const now = new Date();
    const deadline = new Date(claim.claim_deadline);

    if (now > deadline) {
      await adminClient
        .from("wl_claims")
        .update({
          status: "EXPIRED",
          updated_at: now.toISOString(),
        })
        .eq("id", claim.id);

      return {
        success: false,
        error: "The claim deadline for this raffle allocation has expired.",
      };
    }
  }

  const now = new Date().toISOString();

  // 7. Update existing CLAIMABLE record
  if (claim) {
    const { data: updated, error } = await adminClient
      .from("wl_claims")
      .update({
        wallet_address: normalizedAddress,
        wallet_chain: "EVM",
        status: "CLAIMED",
        claimed_at: now,
        updated_at: now,
      })
      .eq("id", claim.id)
      .select("*")
      .single();

    if (error || !updated) {
      console.error("Failed to update claim:", error);

      return {
        success: false,
        error: "Failed to lock wallet address in database.",
      };
    }

    revalidatePath("/dashboard");

    return {
      success: true,
      message: "Wallet address successfully locked for your WL spot!",
      claim: updated as WlClaimRow,
    };
  }

  // 8. Fallback: create claim if one does not exist
  const { data: inserted, error } = await adminClient
    .from("wl_claims")
    .insert({
      raffle_winner_id: winner.id,
      user_id: user.id,
      raffle_id: winner.raffle_id,
      wallet_address: normalizedAddress,
      wallet_chain: "EVM",
      status: "CLAIMED",
      claimed_at: now,
    })
    .select("*")
    .single();

  if (error || !inserted) {
    console.error("Failed to insert claim:", error);

    return {
      success: false,
      error: "Failed to lock wallet address in database.",
    };
  }

  revalidatePath("/dashboard");

  return {
    success: true,
    message: "Wallet address successfully locked for your WL spot!",
    claim: inserted as WlClaimRow,
  };
}
