"use client";

import { useState } from "react";
import type { Database } from "@/database/types";
import type { CommentProofWithUser } from "./page";
import {
  createMissionAdminAction,
  updateMissionAdminAction,
  toggleMissionAdminAction,
  reviewCommentProofAdminAction,
} from "@/app/actions/admin";

type MissionRow = Database["public"]["Tables"]["missions"]["Row"];
type CampaignRow = Database["public"]["Tables"]["campaigns"]["Row"];

interface MissionManagerProps {
  missions: MissionRow[];
  campaigns: Pick<CampaignRow, "id" | "title" | "status">[];
  pendingProofs: CommentProofWithUser[];
}

export function MissionManager({
  missions,
  campaigns,
  pendingProofs,
}: MissionManagerProps) {
  const [activeTab, setActiveTab] = useState<"missions" | "proofs">("missions");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingMission, setEditingMission] = useState<MissionRow | null>(null);
  const [rejectingProof, setRejectingProof] = useState<CommentProofWithUser | null>(null);

  // Form State for Create
  const [type, setType] = useState<"FOLLOW" | "LIKE_REPOST" | "COMMENT">("LIKE_REPOST");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [targetUrl, setTargetUrl] = useState("");
  const [campaignId, setCampaignId] = useState<string>(campaigns[0]?.id || "");
  const [isPermanent, setIsPermanent] = useState(false);
  const [isActive, setIsActive] = useState(true);

  // Form State for Edit
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editTargetUrl, setEditTargetUrl] = useState("");
  const [editIsActive, setEditIsActive] = useState(true);

  // Reject reason state
  const [rejectReason, setRejectReason] = useState("");

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const resetCreateForm = () => {
    setType("LIKE_REPOST");
    setTitle("");
    setDescription("");
    setTargetUrl("");
    setCampaignId(campaigns[0]?.id || "");
    setIsPermanent(false);
    setIsActive(true);
    setErrorMsg(null);
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    const selectedCampaignId = isPermanent ? null : campaignId;

    const res = await createMissionAdminAction(
      selectedCampaignId,
      type,
      title,
      description,
      5, // reward_points
      targetUrl,
      isPermanent,
      isActive
    );

    setLoading(false);
    if (!res.success) {
      setErrorMsg(res.error || "Failed to create mission.");
      return;
    }

    setSuccessMsg(res.message || "Mission created!");
    setIsCreateOpen(false);
    resetCreateForm();
  };

  const handleEditClick = (mission: MissionRow) => {
    setEditingMission(mission);
    setEditTitle(mission.title);
    setEditDescription(mission.description || "");
    setEditTargetUrl(mission.target_url || "");
    setEditIsActive(mission.is_active ?? true);
    setErrorMsg(null);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMission) return;

    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    const res = await updateMissionAdminAction(
      editingMission.id,
      editTitle,
      editDescription,
      editTargetUrl,
      editIsActive
    );

    setLoading(false);
    if (!res.success) {
      setErrorMsg(res.error || "Failed to update mission.");
      return;
    }

    setSuccessMsg(res.message || "Mission updated!");
    setEditingMission(null);
  };

  const handleToggle = async (mission: MissionRow) => {
    setLoading(true);
    setErrorMsg(null);
    const newStatus = !mission.is_active;
    const res = await toggleMissionAdminAction(mission.id, newStatus);
    setLoading(false);

    if (!res.success) {
      setErrorMsg(res.error || "Failed to toggle status.");
    } else {
      setSuccessMsg(res.message || "Status updated.");
    }
  };

  const handleApproveProof = async (proofId: string) => {
    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    const res = await reviewCommentProofAdminAction(proofId, true);
    setLoading(false);

    if (!res.success) {
      setErrorMsg(res.error || "Failed to approve proof.");
    } else {
      setSuccessMsg(res.message || "Proof approved!");
    }
  };

  const handleRejectProofSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectingProof) return;

    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    const res = await reviewCommentProofAdminAction(
      rejectingProof.id,
      false,
      rejectReason
    );
    setLoading(false);

    if (!res.success) {
      setErrorMsg(res.error || "Failed to reject proof.");
    } else {
      setSuccessMsg(res.message || "Proof rejected.");
      setRejectingProof(null);
      setRejectReason("");
    }
  };

  const getCampaignTitle = (campaignId: string | null) => {
    if (!campaignId) return "Permanent / Global";
    const found = campaigns.find((c) => c.id === campaignId);
    return found ? found.title : campaignId.substring(0, 8);
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Alert Messages */}
      {errorMsg && (
        <div className="border border-red-500 bg-red-950/40 p-4 text-xs font-mono text-red-400">
          ⚠️ {errorMsg}
        </div>
      )}
      {successMsg && (
        <div className="border border-[var(--accent)] bg-[rgba(183,255,0,0.1)] p-4 text-xs font-mono text-[var(--accent)]">
          ✓ {successMsg}
        </div>
      )}

      {/* Sub-tab selection */}
      <div className="flex items-center justify-between border-b border-[var(--border)] pb-4">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab("missions")}
            className={`px-4 py-2 text-xs font-black uppercase tracking-[0.18em] transition-all ${
              activeTab === "missions"
                ? "border border-[var(--accent)] bg-[var(--accent)] text-black"
                : "border border-[var(--border)] bg-[#0d0d0d] text-[var(--muted)] hover:text-[var(--foreground)]"
            }`}
          >
            MISSIONS LIST ({missions.length})
          </button>
          <button
            onClick={() => setActiveTab("proofs")}
            className={`relative px-4 py-2 text-xs font-black uppercase tracking-[0.18em] transition-all ${
              activeTab === "proofs"
                ? "border border-[var(--accent)] bg-[var(--accent)] text-black"
                : "border border-[var(--border)] bg-[#0d0d0d] text-[var(--muted)] hover:text-[var(--foreground)]"
            }`}
          >
            PENDING COMMENT PROOFS ({pendingProofs.length})
            {pendingProofs.length > 0 && (
              <span className="ml-2 border border-red-500 bg-red-600 px-1.5 py-0.5 text-[9px] font-black text-white">
                {pendingProofs.length}
              </span>
            )}
          </button>
        </div>

        {activeTab === "missions" && (
          <button
            onClick={() => {
              resetCreateForm();
              setIsCreateOpen(true);
            }}
            className="border border-[var(--accent)] bg-[var(--accent)] px-5 py-2 text-xs font-black uppercase tracking-[0.18em] text-black hover:opacity-90"
          >
            + CREATE MISSION
          </button>
        )}
      </div>

      {/* TAB 1: MISSIONS LIST */}
      {activeTab === "missions" && (
        <div className="border border-[var(--border)] bg-[#0d0d0d]">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead className="border-b border-[var(--border)] bg-[#141414] uppercase text-[var(--muted)]">
                <tr>
                  <th className="px-4 py-3 font-bold">Type</th>
                  <th className="px-4 py-3 font-bold">Mission Title</th>
                  <th className="px-4 py-3 font-bold">Campaign / Scope</th>
                  <th className="px-4 py-3 font-bold">Reward</th>
                  <th className="px-4 py-3 font-bold">Status</th>
                  <th className="px-4 py-3 font-bold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {missions.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-[var(--muted)]">
                      No missions found. Click &quot;+ CREATE MISSION&quot; to add one.
                    </td>
                  </tr>
                ) : (
                  missions.map((m) => (
                    <tr key={m.id} className="hover:bg-[#121212]">
                      <td className="px-4 py-3">
                        <span className="border border-[var(--border)] bg-[#1a1a1a] px-2 py-0.5 text-[10px] font-bold tracking-wider text-[var(--accent)]">
                          {m.type}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-bold text-[var(--foreground)]">{m.title}</div>
                        {m.target_url && (
                          <a
                            href={m.target_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[10px] text-[var(--accent)] hover:underline truncate max-w-[200px] inline-block"
                          >
                            🔗 {m.target_url}
                          </a>
                        )}
                      </td>
                      <td className="px-4 py-3 text-[var(--muted)]">
                        {m.is_permanent ? (
                          <span className="border border-purple-500/30 bg-purple-950/20 px-2 py-0.5 text-[10px] text-purple-300">
                            PERMANENT
                          </span>
                        ) : (
                          getCampaignTitle(m.campaign_id)
                        )}
                      </td>
                      <td className="px-4 py-3 font-bold text-[var(--accent)]">
                        +{m.reward_points} PTS
                      </td>
                      <td className="px-4 py-3">
                        {m.is_active ? (
                          <span className="border border-emerald-500/30 bg-emerald-950/20 px-2 py-0.5 text-[10px] font-bold text-emerald-400">
                            ACTIVE
                          </span>
                        ) : (
                          <span className="border border-neutral-700 bg-neutral-900 px-2 py-0.5 text-[10px] font-bold text-neutral-400">
                            INACTIVE
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleToggle(m)}
                            disabled={loading}
                            className="border border-[var(--border)] bg-[#1a1a1a] px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-[var(--foreground)] hover:border-[var(--accent)]"
                          >
                            {m.is_active ? "DEACTIVATE" : "ACTIVATE"}
                          </button>
                          <button
                            onClick={() => handleEditClick(m)}
                            className="border border-[var(--border)] bg-[#1a1a1a] px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-[var(--accent)] hover:border-[var(--accent)]"
                          >
                            EDIT
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: PENDING COMMENT PROOFS */}
      {activeTab === "proofs" && (
        <div className="flex flex-col gap-4">
          {pendingProofs.length === 0 ? (
            <div className="border border-[var(--border)] bg-[#0d0d0d] p-8 text-center text-xs font-mono text-[var(--muted)]">
              No pending comment proofs to review.
            </div>
          ) : (
            pendingProofs.map((proof) => (
              <div
                key={proof.id}
                className="border border-[var(--border)] bg-[#0d0d0d] p-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex flex-col gap-2 text-xs font-mono">
                  <div className="flex items-center gap-3">
                    <span className="border border-amber-500/40 bg-amber-950/20 px-2 py-0.5 text-[10px] font-black text-amber-400">
                      PENDING REVIEW
                    </span>
                    <span className="font-bold text-[var(--foreground)]">
                      User: @{proof.x_username || proof.user_id.substring(0, 8)}
                    </span>
                  </div>
                  <div>
                    <span className="text-[var(--muted)]">Mission: </span>
                    <span className="font-bold text-[var(--foreground)]">
                      {proof.mission_title || proof.mission_id.substring(0, 8)}
                    </span>
                  </div>
                  <div>
                    <span className="text-[var(--muted)]">Comment Proof Link: </span>
                    <a
                      href={proof.comment_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[var(--accent)] underline hover:opacity-80"
                    >
                      {proof.comment_url}
                    </a>
                  </div>
                  <div className="text-[10px] text-[var(--muted)]">
                    Submitted: {new Date(proof.created_at).toLocaleString()}
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={() => handleApproveProof(proof.id)}
                    disabled={loading}
                    className="border border-emerald-500 bg-emerald-600 px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-white hover:bg-emerald-500"
                  >
                    ✓ APPROVE (+5 PTS)
                  </button>
                  <button
                    onClick={() => {
                      setRejectingProof(proof);
                      setRejectReason("");
                    }}
                    disabled={loading}
                    className="border border-red-500 bg-red-950/40 px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-red-400 hover:bg-red-900/60"
                  >
                    ✕ REJECT
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* CREATE MISSION MODAL */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <div className="w-full max-w-lg border border-[var(--border)] bg-[#0d0d0d] p-6">
            <h2 className="text-xl font-black uppercase tracking-wider text-[var(--foreground)]">
              Create New Mission
            </h2>
            <form onSubmit={handleCreateSubmit} className="mt-4 flex flex-col gap-4 text-xs font-mono">
              <div>
                <label className="block uppercase text-[var(--muted)] font-bold mb-1">
                  Mission Type
                </label>
                <select
                  value={type}
                  onChange={(e) => {
                    const selected = e.target.value as "FOLLOW" | "LIKE_REPOST" | "COMMENT";
                    setType(selected);
                    if (selected !== "FOLLOW") {
                      setIsPermanent(false);
                    }
                  }}
                  className="w-full border border-[var(--border)] bg-[#141414] p-2 text-[var(--foreground)]"
                >
                  <option value="LIKE_REPOST">LIKE_REPOST (Like & Retweet)</option>
                  <option value="COMMENT">COMMENT (Comment with proof)</option>
                  <option value="FOLLOW">FOLLOW (X Follow)</option>
                </select>
              </div>

              <div>
                <label className="block uppercase text-[var(--muted)] font-bold mb-1">
                  Title
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Follow @ZECHIMP on X"
                  className="w-full border border-[var(--border)] bg-[#141414] p-2 text-[var(--foreground)]"
                />
              </div>

              <div>
                <label className="block uppercase text-[var(--muted)] font-bold mb-1">
                  Description (Optional)
                </label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Instructions for the mission..."
                  className="w-full border border-[var(--border)] bg-[#141414] p-2 text-[var(--foreground)]"
                />
              </div>

              <div>
                <label className="block uppercase text-[var(--muted)] font-bold mb-1">
                  Target URL
                </label>
                <input
                  type="url"
                  value={targetUrl}
                  onChange={(e) => setTargetUrl(e.target.value)}
                  placeholder="https://x.com/ZECHIMP or https://x.com/user/status/123"
                  className="w-full border border-[var(--border)] bg-[#141414] p-2 text-[var(--foreground)]"
                />
              </div>

              {type === "FOLLOW" && (
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="isPermanent"
                    checked={isPermanent}
                    onChange={(e) => setIsPermanent(e.target.checked)}
                  />
                  <label htmlFor="isPermanent" className="uppercase font-bold text-[var(--foreground)]">
                    Permanent Global Mission (No campaign link required)
                  </label>
                </div>
              )}

              {!isPermanent && (
                <div>
                  <label className="block uppercase text-[var(--muted)] font-bold mb-1">
                    Linked Campaign
                  </label>
                  <select
                    value={campaignId}
                    onChange={(e) => setCampaignId(e.target.value)}
                    required
                    className="w-full border border-[var(--border)] bg-[#141414] p-2 text-[var(--foreground)]"
                  >
                    {campaigns.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.title} ({c.status})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                />
                <label htmlFor="isActive" className="uppercase font-bold text-[var(--foreground)]">
                  Active Immediately
                </label>
              </div>

              <div className="mt-4 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="border border-[var(--border)] bg-[#141414] px-4 py-2 font-bold uppercase text-[var(--muted)]"
                >
                  CANCEL
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="border border-[var(--accent)] bg-[var(--accent)] px-5 py-2 font-black uppercase text-black"
                >
                  {loading ? "SAVING..." : "CREATE MISSION"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT MISSION MODAL */}
      {editingMission && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <div className="w-full max-w-lg border border-[var(--border)] bg-[#0d0d0d] p-6">
            <h2 className="text-xl font-black uppercase tracking-wider text-[var(--foreground)]">
              Edit Mission
            </h2>
            <form onSubmit={handleEditSubmit} className="mt-4 flex flex-col gap-4 text-xs font-mono">
              <div>
                <label className="block uppercase text-[var(--muted)] font-bold mb-1">
                  Title
                </label>
                <input
                  type="text"
                  required
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full border border-[var(--border)] bg-[#141414] p-2 text-[var(--foreground)]"
                />
              </div>

              <div>
                <label className="block uppercase text-[var(--muted)] font-bold mb-1">
                  Description
                </label>
                <textarea
                  rows={2}
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  className="w-full border border-[var(--border)] bg-[#141414] p-2 text-[var(--foreground)]"
                />
              </div>

              <div>
                <label className="block uppercase text-[var(--muted)] font-bold mb-1">
                  Target URL
                </label>
                <input
                  type="url"
                  value={editTargetUrl}
                  onChange={(e) => setEditTargetUrl(e.target.value)}
                  className="w-full border border-[var(--border)] bg-[#141414] p-2 text-[var(--foreground)]"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="editIsActive"
                  checked={editIsActive}
                  onChange={(e) => setEditIsActive(e.target.checked)}
                />
                <label htmlFor="editIsActive" className="uppercase font-bold text-[var(--foreground)]">
                  Is Active
                </label>
              </div>

              <div className="mt-4 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setEditingMission(null)}
                  className="border border-[var(--border)] bg-[#141414] px-4 py-2 font-bold uppercase text-[var(--muted)]"
                >
                  CANCEL
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="border border-[var(--accent)] bg-[var(--accent)] px-5 py-2 font-black uppercase text-black"
                >
                  {loading ? "SAVING..." : "UPDATE MISSION"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* REJECT PROOF MODAL */}
      {rejectingProof && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <div className="w-full max-w-md border border-red-500 bg-[#0d0d0d] p-6">
            <h2 className="text-lg font-black uppercase tracking-wider text-red-400">
              Reject Comment Proof
            </h2>
            <p className="mt-2 text-xs font-mono text-[var(--muted)]">
              User: @{rejectingProof.x_username || rejectingProof.user_id.substring(0, 8)}
            </p>
            <form onSubmit={handleRejectProofSubmit} className="mt-4 flex flex-col gap-4 text-xs font-mono">
              <div>
                <label className="block uppercase text-[var(--muted)] font-bold mb-1">
                  Rejection Reason
                </label>
                <input
                  type="text"
                  required
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="e.g. Invalid comment URL or comment deleted"
                  className="w-full border border-[var(--border)] bg-[#141414] p-2 text-[var(--foreground)]"
                />
              </div>

              <div className="flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setRejectingProof(null)}
                  className="border border-[var(--border)] bg-[#141414] px-4 py-2 font-bold uppercase text-[var(--muted)]"
                >
                  CANCEL
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="border border-red-500 bg-red-600 px-5 py-2 font-black uppercase text-white hover:bg-red-500"
                >
                  {loading ? "REJECTING..." : "CONFIRM REJECTION"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
