"use client";

import { useState } from "react";
import { completeMissionAction } from "@/app/actions/missions";
import type { Database } from "@/database/types";

type MissionRow = Database["public"]["Tables"]["missions"]["Row"];
type CommentProofRow = Database["public"]["Tables"]["comment_proofs"]["Row"];

interface MissionCardProps {
  mission: MissionRow;
  isCompleted: boolean;
  commentProof?: CommentProofRow | null;
}

export function MissionCard({
  mission,
  isCompleted,
  commentProof,
}: MissionCardProps) {
  const [loading, setLoading] = useState(false);
  const [commentUrl, setCommentUrl] = useState("");
  const [showInput, setShowInput] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const isCommentMission = mission.type === "COMMENT";
  const isPendingProof = commentProof?.status === "PENDING";
  const isRejectedProof = commentProof?.status === "REJECTED";

  const handleComplete = async () => {
    setFeedback(null);

    if (isCommentMission && !showInput) {
      setShowInput(true);
      return;
    }

    if (isCommentMission && !commentUrl.trim()) {
      setFeedback({
        type: "error",
        text: "Please enter your X comment URL.",
      });
      return;
    }

    setLoading(true);

    try {
      const result = await completeMissionAction(
        mission.id,
        isCommentMission ? commentUrl.trim() : undefined,
      );

      if (result.success) {
        setFeedback({
          type: "success",
          text: result.message || "Mission action submitted!",
        });
        if (isCommentMission) {
          setShowInput(false);
        }
      } else {
        setFeedback({
          type: "error",
          text: result.error || "Failed to complete mission.",
        });
      }
    } catch {
      setFeedback({
        type: "error",
        text: "An unexpected error occurred.",
      });
    } finally {
      setLoading(false);
    }
  };

  const getMissionTypeLabel = (type: MissionRow["type"]) => {
    switch (type) {
      case "FOLLOW":
        return "FOLLOW MISSION";
      case "LIKE_REPOST":
        return "LIKE & REPOST";
      case "COMMENT":
        return "COMMENT PROOF";
      default:
        return type;
    }
  };

  return (
    <div className="flex flex-col justify-between border border-[var(--border)] bg-[#0d0d0d] p-6 transition-all hover:border-[var(--accent)]">
      <div>
        {/* Header Badges */}
        <div className="flex items-center justify-between gap-2 pb-4">
          <span className="border border-[var(--border)] bg-[#121212] px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-[var(--muted)]">
            {getMissionTypeLabel(mission.type)}
          </span>
          <span className="border border-[var(--accent)] bg-[rgba(183,255,0,0.1)] px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-[var(--accent)]">
            +{mission.reward_points} POINTS
          </span>
        </div>

        {/* Title & Description */}
        <h3 className="text-xl font-black text-[var(--foreground)]">
          {mission.title}
        </h3>
        {mission.description && (
          <p className="mt-2 text-sm text-[var(--muted)] leading-relaxed">
            {mission.description}
          </p>
        )}
      </div>

      {/* Actions & Status */}
      <div className="mt-6 flex flex-col gap-3 pt-4 border-t border-[var(--border)]">
        {feedback && (
          <div
            className={`p-3 text-xs font-bold ${
              feedback.type === "success"
                ? "border border-[var(--accent)] bg-[rgba(183,255,0,0.1)] text-[var(--accent)]"
                : "border border-red-500 bg-red-950/30 text-red-400"
            }`}
          >
            {feedback.text}
          </div>
        )}

        {/* Comment URL Input Field */}
        {isCommentMission && showInput && !isCompleted && !isPendingProof && (
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--muted)]">
              Your X Comment URL
            </label>
            <input
              type="url"
              placeholder="https://x.com/username/status/123456789..."
              value={commentUrl}
              onChange={(e) => setCommentUrl(e.target.value)}
              className="border border-[var(--border)] bg-[#090909] px-3 py-2 text-xs font-mono text-[var(--foreground)] placeholder:text-[var(--muted)] focus:border-[var(--accent)] focus:outline-none"
            />
          </div>
        )}

        {/* Target X Link + Action Controls */}
        <div className="flex flex-wrap items-center gap-3">
          {mission.target_url && (
            <a
              href={mission.target_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 border border-[var(--border)] bg-transparent px-4 py-2.5 text-xs font-bold uppercase tracking-[0.18em] text-[var(--foreground)] transition-all hover:border-[var(--accent)] hover:text-[var(--accent)]"
            >
              <svg
                className="h-3.5 w-3.5 fill-current text-[var(--accent)]"
                viewBox="0 0 24 24"
              >
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
              OPEN X
            </a>
          )}

          {isCompleted ? (
            <div className="inline-flex items-center gap-2 border border-[var(--accent)] bg-[var(--accent)] px-4 py-2.5 text-xs font-black uppercase tracking-[0.18em] text-[#090909]">
              <svg className="h-4 w-4 fill-current" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                  clipRule="evenodd"
                />
              </svg>
              COMPLETED
            </div>
          ) : isPendingProof ? (
            <div className="inline-flex items-center gap-2 border border-yellow-500/50 bg-yellow-500/10 px-4 py-2.5 text-xs font-bold uppercase tracking-[0.18em] text-yellow-400">
              <span className="h-2 w-2 rounded-full bg-yellow-400 animate-pulse" />
              PENDING APPROVAL
            </div>
          ) : (
            <button
              onClick={handleComplete}
              disabled={loading}
              className="inline-flex items-center justify-center border border-[var(--accent)] bg-[var(--accent)] px-5 py-2.5 text-xs font-black uppercase tracking-[0.18em] text-[#090909] transition-all hover:bg-transparent hover:text-[var(--accent)] disabled:opacity-50 cursor-pointer"
            >
              {loading
                ? "PROCESSING..."
                : isCommentMission
                ? showInput
                  ? "SUBMIT PROOF"
                  : "ENTER PROOF"
                : "COMPLETE"}
            </button>
          )}
        </div>

        {isRejectedProof && !isCompleted && !isPendingProof && (
          <p className="text-[10px] text-red-400 font-mono">
            Previous proof was rejected ({commentProof?.review_reason || "Check URL"}). You can submit a new URL proof above.
          </p>
        )}
      </div>
    </div>
  );
}
