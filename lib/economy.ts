import { createSupabaseAdminClient } from "@/lib/supabase/admin";

/**
 * Process automatic 10 Points -> 1 Ticket conversion for a user.
 * Idempotent: Deducts 10 points per ticket issued and logs positive ticket transaction.
 */
export async function processPointToTicketConversion(userId: string) {
  const adminClient = createSupabaseAdminClient();

  // 1. Calculate current total points from ledger
  const { data: pointTxs } = await adminClient
    .from("point_transactions")
    .select("amount")
    .eq("user_id", userId);

  const totalPoints = (pointTxs || []).reduce(
    (sum, tx) => sum + (tx.amount || 0),
    0,
  );

  if (totalPoints < 10) {
    return { ticketsIssued: 0, currentPoints: totalPoints };
  }

  const ticketsToIssue = Math.floor(totalPoints / 10);
  const pointsToDeduct = ticketsToIssue * 10;

  // 2. Insert negative point_transaction for conversion
  const { error: pointTxErr } = await adminClient
    .from("point_transactions")
    .insert({
      user_id: userId,
      amount: -pointsToDeduct,
      type: "TICKET_CONVERSION",
      source: "POINT_CONVERSION",
      metadata: {
        tickets_issued: ticketsToIssue,
        converted_points: pointsToDeduct,
      },
    });

  if (pointTxErr) {
    console.error("Failed to insert point conversion deduction:", pointTxErr);
    return { ticketsIssued: 0, currentPoints: totalPoints };
  }

  // 3. Insert positive ticket_transaction
  const { error: ticketTxErr } = await adminClient
    .from("ticket_transactions")
    .insert({
      user_id: userId,
      amount: ticketsToIssue,
      type: "POINT_CONVERSION",
      source: "POINT_CONVERSION",
      metadata: {
        converted_points: pointsToDeduct,
      },
    });

  if (ticketTxErr) {
    console.error("Failed to insert ticket conversion credit:", ticketTxErr);
  }

  // 4. Update profile balances
  const { data: updatedPointTxs } = await adminClient
    .from("point_transactions")
    .select("amount")
    .eq("user_id", userId);

  const newPointsTotal = (updatedPointTxs || []).reduce(
    (sum, tx) => sum + (tx.amount || 0),
    0,
  );

  const { data: ticketTxs } = await adminClient
    .from("ticket_transactions")
    .select("amount")
    .eq("user_id", userId);

  const newTicketsTotal = (ticketTxs || []).reduce(
    (sum, tx) => sum + (tx.amount || 0),
    0,
  );

  await adminClient
    .from("profiles")
    .update({
      points_balance: newPointsTotal,
      ticket_balance: newTicketsTotal,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId);

  return { ticketsIssued: ticketsToIssue, currentPoints: newPointsTotal };
}

/**
 * Get or create unique referral code for user (format: CHIMP-XXXXXX).
 */
export async function getOrCreateReferralCode(userId: string): Promise<string> {
  const adminClient = createSupabaseAdminClient();

  const { data: existing } = await adminClient
    .from("referral_codes")
    .select("code")
    .eq("user_id", userId)
    .maybeSingle();

  if (existing?.code) {
    return existing.code;
  }

  const generateCode = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // readable alphanumerics
    let rand = "";
    for (let i = 0; i < 6; i++) {
      rand += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return `CHIMP-${rand}`;
  };

  let attempts = 0;
  while (attempts < 5) {
    attempts++;
    const candidateCode = generateCode();
    const { data: newCodeRecord, error } = await adminClient
      .from("referral_codes")
      .insert({
        user_id: userId,
        code: candidateCode,
      })
      .select("code")
      .maybeSingle();

    if (!error && newCodeRecord) {
      return newCodeRecord.code;
    }
  }

  // Fallback if random collision occurs multiple times
  const fallbackCode = `CHIMP-${userId.substring(0, 6).toUpperCase()}`;
  await adminClient.from("referral_codes").upsert(
    {
      user_id: userId,
      code: fallbackCode,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );

  return fallbackCode;
}

/**
 * Qualify a referral when the referred user completes a mission.
 * Enforces maximum 10 qualified referrals per referrer and anti-duplicate rewards.
 */
export async function processReferralQualification(referredUserId: string) {
  const adminClient = createSupabaseAdminClient();

  // 1. Check if user was referred (pending referral)
  const { data: referral } = await adminClient
    .from("referrals")
    .select("*")
    .eq("referred_user_id", referredUserId)
    .maybeSingle();

  if (!referral || referral.status !== "PENDING") {
    return;
  }

  // Anti-self referral check
  if (referral.referrer_user_id === referredUserId) {
    await adminClient
      .from("referrals")
      .update({ status: "REJECTED" })
      .eq("id", referral.id);
    return;
  }

  // 2. Count referrer's existing qualified/rewarded referrals
  const { data: existingQualified } = await adminClient
    .from("referrals")
    .select("id")
    .eq("referrer_user_id", referral.referrer_user_id)
    .in("status", ["QUALIFIED", "REWARDED"]);

  const qualifiedCount = existingQualified?.length || 0;

  // Max 10 qualified referrals per referrer
  if (qualifiedCount >= 10) {
    await adminClient
      .from("referrals")
      .update({
        status: "QUALIFIED",
        qualified_at: new Date().toISOString(),
      })
      .eq("id", referral.id);
    return;
  }

  // 3. Mark referral as REWARDED and issue +1 ticket transaction to referrer
  const now = new Date().toISOString();
  await adminClient
    .from("referrals")
    .update({
      status: "REWARDED",
      qualified_at: now,
      rewarded_at: now,
    })
    .eq("id", referral.id);

  // Issue +1 ticket transaction (ticket_transactions_one_referral_reward unique index prevents duplicates)
  const { error: ticketTxErr } = await adminClient
    .from("ticket_transactions")
    .insert({
      user_id: referral.referrer_user_id,
      amount: 1,
      type: "REFERRAL_REWARD",
      source: "REFERRAL_REWARD",
      referral_id: referral.id,
      metadata: {
        referred_user_id: referredUserId,
      },
    });

  if (ticketTxErr) {
    console.error("Failed to insert referral reward ticket transaction:", ticketTxErr);
  }

  // 4. Update referrer's profile ticket balance
  const { data: referrerTicketTxs } = await adminClient
    .from("ticket_transactions")
    .select("amount")
    .eq("user_id", referral.referrer_user_id);

  const newReferrerTickets = (referrerTicketTxs || []).reduce(
    (sum, tx) => sum + (tx.amount || 0),
    0,
  );

  await adminClient
    .from("profiles")
    .update({
      ticket_balance: newReferrerTickets,
      updated_at: now,
    })
    .eq("user_id", referral.referrer_user_id);
}
