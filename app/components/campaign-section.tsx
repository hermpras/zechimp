"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MissionCard } from "./mission-card";
import type { Database } from "@/database/types";

type CampaignRow = Database["public"]["Tables"]["campaigns"]["Row"];
type MissionRow = Database["public"]["Tables"]["missions"]["Row"];
type CommentProofRow = Database["public"]["Tables"]["comment_proofs"]["Row"];

interface CampaignSectionProps {
  campaign: CampaignRow | null;
  missions: MissionRow[];
  completedMissionIds: string[];
  commentProofs: CommentProofRow[];
  pointsBalance: number;
}

export function CampaignSection({
  campaign,
  missions,
  completedMissionIds,
  commentProofs,
  pointsBalance,
}: CampaignSectionProps) {
  const [seeding, setSeeding] = useState(false);
  const router = useRouter();

  const handleSeedDevData = async () => {
    setSeeding(true);
    try {
      const res = await fetch("/api/dev/seed", { method: "POST" });
      if (res.ok) {
        router.refresh();
      } else {
        console.error("Failed to seed dev data");
      }
    } catch (err) {
      console.error("Seed error:", err);
    } finally {
      setSeeding(false);
    }
  };

  return (
    <div className="flex flex-col gap-8">
      {/* Points Ledger Summary Banner */}
      <div className="flex flex-col justify-between gap-4 border border-[var(--border)] bg-[var(--background-raised)] p-6 sm:flex-row sm:items-center">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--muted)]">
            Ledger Verified Balance
          </p>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-4xl font-black text-[var(--accent)]">
              {pointsBalance}
            </span>
            <span className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--foreground)]">
              POINTS
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="border border-[var(--accent)] bg-[rgba(183,255,0,0.08)] px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-[var(--accent)]">
            +5 PTS PER MISSION
          </div>
        </div>
      </div>

      {/* Active Campaign Info Header */}
      {campaign ? (
        <div className="border border-[var(--border)] bg-[#0d0d0d] p-6 sm:p-8">
          <div className="flex items-center justify-between gap-4 border-b border-[var(--border)] pb-4">
            <span className="inline-flex items-center gap-2 border border-[var(--accent)] bg-[rgba(183,255,0,0.1)] px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-[var(--accent)]">
              <span className="h-2 w-2 rounded-full bg-[var(--accent)] animate-pulse" />
              ACTIVE CAMPAIGN
            </span>
            <span className="text-xs font-mono text-[var(--muted)]">
              {missions.length} AVAILABLE MISSIONS
            </span>
          </div>

          <h2 className="mt-4 text-3xl font-black text-[var(--foreground)] sm:text-4xl">
            {campaign.title}
          </h2>
          {campaign.description && (
            <p className="mt-3 max-w-2xl text-base text-[var(--muted)] leading-relaxed">
              {campaign.description}
            </p>
          )}
        </div>
      ) : (
        <div className="border border-[var(--border)] bg-[#0d0d0d] p-8 text-center">
          <h3 className="text-xl font-black text-[var(--foreground)]">
            No Active Campaign Found
          </h3>
          <p className="mt-2 text-sm text-[var(--muted)]">
            Click below to populate development test data with an active campaign and missions.
          </p>
          <button
            onClick={handleSeedDevData}
            disabled={seeding}
            className="mt-6 inline-flex items-center gap-2 border border-[var(--accent)] bg-[var(--accent)] px-6 py-3 text-xs font-black uppercase tracking-[0.2em] text-[#090909] transition-all hover:bg-transparent hover:text-[var(--accent)] disabled:opacity-50 cursor-pointer"
          >
            {seeding ? "SEEDING DATA..." : "SEED DEV DATA"}
          </button>
        </div>
      )}

      {/* Missions Grid */}
      {missions.length > 0 && (
        <div>
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-xs font-black uppercase tracking-[0.22em] text-[var(--muted)]">
              CAMPAIGN MISSIONS
            </h3>
            {process.env.NODE_ENV === "development" && (
              <button
                onClick={handleSeedDevData}
                disabled={seeding}
                className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--muted)] hover:text-[var(--accent)] underline cursor-pointer"
              >
                {seeding ? "RESETTING..." : "RESET DEV MISSIONS"}
              </button>
            )}
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {missions.map((mission) => {
              const completed = completedMissionIds.includes(mission.id);
              const proof = commentProofs.find(
                (p) => p.mission_id === mission.id,
              );

              return (
                <MissionCard
                  key={mission.id}
                  mission={mission}
                  isCompleted={completed}
                  commentProof={proof}
                />
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
