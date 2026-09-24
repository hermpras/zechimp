"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { verifyAdmin, logAdminAction } from "@/lib/admin";
import { executeDeterministicDraw } from "@/lib/draw";
import { processPointToTicketConversion, processReferralQualification } from "@/lib/economy";
import type { Database } from "@/database/types";

export type AdminActionResult = {
  success: boolean;
  error?: string;
  message?: string;
};

// ==========================================
// CAMPAIGN MANAGEMENT ACTIONS
// ==========================================

export async function createCampaignAdminAction(
  title: string,
  description: string,
  xPostUrl: string,
  status: Database["public"]["Tables"]["campaigns"]["Row"]["status"],
): Promise<AdminActionResult> {
  const { isAuthorized, userId } = await verifyAdmin();
  if (!isAuthorized || !userId) {
    return { success: false, error: "Unauthorized: Admin access required." };
  }

  if (!title || !title.trim()) {
    return { success: false, error: "Campaign title is required." };
  }

  const xUrlPattern = /^https:\/\/(www\.)?(x|twitter)\.com\/.+/i;
  if (!xPostUrl || !xUrlPattern.test(xPostUrl.trim())) {
    return { success: false, error: "Valid X post URL is required (https://x.com/...)." };
  }

  const adminClient = createSupabaseAdminClient();
  const { data: newCampaign, error } = await adminClient
    .from("campaigns")
    .insert({
      title: title.trim(),
      description: description.trim() || null,
      x_post_url: xPostUrl.trim(),
      status,
    })
    .select("id")
    .single();

  if (error || !newCampaign) {
    console.error("Failed to create campaign:", error);
    return { success: false, error: "Failed to create campaign in database." };
  }

  await logAdminAction(userId, "CAMPAIGN_CREATED", "campaign", newCampaign.id, {
    title,
    status,
  });

  revalidatePath("/admin/campaigns");
  revalidatePath("/dashboard");

  return { success: true, message: `Campaign "${title}" created successfully!` };
}

