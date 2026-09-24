import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { MissionManager } from "./mission-manager";
import type { Database } from "@/database/types";

type MissionRow = Database["public"]["Tables"]["missions"]["Row"];
type CampaignRow = Database["public"]["Tables"]["campaigns"]["Row"];
type CommentProofRow = Database["public"]["Tables"]["comment_proofs"]["Row"];

export type CommentProofWithUser = CommentProofRow & {
  x_username?: string;
  mission_title?: string;
};

export const dynamic = "force-dynamic";

export default async function AdminMissionsPage() {
  const adminClient = createSupabaseAdminClient();

  // Fetch all missions
  const { data: missionsData } = await adminClient
    .from("missions")
    .select("*")
    .order("created_at", { ascending: false });

  const missions = (missionsData || []) as MissionRow[];

  // Fetch campaigns for select box
  const { data: campaignsData } = await adminClient
    .from("campaigns")
    .select("id, title, status")
    .order("created_at", { ascending: false });

  const campaigns = (campaignsData || []) as Pick<
    CampaignRow,
    "id" | "title" | "status"
  >[];

  // Fetch pending comment proofs
  const { data: pendingProofsData } = await adminClient
    .from("comment_proofs")
    .select("*")
    .eq("status", "PENDING")
    .order("created_at", { ascending: false });

  const rawPendingProofs = (pendingProofsData || []) as CommentProofRow[];

  // Fetch extra details for pending proofs (X handles and mission titles)
  let pendingProofs: CommentProofWithUser[] = [];
  if (rawPendingProofs.length > 0) {
    const userIds = Array.from(new Set(rawPendingProofs.map((p) => p.user_id)));

    const { data: xAccounts } = await adminClient
      .from("x_accounts")
      .select("user_id, username")
      .in("user_id", userIds);

    const xUserMap = new Map<string, string>();
    (xAccounts || []).forEach((acc) => {
      xUserMap.set(acc.user_id, acc.username);
    });

    const missionMap = new Map<string, string>();
    missions.forEach((m) => {
      missionMap.set(m.id, m.title);
    });

    pendingProofs = rawPendingProofs.map((proof) => ({
      ...proof,
      x_username: xUserMap.get(proof.user_id) || undefined,
      mission_title: missionMap.get(proof.mission_id) || undefined,
    }));
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-black text-[var(--foreground)] sm:text-4xl">
          Mission Management & Proof Review
        </h1>
        <p className="mt-2 text-sm text-[var(--muted)]">
          Create, toggle missions, and verify pending comment proof submissions.
        </p>
      </div>

      <MissionManager
        missions={missions}
        campaigns={campaigns}
        pendingProofs={pendingProofs}
      />
    </div>
  );
}
