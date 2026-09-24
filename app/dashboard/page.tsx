import { redirect } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { LogoutButton } from "@/app/components/auth-button";
import { CampaignSection } from "@/app/components/campaign-section";
import { ReferralCard } from "@/app/components/referral-card";
import { RaffleCard, type WinnerInfo } from "@/app/components/raffle-card";
import { getOrCreateReferralCode } from "@/lib/economy";
import { getSiteUrl } from "@/lib/env";
import type { Database } from "@/database/types";

type XAccountRow = Database["public"]["Tables"]["x_accounts"]["Row"];
type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];
type CampaignRow = Database["public"]["Tables"]["campaigns"]["Row"];
type MissionRow = Database["public"]["Tables"]["missions"]["Row"];
type CommentProofRow = Database["public"]["Tables"]["comment_proofs"]["Row"];
type RaffleRow = Database["public"]["Tables"]["raffles"]["Row"];

export default async function DashboardPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/");
  }

  const adminClient = createSupabaseAdminClient();
  const siteUrl = getSiteUrl();

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
  const { data: userPointTxs } = await adminClient
    .from("point_transactions")
    .select("amount")
    .eq("user_id", user.id);

  const pointsBalance = (userPointTxs || []).reduce(
    (sum, tx) => sum + (tx.amount || 0),
    0,
  );

  // 8. Calculate Total Tickets from ticket_transactions ledger
  const { data: userTicketTxs } = await adminClient
    .from("ticket_transactions")
    .select("amount")
    .eq("user_id", user.id);

  const ticketBalance = (userTicketTxs || []).reduce(
    (sum, tx) => sum + (tx.amount || 0),
    0,
  );

  // 9. Referral Code & Qualified Count
  const referralCode = await getOrCreateReferralCode(user.id);
  const referralLink = `${siteUrl}/?ref=${referralCode}`;

  const { data: qualifiedReferrals } = await adminClient
    .from("referrals")
    .select("id")
    .eq("referrer_user_id", user.id)
    .in("status", ["QUALIFIED", "REWARDED"]);

  const qualifiedCount = qualifiedReferrals?.length || 0;

  // 10. Fetch Current Raffle (OPEN, CLOSED, or DRAWN)
  const { data: raffleData } = await adminClient
    .from("raffles")
    .select("*")
    .in("status", ["OPEN", "CLOSED", "DRAWN"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const raffle = raffleData as RaffleRow | null;

  let userCommittedTickets = 0;
  let totalPoolEntries = 0;
  let winners: WinnerInfo[] = [];

  if (raffle) {
    const { data: userEntries } = await adminClient
      .from("raffle_entries")
      .select("id")
      .eq("raffle_id", raffle.id)
      .eq("user_id", user.id);

    userCommittedTickets = userEntries?.length || 0;

    const { data: allRaffleEntries } = await adminClient
      .from("raffle_entries")
      .select("id")
      .eq("raffle_id", raffle.id);

    totalPoolEntries = allRaffleEntries?.length || 0;

    if (raffle.status === "DRAWN") {
      const { data: rawWinners } = await adminClient
        .from("raffle_winners")
        .select("winner_position, user_id, entry_id")
        .eq("raffle_id", raffle.id)
        .order("winner_position", { ascending: true });

      if (rawWinners && rawWinners.length > 0) {
        const winnerUserIds = rawWinners.map((w) => w.user_id);
        const { data: xAccounts } = await adminClient
          .from("x_accounts")
          .select("user_id, username, display_name")
          .in("user_id", winnerUserIds);

        const { data: profiles } = await adminClient
          .from("profiles")
          .select("user_id, username, display_name")
          .in("user_id", winnerUserIds);

        winners = rawWinners.map((w) => {
          const xAcc = xAccounts?.find((x) => x.user_id === w.user_id);
          const prof = profiles?.find((p) => p.user_id === w.user_id);
          return {
            winner_position: w.winner_position,
            user_id: w.user_id,
            entry_id: w.entry_id,
            username: xAcc?.username || prof?.username || null,
            display_name: xAcc?.display_name || prof?.display_name || null,
          };
        });
      }
    }
  }

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
                {ticketBalance} TICKETS
              </div>
            </div>
          </div>
        </div>

        {/* Economy & Referrals Section */}
        <ReferralCard
          pointsBalance={pointsBalance}
          ticketBalance={ticketBalance}
          referralCode={referralCode}
          referralLink={referralLink}
          qualifiedCount={qualifiedCount}
        />

        {/* Whitelist Raffle Engine Section */}
        <RaffleCard
          raffle={raffle}
          userCommittedTickets={userCommittedTickets}
          totalPoolEntries={totalPoolEntries}
          availableTickets={ticketBalance}
          winners={winners}
          currentUserId={user.id}
        />

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
