import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { CampaignManager } from "./campaign-manager";
import type { Database } from "@/database/types";

type CampaignRow = Database["public"]["Tables"]["campaigns"]["Row"];

export const dynamic = "force-dynamic";

export default async function AdminCampaignsPage() {
  const adminClient = createSupabaseAdminClient();

  const { data: campaignsData } = await adminClient
    .from("campaigns")
    .select("*")
    .order("created_at", { ascending: false });

  const campaigns = (campaignsData || []) as CampaignRow[];

  // Fetch count of missions per campaign
  const { data: missions } = await adminClient
    .from("missions")
    .select("campaign_id");

  const missionCounts: Record<string, number> = {};
  (missions || []).forEach((m) => {
    if (m.campaign_id) {
      missionCounts[m.campaign_id] = (missionCounts[m.campaign_id] || 0) + 1;
    }
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-black text-[var(--foreground)] sm:text-4xl">
          Campaign Management
        </h1>
        <p className="mt-2 text-sm text-[var(--muted)]">
          Create, configure, and activate official whitelist campaigns for ZECHIMP.
        </p>
      </div>

      <CampaignManager campaigns={campaigns} missionCounts={missionCounts} />
    </div>
  );
}
