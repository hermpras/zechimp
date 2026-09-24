"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  processPointToTicketConversion,
  processReferralQualification,
} from "@/lib/economy";

export type MissionActionResult = {
  success: boolean;
  error?: string;
  message?: string;
  pointsEarned?: number;
  totalPoints?: number;
  pendingApproval?: boolean;
};

export async function completeMissionAction(
  missionId: string,
  commentUrl?: string,
): Promise<MissionActionResult> {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "Unauthorized. Please log in first." };
    }

    const adminClient = createSupabaseAdminClient();

    // 1. Load mission
    const { data: mission, error: missionError } = await adminClient
      .from("missions")
      .select("*")
      .eq("id", missionId)
      .single();

    if (missionError || !mission || !mission.is_active) {
      return { success: false, error: "Mission is not active or does not exist." };
    }

    // 2. Load campaign if linked
    if (mission.campaign_id) {
      const { data: campaign } = await adminClient
        .from("campaigns")
        .select("status")
        .eq("id", mission.campaign_id)
        .single();

      if (campaign?.status !== "ACTIVE") {
        return { success: false, error: "The campaign for this mission is not active." };
      }
    }

    // 3. Check existing completion
    const { data: existingCompletion } = await adminClient
      .from("mission_completions")
      .select("id")
      .eq("user_id", user.id)
      .eq("mission_id", missionId)
      .maybeSingle();

    if (existingCompletion) {
      return { success: false, error: "Mission already completed." };
    }

    // 4. Handle COMMENT mission
    if (mission.type === "COMMENT") {
      if (!commentUrl || !commentUrl.trim()) {
        return {
          success: false,
          error: "X comment URL is required for COMMENT missions.",
        };
      }

      const xUrlPattern = /^https:\/\/(www\.)?(x|twitter)\.com\/.+/i;
      if (!xUrlPattern.test(commentUrl.trim())) {
        return {
          success: false,
          error:
            "Invalid X comment URL. URL must start with https://x.com/ or https://twitter.com/",
        };
      }

      if (!mission.campaign_id) {
        return {
          success: false,
          error: "COMMENT missions must belong to a valid campaign.",
        };
      }

      // Check existing comment proof
      const { data: existingProof } = await adminClient
        .from("comment_proofs")
        .select("id, status")
        .eq("user_id", user.id)
        .eq("mission_id", missionId)
        .maybeSingle();

      if (existingProof) {
        return {
          success: false,
          error: `Comment proof already submitted (Status: ${existingProof.status}).`,
        };
      }

      // Insert pending comment proof
      const { error: proofInsertErr } = await adminClient
        .from("comment_proofs")
        .insert({
          user_id: user.id,
          mission_id: mission.id,
          campaign_id: mission.campaign_id,
          comment_url: commentUrl.trim(),
          status: "PENDING",
        });

      if (proofInsertErr) {
        console.error("Failed to insert comment proof:", proofInsertErr);
        return {
          success: false,
          error: "Failed to submit comment proof. Please try again.",
        };
      }

      revalidatePath("/dashboard");
      return {
        success: true,
        message: "Comment proof submitted! Point reward pending approval.",
        pendingApproval: true,
      };
    }

    // 5. Handle FOLLOW & LIKE_REPOST missions (+5 POINTS)
    const rewardAmount = 5;

    // Record completion
    const { error: completionErr } = await adminClient
      .from("mission_completions")
      .insert({
        user_id: user.id,
        mission_id: mission.id,
        campaign_id: mission.campaign_id,
      });

    if (completionErr) {
      console.error("Failed to insert mission completion:", completionErr);
      return {
        success: false,
        error: "Failed to record completion. You may have already completed this mission.",
      };
    }

    // Insert point transaction (enforcing point_transactions_one_mission_reward constraint)
    const { error: txErr } = await adminClient
      .from("point_transactions")
      .insert({
        user_id: user.id,
        amount: rewardAmount,
        type: "MISSION_REWARD",
        source: `MISSION_COMPLETION:${mission.id}`,
        mission_id: mission.id,
        campaign_id: mission.campaign_id,
        metadata: {
          mission_type: mission.type,
          mission_title: mission.title,
        },
      });

    if (txErr) {
      console.error("Failed to record point transaction:", txErr);
    }

    // 6. Process Referral Qualification for the completing user
    await processReferralQualification(user.id);

    // 7. Process Automatic Point -> Ticket Conversion (10 pts = 1 ticket)
    const { currentPoints } = await processPointToTicketConversion(user.id);

    revalidatePath("/dashboard");

    return {
      success: true,
      message: `Mission completed! +${rewardAmount} points awarded.`,
      pointsEarned: rewardAmount,
      totalPoints: currentPoints,
    };
  } catch (err: unknown) {
    console.error("completeMissionAction error:", err);
    return {
      success: false,
      error: "An unexpected error occurred while completing mission.",
    };
  }
}

export async function reviewCommentProofAction(
  proofId: string,
  approve: boolean,
  reason?: string,
): Promise<MissionActionResult> {
  try {
    const adminClient = createSupabaseAdminClient();

    const { data: proof, error: proofErr } = await adminClient
      .from("comment_proofs")
      .select("*")
      .eq("id", proofId)
      .single();

    if (proofErr || !proof || proof.status !== "PENDING") {
      return {
        success: false,
        error: "Comment proof not found or not in PENDING status.",
      };
    }

    if (!approve) {
      await adminClient
        .from("comment_proofs")
        .update({
          status: "REJECTED",
          review_reason: reason || "Proof rejected by reviewer",
          reviewed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", proofId);

      revalidatePath("/dashboard");
      return { success: true, message: "Comment proof rejected." };
    }

    // Approve proof
    await adminClient
      .from("comment_proofs")
      .update({
        status: "APPROVED",
        review_reason: reason || "Approved",
        reviewed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", proofId);

    // Record mission completion
    await adminClient.from("mission_completions").insert({
      user_id: proof.user_id,
      mission_id: proof.mission_id,
      campaign_id: proof.campaign_id,
    });

    const rewardAmount = 5;

    // Record point transaction
    await adminClient.from("point_transactions").insert({
      user_id: proof.user_id,
      amount: rewardAmount,
      type: "MISSION_REWARD",
      source: `MISSION_COMPLETION:${proof.mission_id}`,
      mission_id: proof.mission_id,
      campaign_id: proof.campaign_id,
      metadata: {
        proof_id: proof.id,
        comment_url: proof.comment_url,
      },
    });

    // Process Referral Qualification for the user who submitted proof
    await processReferralQualification(proof.user_id);

    // Process Automatic Point -> Ticket Conversion
    const { currentPoints } = await processPointToTicketConversion(proof.user_id);

    revalidatePath("/dashboard");

    return {
      success: true,
      message: `Comment proof approved! +${rewardAmount} points awarded.`,
      pointsEarned: rewardAmount,
      totalPoints: currentPoints,
    };
  } catch (err: unknown) {
    console.error("reviewCommentProofAction error:", err);
    return {
      success: false,
      error: "An unexpected error occurred while reviewing comment proof.",
    };
  }
}
