import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export async function POST() {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json(
      { error: "Dev seed route is disabled in production." },
      { status: 403 },
    );
  }

  const adminClient = createSupabaseAdminClient();

  // 1. Check or insert active campaign
  const { data: existingCampaigns } = await adminClient
    .from("campaigns")
    .select("*")
    .eq("status", "ACTIVE")
    .limit(1);

  let campaignId: string;

  if (existingCampaigns && existingCampaigns.length > 0) {
    campaignId = existingCampaigns[0].id;
  } else {
    const { data: newCampaign, error: campaignError } = await adminClient
      .from("campaigns")
      .insert({
        title: "ZECHIMP Genesis Campaign",
        description:
          "Official Whitelist Campaign for the ZECHIMP Genesis NFT collection. Complete missions to earn points.",
        x_post_url: "https://x.com/zechimp/status/1880000000000000000",
        status: "ACTIVE",
      })
      .select()
      .single();

    if (campaignError || !newCampaign) {
      return NextResponse.json(
        { error: "Failed to create active campaign", details: campaignError },
        { status: 500 },
      );
    }
    campaignId = newCampaign.id;
  }

  // 2. Ensure permanent FOLLOW mission
  const { data: existingFollow } = await adminClient
    .from("missions")
    .select("id")
    .eq("type", "FOLLOW")
    .eq("is_permanent", true)
    .maybeSingle();

  if (!existingFollow) {
    await adminClient.from("missions").insert({
      campaign_id: null,
      type: "FOLLOW",
      title: "Follow @ZECHIMP on X",
      description: "Follow the official @ZECHIMP account on X to stay updated.",
      reward_points: 5,
      target_url: "https://x.com/zechimp",
      is_permanent: true,
      is_active: true,
    });
  }

  // 3. Ensure LIKE_REPOST mission for campaign
  const { data: existingLikeRepost } = await adminClient
    .from("missions")
    .select("id")
    .eq("campaign_id", campaignId)
    .eq("type", "LIKE_REPOST")
    .maybeSingle();

  if (!existingLikeRepost) {
    await adminClient.from("missions").insert({
      campaign_id: campaignId,
      type: "LIKE_REPOST",
      title: "Like & Repost Genesis Announcement",
      description:
        "Like and repost the official ZECHIMP Genesis Announcement post on X.",
      reward_points: 5,
      target_url: "https://x.com/zechimp/status/1880000000000000000",
      is_permanent: false,
      is_active: true,
    });
  }

  // 4. Ensure COMMENT mission for campaign
  const { data: existingComment } = await adminClient
    .from("missions")
    .select("id")
    .eq("campaign_id", campaignId)
    .eq("type", "COMMENT")
    .maybeSingle();

  if (!existingComment) {
    await adminClient.from("missions").insert({
      campaign_id: campaignId,
      type: "COMMENT",
      title: "Comment on Genesis Announcement",
      description:
        "Leave a comment on the announcement post and submit your comment URL for verification.",
      reward_points: 5,
      target_url: "https://x.com/zechimp/status/1880000000000000000",
      is_permanent: false,
      is_active: true,
    });
  }

  return NextResponse.json({
    message: "Development data seeded successfully",
    campaignId,
  });
}