export async function updateCampaignAdminAction(
  id: string,
  title: string,
  description: string,
  xPostUrl: string,
  status: Database["public"]["Tables"]["campaigns"]["Row"]["status"],
): Promise<AdminActionResult> {
  const { isAuthorized, userId } = await verifyAdmin();
  if (!isAuthorized || !userId) {
    return { success: false, error: "Unauthorized: Admin access required." };
  }

  if (!title || !title.trim()) {
    return { success: false, error: "Campaign title is required." };
  }

  const xUrlPattern = /^https:\/\/(www\.)?(x|twitter)\.com\/.+/i;
  if (!xPostUrl || !xUrlPattern.test(xPostUrl.trim())) {
    return { success: false, error: "Valid X post URL is required (https://x.com/...)." };
  }

  const adminClient = createSupabaseAdminClient();
  const { error } = await adminClient
    .from("campaigns")
    .update({
      title: title.trim(),
      description: description.trim() || null,
      x_post_url: xPostUrl.trim(),
      status,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) {
    console.error("Failed to update campaign:", error);
    return { success: false, error: "Failed to update campaign in database." };
  }

  await logAdminAction(userId, "CAMPAIGN_UPDATED", "campaign", id, {
    title,
    status,
  });

  revalidatePath("/admin/campaigns");
  revalidatePath("/dashboard");

  return { success: true, message: `Campaign "${title}" updated successfully!` };
}

export async function toggleCampaignAdminAction(
  id: string,
  status: Database["public"]["Tables"]["campaigns"]["Row"]["status"],
): Promise<AdminActionResult> {
  const { isAuthorized, userId } = await verifyAdmin();
  if (!isAuthorized || !userId) {
    return { success: false, error: "Unauthorized: Admin access required." };
  }

  const adminClient = createSupabaseAdminClient();
  const { error } = await adminClient
    .from("campaigns")
    .update({
      status,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) {
    return { success: false, error: "Failed to update campaign status." };
  }

  await logAdminAction(userId, "CAMPAIGN_STATUS_TOGGLED", "campaign", id, { status });

  revalidatePath("/admin/campaigns");
  revalidatePath("/dashboard");

  return { success: true, message: `Campaign status changed to ${status}.` };
}

// ==========================================
// MISSION MANAGEMENT ACTIONS
// ==========================================

export async function createMissionAdminAction(
  campaignId: string | null,
  type: Database["public"]["Tables"]["missions"]["Row"]["type"],
  title: string,
  description: string,
  rewardPoints: number,
  targetUrl: string,
  isPermanent: boolean,
  isActive: boolean,
): Promise<AdminActionResult> {
  const { isAuthorized, userId } = await verifyAdmin();
  if (!isAuthorized || !userId) {
    return { success: false, error: "Unauthorized: Admin access required." };
  }

  if (!title || !title.trim()) {
    return { success: false, error: "Mission title is required." };
  }

  // Validate permanent vs campaign mission constraints
  if (type === "FOLLOW" && isPermanent && campaignId) {
    return { success: false, error: "Permanent FOLLOW missions must have null campaign_id." };
  }
  if (type !== "FOLLOW" && (isPermanent || !campaignId)) {
    return { success: false, error: "Non-FOLLOW missions must belong to a campaign and have isPermanent = false." };
  }

  const adminClient = createSupabaseAdminClient();
  const { data: newMission, error } = await adminClient
    .from("missions")
    .insert({
      campaign_id: campaignId || null,
      type,
      title: title.trim(),
      description: description.trim() || null,
      reward_points: 5, // Rule: Exactly 5 points
      target_url: targetUrl.trim() || null,
      is_permanent: isPermanent,
      is_active: isActive,
    })
    .select("id")
    .single();

  if (error || !newMission) {
    console.error("Failed to create mission:", error);
    return { success: false, error: "Failed to create mission in database." };
  }

  await logAdminAction(userId, "MISSION_CREATED", "mission", newMission.id, {
    title,
    type,
    campaignId,
  });

  revalidatePath("/admin/missions");
  revalidatePath("/dashboard");

  return { success: true, message: `Mission "${title}" created successfully!` };
}

export async function updateMissionAdminAction(
  id: string,
  title: string,
  description: string,
  targetUrl: string,
  isActive: boolean,
): Promise<AdminActionResult> {
  const { isAuthorized, userId } = await verifyAdmin();
  if (!isAuthorized || !userId) {
    return { success: false, error: "Unauthorized: Admin access required." };
  }

  if (!title || !title.trim()) {
    return { success: false, error: "Mission title is required." };
  }

  const adminClient = createSupabaseAdminClient();
  const { error } = await adminClient
    .from("missions")
    .update({
      title: title.trim(),
      description: description.trim() || null,
      target_url: targetUrl.trim() || null,
      is_active: isActive,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) {
    console.error("Failed to update mission:", error);
    return { success: false, error: "Failed to update mission in database." };
  }

  await logAdminAction(userId, "MISSION_UPDATED", "mission", id, { title, isActive });

  revalidatePath("/admin/missions");
  revalidatePath("/dashboard");

  return { success: true, message: `Mission "${title}" updated successfully!` };
}

export async function toggleMissionAdminAction(
  id: string,
  isActive: boolean,
): Promise<AdminActionResult> {
  const { isAuthorized, userId } = await verifyAdmin();
  if (!isAuthorized || !userId) {
    return { success: false, error: "Unauthorized: Admin access required." };
  }

  const adminClient = createSupabaseAdminClient();
  const { error } = await adminClient
    .from("missions")
    .update({
      is_active: isActive,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) {
    return { success: false, error: "Failed to update mission status." };
  }

  await logAdminAction(userId, "MISSION_TOGGLED", "mission", id, { isActive });

  revalidatePath("/admin/missions");
  revalidatePath("/dashboard");

  return { success: true, message: `Mission active state set to ${isActive}.` };
}

// ==========================================
// RAFFLE MANAGEMENT & DRAW ACTIONS
// ==========================================

export async function createRaffleAdminAction(
  title: string,
  description: string,
  accessCode: string,
  wlSpots: number,
  status: Database["public"]["Tables"]["raffles"]["Row"]["status"],
): Promise<AdminActionResult> {
  const { isAuthorized, userId } = await verifyAdmin();
  if (!isAuthorized || !userId) {
    return { success: false, error: "Unauthorized: Admin access required." };
  }

  if (!title || !title.trim()) {
    return { success: false, error: "Raffle title is required." };
  }
  if (!accessCode || !accessCode.trim()) {
    return { success: false, error: "Raffle access code is required." };
  }

  const accessCodePattern = /^[A-Z0-9][A-Z0-9_-]{3,63}$/;
  if (!accessCodePattern.test(accessCode.trim().toUpperCase())) {
    return {
      success: false,
      error: "Access code must be 4-64 alphanumeric characters (A-Z, 0-9, _, -).",
    };
  }

  if (!Number.isInteger(wlSpots) || wlSpots <= 0) {
    return { success: false, error: "WL spots must be a positive integer." };
  }

  const adminClient = createSupabaseAdminClient();
  const { data: newRaffle, error } = await adminClient
    .from("raffles")
    .insert({
      title: title.trim(),
      description: description.trim() || null,
      access_code: accessCode.trim().toUpperCase(),
      wl_spots: wlSpots,
      status: status || "OPEN",
    })
    .select("id")
    .single();

  if (error || !newRaffle) {
    console.error("Failed to create raffle:", error);
    return { success: false, error: "Failed to create raffle in database." };
  }

  await logAdminAction(userId, "RAFFLE_CREATED", "raffle", newRaffle.id, {
    title,
    accessCode,
    wlSpots,
    status,
  });

  revalidatePath("/admin/raffles");
  revalidatePath("/dashboard");

  return { success: true, message: `Raffle "${title}" created successfully!` };
}

export async function updateRaffleAdminAction(
  id: string,
  title: string,
  description: string,
  accessCode: string,
  wlSpots: number,
): Promise<AdminActionResult> {
  const { isAuthorized, userId } = await verifyAdmin();
  if (!isAuthorized || !userId) {
    return { success: false, error: "Unauthorized: Admin access required." };
  }

  const adminClient = createSupabaseAdminClient();
  const { data: raffle } = await adminClient
    .from("raffles")
    .select("status")
    .eq("id", id)
    .single();

  if (!raffle || raffle.status === "CLOSED" || raffle.status === "DRAWN") {
    return { success: false, error: "CLOSED or DRAWN raffles cannot be edited." };
  }

  const { error } = await adminClient
    .from("raffles")
    .update({
      title: title.trim(),
      description: description.trim() || null,
      access_code: accessCode.trim().toUpperCase(),
      wl_spots: wlSpots,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) {
    return { success: false, error: "Failed to update raffle." };
  }

  await logAdminAction(userId, "RAFFLE_UPDATED", "raffle", id, { title, wlSpots });

  revalidatePath("/admin/raffles");
  revalidatePath("/dashboard");

  return { success: true, message: `Raffle "${title}" updated successfully!` };
}

export async function closeRaffleAdminAction(
  id: string,
): Promise<AdminActionResult> {
  const { isAuthorized, userId } = await verifyAdmin();
  if (!isAuthorized || !userId) {
    return { success: false, error: "Unauthorized: Admin access required." };
  }

  const adminClient = createSupabaseAdminClient();
  const { data: raffle } = await adminClient
    .from("raffles")
    .select("status, title")
    .eq("id", id)
    .single();

  if (!raffle) {
    return { success: false, error: "Raffle not found." };
  }

  if (raffle.status !== "OPEN") {
    return {
      success: false,
      error: `Only OPEN raffles can be closed (Current status: ${raffle.status}).`,
    };
  }

  const now = new Date().toISOString();
  const { error } = await adminClient
    .from("raffles")
    .update({
      status: "CLOSED",
      closed_at: now,
      updated_at: now,
    })
    .eq("id", id);

  if (error) {
    return { success: false, error: "Failed to close raffle." };
  }

  await logAdminAction(userId, "RAFFLE_CLOSED", "raffle", id, {
    title: raffle.title,
    closed_at: now,
  });

  revalidatePath("/admin/raffles");
  revalidatePath("/dashboard");

  return {
    success: true,
    message: `Raffle "${raffle.title}" is now CLOSED and entries are frozen.`,
  };
}

export async function drawRaffleAdminAction(
  id: string,
  secretSeed?: string,
): Promise<AdminActionResult> {
  const { isAuthorized, userId } = await verifyAdmin();
  if (!isAuthorized || !userId) {
    return { success: false, error: "Unauthorized: Admin access required." };
  }

  const drawRes = await executeDeterministicDraw(id, secretSeed);

  if (!drawRes.success) {
    return { success: false, error: drawRes.error || "Draw failed." };
  }

  await logAdminAction(userId, "RAFFLE_DRAW_EXECUTED", "raffle", id, {
    winnersCount: drawRes.winnersCount,
    snapshotHash: drawRes.snapshotHash,
    seedHash: drawRes.seedHash,
  });

  revalidatePath("/admin/raffles");
  revalidatePath("/dashboard");
  revalidatePath(`/draw-verification/${id}`);

  return {
    success: true,
    message: `Draw executed! ${drawRes.winnersCount} unique winners selected for ${drawRes.wlSpots} WL spots.`,
  };
}

// ==========================================
// COMMENT PROOF REVIEW ACTION
// ==========================================

export async function reviewCommentProofAdminAction(
  proofId: string,
  approve: boolean,
  reason?: string,
): Promise<AdminActionResult> {
  const { isAuthorized, userId } = await verifyAdmin();
  if (!isAuthorized || !userId) {
    return { success: false, error: "Unauthorized: Admin access required." };
  }

  const adminClient = createSupabaseAdminClient();
  const { data: proof } = await adminClient
    .from("comment_proofs")
    .select("*")
    .eq("id", proofId)
    .single();

  if (!proof || proof.status !== "PENDING") {
    return { success: false, error: "Comment proof not found or not PENDING." };
  }

  const now = new Date().toISOString();

  if (!approve) {
    await adminClient
      .from("comment_proofs")
      .update({
        status: "REJECTED",
        reviewed_by: userId,
        reviewed_at: now,
        review_reason: reason || "Rejected by admin",
        updated_at: now,
      })
      .eq("id", proofId);

    await logAdminAction(userId, "COMMENT_PROOF_REJECTED", "comment_proof", proofId, {
      user_id: proof.user_id,
      reason,
    });

    revalidatePath("/admin/missions");
    revalidatePath("/dashboard");
    return { success: true, message: "Comment proof rejected." };
  }

  // Approve
  await adminClient
    .from("comment_proofs")
    .update({
      status: "APPROVED",
      reviewed_by: userId,
      reviewed_at: now,
      review_reason: reason || "Approved by admin",
      updated_at: now,
    })
    .eq("id", proofId);

  // Insert mission completion
  await adminClient.from("mission_completions").insert({
    user_id: proof.user_id,
    mission_id: proof.mission_id,
    campaign_id: proof.campaign_id,
  });

  // Award +5 points
  await adminClient.from("point_transactions").insert({
    user_id: proof.user_id,
    amount: 5,
    type: "MISSION_REWARD",
    source: `MISSION_COMPLETION:${proof.mission_id}`,
    mission_id: proof.mission_id,
    campaign_id: proof.campaign_id,
    metadata: {
      proof_id: proof.id,
      reviewed_by: userId,
    },
  });

  // Trigger referral qualification and point-to-ticket conversion
  await processReferralQualification(proof.user_id);
  await processPointToTicketConversion(proof.user_id);

  await logAdminAction(userId, "COMMENT_PROOF_APPROVED", "comment_proof", proofId, {
    user_id: proof.user_id,
  });

  revalidatePath("/admin/missions");
  revalidatePath("/dashboard");

  return { success: true, message: "Comment proof approved and +5 points awarded!" };
}
