import { redirect } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { LogoutButton } from "@/app/components/auth-button";
import { CampaignSection } from "@/app/components/campaign-section";
import type { Database } from "@/database/types";

type XAccountRow = Database["public"]["Tables"]["x_accounts"]["Row"];
type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];
type CampaignRow = Database["public"]["Tables"]["campaigns"]["Row"];
type MissionRow = Database["public"]["Tables"]["missions"]["Row"];
type CommentProofRow = Database["public"]["Tables"]["comment_proofs"]["Row"];

export default async function DashboardPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/");
  }

  const adminClient = createSupabaseAdminClient();

  // 1. Fetch X Account data
  const { data: xAccountData } = await supabase
    .from("x_accounts")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  const xAccount = xAccountData as XAccountRow | null;

  // 2. Fetch Profile data
  const { data: profileData } = await supabase
    .from("profiles")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  const profile = profileData as ProfileRow | null;

  // 3. Fetch Active Campaign
  const { data: campaignData } = await adminClient
    .from("campaigns")
    .select("*")
    .eq("status", "ACTIVE")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const campaign = campaignData as CampaignRow | null;

  // 4. Fetch Active Missions for Active Campaign + Permanent Follow Missions
  let missions: MissionRow[] = [];

  if (campaign) {
    const { data: campaignMissions } = await adminClient
      .from("missions")
      .select("*")
      .eq("is_active", true)
      .or(`campaign_id.eq.${campaign.id},is_permanent.eq.true`)
      .order("created_at", { ascending: true });

    missions = (campaignMissions || []) as MissionRow[];
  } else {
    const { data: permanentMissions } = await adminClient
      .from("missions")
      .select("*")
      .eq("is_active", true)
      .eq("is_permanent", true)
      .order("created_at", { ascending: true });

    missions = (permanentMissions || []) as MissionRow[];
  }

  // 5. Fetch User's Mission Completions
  const { data: userCompletions } = await adminClient
    .from("mission_completions")
    .select("mission_id")
    .eq("user_id", user.id);

  const completedMissionIds = (userCompletions || []).map((c) => c.mission_id);

  // 6. Fetch User's Comment Proofs
  const { data: userProofsData } = await adminClient
    .from("comment_proofs")
    .select("*")
    .eq("user_id", user.id);

  const commentProofs = (userProofsData || []) as CommentProofRow[];

  // 7. Calculate Total Points from point_transactions ledger
  const { data: userTxs } = await adminClient
    .from("point_transactions")
    .select("amount")
    .eq("user_id", user.id);

  const pointsBalance = (userTxs || []).reduce(
    (sum, tx) => sum + (tx.amount || 0),
    0,
  );

  const username = xAccount?.username || profile?.username || "unknown";
  const displayName =
    xAccount?.display_name || profile?.display_name || username;
  const avatarUrl = xAccount?.avatar_url || profile?.avatar_url || null;
  const xUserId = xAccount?.x_user_id || "N/A";

  return (
    <main className="min-h-screen px-6 py-8 sm:px-10">
      <section className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-5xl flex-col gap-10">
        {/* Navigation Header */}
        <div className="flex items-center justify-between border-b border-[var(--border)] pb-5">
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="text-sm font-black tracking-[0.28em] text-[var(--accent)] hover:opacity-80"
            >
              ZECHIMP
            </Link>
            <span className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--muted)]">
              / Dashboard
            </span>
          </div>
          <LogoutButton />
        </div>

        {/* Identity Bar */}
        <div className="border border-[var(--border)] bg-[var(--background-raised)] p-6">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-5">
              {avatarUrl ? (
                <Image
                  src={avatarUrl}
                  alt={displayName}
                  width={56}
                  height={56}
                  className="h-14 w-14 border border-[var(--border)] object-cover"
                  unoptimized
                />
              ) : (
                <div className="flex h-14 w-14 items-center justify-center border border-[var(--accent)] bg-[#121212] text-lg font-black text-[var(--accent)]">
                  {displayName.substring(0, 2).toUpperCase()}
                </div>
              )}
              <div>
                <h2 className="text-xl font-black text-[var(--foreground)]">
                  {displayName}
                </h2>
                <p className="text-xs font-bold text-[var(--accent)]">
                  @{username}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="border border-[var(--border)] bg-[#121212] px-3.5 py-1.5 font-mono text-xs text-[var(--muted)]">
                X ID: <span className="text-[var(--foreground)] font-bold">{xUserId}</span>
              </div>
              <div className="border border-[var(--accent)] bg-[rgba(183,255,0,0.1)] px-3.5 py-1.5 text-xs font-black uppercase tracking-[0.18em] text-[var(--accent)]">
                {pointsBalance} PTS
              </div>
            </div>
          </div>
        </div>

        {/* Campaign & Missions Section */}
        <CampaignSection
          campaign={campaign}
          missions={missions}
          completedMissionIds={completedMissionIds}
          commentProofs={commentProofs}
          pointsBalance={pointsBalance}
        />
      </section>
    </main>
  );
}
