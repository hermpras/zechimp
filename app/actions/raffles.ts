"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { executeDeterministicDraw, type DrawResult } from "@/lib/draw";

export type RaffleActionResult = {
  success: boolean;
  error?: string;
  message?: string;
  drawResult?: DrawResult;
};

/**
 * Join an OPEN raffle with N tickets.
 * Deducts tickets from ticket_transactions ledger and creates individual raffle_entries.
 */
export async function joinRaffleAction(
  raffleId: string,
  ticketAmount: number,
  accessCode?: string,
): Promise<RaffleActionResult> {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "Unauthorized. Please log in first." };
    }

    if (!Number.isInteger(ticketAmount) || ticketAmount <= 0) {
      return { success: false, error: "Please enter a valid positive number of tickets." };
    }

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

    if (raffle.status !== "OPEN") {
      return {
        success: false,
        error: `Raffle is not open for entries (Current status: ${raffle.status}).`,
      };
    }

    // 2. Access Code Validation
    if (raffle.access_code && raffle.access_code.trim()) {
      if (!accessCode || accessCode.trim().toUpperCase() !== raffle.access_code.trim().toUpperCase()) {
        return { success: false, error: "Invalid access code for this raffle." };
      }
    }

    // 3. Ticket Balance Validation
    const { data: userTicketTxs } = await adminClient
      .from("ticket_transactions")
      .select("amount")
      .eq("user_id", user.id);

    const availableTickets = (userTicketTxs || []).reduce(
      (sum, tx) => sum + (tx.amount || 0),
      0,
    );

    if (availableTickets < ticketAmount) {
      return {
        success: false,
        error: `Insufficient tickets. You have ${availableTickets} tickets available, but tried to commit ${ticketAmount}.`,
      };
    }

    // 4. Count existing user entries in this raffle
    const { data: existingEntries } = await adminClient
      .from("raffle_entries")
      .select("id")
      .eq("raffle_id", raffleId)
      .eq("user_id", user.id);

    const existingCount = existingEntries?.length || 0;

    // 5. Insert Ticket Deduction Transaction
    const { data: txRecord, error: txErr } = await adminClient
      .from("ticket_transactions")
      .insert({
        user_id: user.id,
        amount: -ticketAmount,
        type: "RAFFLE_ENTRY",
        source: "RAFFLE_ENTRY",
        raffle_id: raffleId,
        metadata: {
          tickets_committed: ticketAmount,
          raffle_title: raffle.title,
        },
      })
      .select("id")
      .single();

    if (txErr || !txRecord) {
      console.error("Failed to record raffle entry ticket deduction:", txErr);
      return { success: false, error: "Failed to deduct tickets for raffle entry." };
    }

    // 6. Create Individual Raffle Entries
    const entriesToInsert = [];
    for (let i = 1; i <= ticketAmount; i++) {
      entriesToInsert.push({
        raffle_id: raffleId,
        user_id: user.id,
        entry_index: existingCount + i,
        source_ticket_transaction_id: txRecord.id,
      });
    }

    const { error: insertEntriesErr } = await adminClient
      .from("raffle_entries")
      .insert(entriesToInsert);

    if (insertEntriesErr) {
      console.error("Failed to insert raffle entries:", insertEntriesErr);
      return { success: false, error: "Failed to create raffle entries." };
    }

    // 7. Update User Profile Ticket Balance
    const { data: updatedTicketTxs } = await adminClient
      .from("ticket_transactions")
      .select("amount")
      .eq("user_id", user.id);

    const newTicketTotal = (updatedTicketTxs || []).reduce(
      (sum, tx) => sum + (tx.amount || 0),
      0,
    );

    await adminClient
      .from("profiles")
      .update({
        ticket_balance: newTicketTotal,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", user.id);

    revalidatePath("/dashboard");

    return {
      success: true,
      message: `Successfully committed ${ticketAmount} ticket${ticketAmount > 1 ? "s" : ""} to ${raffle.title}!`,
    };
  } catch (err: unknown) {
    console.error("joinRaffleAction error:", err);
    return {
      success: false,
      error: "An unexpected error occurred while joining the raffle.",
    };
  }
}

/**
 * Transition raffle status from OPEN to CLOSED (Freezes entries).
 */
export async function closeRaffleAction(
  raffleId: string,
): Promise<RaffleActionResult> {
  try {
    const adminClient = createSupabaseAdminClient();

    const { data: raffle, error: raffleErr } = await adminClient
      .from("raffles")
      .select("status, title")
      .eq("id", raffleId)
      .single();

    if (raffleErr || !raffle) {
      return { success: false, error: "Raffle not found." };
    }

    if (raffle.status !== "OPEN") {
      return {
        success: false,
        error: `Only OPEN raffles can be closed (Current status: ${raffle.status}).`,
      };
    }

    const now = new Date().toISOString();
    await adminClient
      .from("raffles")
      .update({
        status: "CLOSED",
        closed_at: now,
        updated_at: now,
      })
      .eq("id", raffleId);

    revalidatePath("/dashboard");

    return {
      success: true,
      message: `Raffle "${raffle.title}" has been CLOSED. Entries are now frozen!`,
    };
  } catch (err: unknown) {
    console.error("closeRaffleAction error:", err);
    return { success: false, error: "Failed to close raffle." };
  }
}

/**
 * Transition raffle status from CLOSED to DRAWN and select unique winners using deterministic PRNG.
 */
export async function drawRaffleAction(
  raffleId: string,
  secretSeed?: string,
): Promise<RaffleActionResult> {
  try {
    const drawRes = await executeDeterministicDraw(raffleId, secretSeed);

    if (!drawRes.success) {
      return { success: false, error: drawRes.error || "Draw execution failed." };
    }

    revalidatePath("/dashboard");

    return {
      success: true,
      message: `Raffle draw completed! ${drawRes.winnersCount} unique winning users selected for ${drawRes.wlSpots} WL spots.`,
      drawResult: drawRes,
    };
  } catch (err: unknown) {
    console.error("drawRaffleAction error:", err);
    return { success: false, error: "Failed to execute raffle draw." };
  }
}
