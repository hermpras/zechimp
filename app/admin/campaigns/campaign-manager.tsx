"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  createCampaignAdminAction,
  updateCampaignAdminAction,
  toggleCampaignAdminAction,
} from "@/app/actions/admin";
import type { Database } from "@/database/types";

type CampaignRow = Database["public"]["Tables"]["campaigns"]["Row"];

interface CampaignManagerProps {
  campaigns: CampaignRow[];
  missionCounts: Record<string, number>;
}

export function CampaignManager({ campaigns, missionCounts }: CampaignManagerProps) {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<CampaignRow | null>(null);

  // Form states
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [xPostUrl, setXPostUrl] = useState("");
  const [status, setStatus] = useState<CampaignRow["status"]>("ACTIVE");

  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const router = useRouter();

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setXPostUrl("");
    setStatus("ACTIVE");
    setEditingCampaign(null);
    setShowCreateModal(false);
  };

  const handleOpenEdit = (c: CampaignRow) => {
    setEditingCampaign(c);
    setTitle(c.title);
    setDescription(c.description || "");
    setXPostUrl(c.x_post_url);
    setStatus(c.status);
    setShowCreateModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    setLoading(true);

    try {
      let res;
      if (editingCampaign) {
        res = await updateCampaignAdminAction(editingCampaign.id, title, description, xPostUrl, status);
      } else {
        res = await createCampaignAdminAction(title, description, xPostUrl, status);
      }

      if (res.success) {
        setFeedback({ type: "success", text: res.message || "Operation successful!" });
        resetForm();
        router.refresh();
      } else {
        setFeedback({ type: "error", text: res.error || "Operation failed." });
      }
    } catch {
      setFeedback({ type: "error", text: "An unexpected error occurred." });
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async (id: string, newStatus: CampaignRow["status"]) => {
    setFeedback(null);
    setLoading(true);
    try {
      const res = await toggleCampaignAdminAction(id, newStatus);
      if (res.success) {
        setFeedback({ type: "success", text: res.message || "Status updated!" });
        router.refresh();
      } else {
        setFeedback({ type: "error", text: res.error || "Failed to update status." });
      }
    } catch {
      setFeedback({ type: "error", text: "An unexpected error occurred." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Action Header */}
      <div className="flex items-center justify-between border-b border-[var(--border)] pb-4">
        <span className="text-xs font-mono text-[var(--muted)] uppercase">
          {campaigns.length} CAMPAIGN{campaigns.length !== 1 ? "S" : ""} FOUND
        </span>
        <button
          onClick={() => {
            resetForm();
            setShowCreateModal(true);
          }}
          className="inline-flex items-center justify-center border border-[var(--accent)] bg-[var(--accent)] px-5 py-2.5 text-xs font-black uppercase tracking-[0.18em] text-[#090909] transition-all hover:bg-transparent hover:text-[var(--accent)] cursor-pointer"
        >
          + CREATE NEW CAMPAIGN
        </button>
      </div>

      {feedback && (
        <div
          className={`p-4 text-xs font-bold ${
            feedback.type === "success"
              ? "border border-[var(--accent)] bg-[rgba(183,255,0,0.1)] text-[var(--accent)]"
              : "border border-red-500 bg-red-950/30 text-red-400"
          }`}
        >
          {feedback.text}
        </div>
      )}

      {/* Modal / Form overlay */}
      {showCreateModal && (
        <div className="border border-[var(--border)] bg-[var(--background-raised)] p-6 sm:p-8">
          <div className="flex items-center justify-between border-b border-[var(--border)] pb-4">
            <h3 className="text-sm font-black uppercase tracking-[0.2em] text-[var(--foreground)]">
              {editingCampaign ? `Edit Campaign: ${editingCampaign.title}` : "Create New Campaign"}
            </h3>
            <button
              onClick={resetForm}
              className="text-xs font-bold text-[var(--muted)] hover:text-[var(--foreground)]"
            >
              CANCEL [X]
            </button>
          </div>

          <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
            <div>
              <label className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--muted)]">
                Campaign Title
              </label>
              <input
                type="text"
                placeholder="e.g. ZECHIMP Genesis Campaign"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                className="mt-1 w-full border border-[var(--border)] bg-[#090909] px-3.5 py-2.5 text-xs font-mono text-[var(--foreground)] focus:border-[var(--accent)] focus:outline-none"
              />
            </div>

            <div>
              <label className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--muted)]">
                Description
              </label>
              <textarea
                placeholder="Campaign overview and instructions for users..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="mt-1 w-full border border-[var(--border)] bg-[#090909] px-3.5 py-2.5 text-xs font-mono text-[var(--foreground)] focus:border-[var(--accent)] focus:outline-none"
              />
            </div>

            <div>
              <label className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--muted)]">
                Target X Announcement Post URL
              </label>
              <input
                type="url"
                placeholder="https://x.com/zechimp/status/1880000000000000000"
                value={xPostUrl}
                onChange={(e) => setXPostUrl(e.target.value)}
                required
                className="mt-1 w-full border border-[var(--border)] bg-[#090909] px-3.5 py-2.5 text-xs font-mono text-[var(--foreground)] focus:border-[var(--accent)] focus:outline-none"
              />
            </div>

            <div>
              <label className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--muted)]">
                Campaign Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as CampaignRow["status"])}
                className="mt-1 w-full border border-[var(--border)] bg-[#090909] px-3.5 py-2.5 text-xs font-mono text-[var(--foreground)] focus:border-[var(--accent)] focus:outline-none"
              >
                <option value="ACTIVE">ACTIVE (Visible to Users)</option>
                <option value="DRAFT">DRAFT (Hidden)</option>
                <option value="EXPIRED">EXPIRED</option>
                <option value="ARCHIVED">ARCHIVED</option>
              </select>
            </div>

            <div className="mt-4 flex items-center gap-3">
              <button
                type="submit"
                disabled={loading}
                className="border border-[var(--accent)] bg-[var(--accent)] px-6 py-3 text-xs font-black uppercase tracking-[0.18em] text-[#090909] hover:bg-transparent hover:text-[var(--accent)] disabled:opacity-50 cursor-pointer"
              >
                {loading ? "SAVING..." : editingCampaign ? "UPDATE CAMPAIGN" : "CREATE CAMPAIGN"}
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="border border-[var(--border)] bg-transparent px-5 py-3 text-xs font-bold uppercase tracking-[0.18em] text-[var(--muted)] hover:text-[var(--foreground)]"
              >
                CANCEL
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Campaigns List */}
      <div className="grid gap-4">
        {campaigns.map((c) => (
          <div
            key={c.id}
            className="flex flex-col justify-between gap-4 border border-[var(--border)] bg-[#0d0d0d] p-6 transition-all hover:border-[var(--accent)]"
          >
            <div>
              <div className="flex items-center justify-between gap-2 pb-3 border-b border-[var(--border)]">
                <div className="flex items-center gap-3">
                  <span
                    className={`px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.2em] border ${
                      c.status === "ACTIVE"
                        ? "border-[var(--accent)] bg-[rgba(183,255,0,0.1)] text-[var(--accent)]"
                        : "border-[var(--border)] bg-[#121212] text-[var(--muted)]"
                    }`}
                  >
                    {c.status}
                  </span>
                  <span className="text-xs font-mono text-[var(--muted)]">
                    ID: {c.id.substring(0, 8)}...
                  </span>
                </div>
                <span className="text-xs font-mono text-[var(--accent)] font-bold">
                  {missionCounts[c.id] || 0} MISSIONS LINKED
                </span>
              </div>

              <h3 className="mt-4 text-2xl font-black text-[var(--foreground)]">
                {c.title}
              </h3>
              {c.description && (
                <p className="mt-2 text-xs text-[var(--muted)] leading-relaxed">
                  {c.description}
                </p>
              )}
              <div className="mt-3 text-xs font-mono text-[var(--muted)] truncate">
                Target Post: <a href={c.x_post_url} target="_blank" rel="noopener noreferrer" className="text-[var(--accent)] underline">{c.x_post_url}</a>
              </div>
            </div>

            {/* Controls */}
            <div className="flex flex-wrap items-center gap-3 pt-4 border-t border-[var(--border)]">
              <button
                onClick={() => handleOpenEdit(c)}
                className="border border-[var(--border)] bg-[#121212] px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-[var(--foreground)] hover:border-[var(--accent)] hover:text-[var(--accent)] cursor-pointer"
              >
                EDIT CAMPAIGN
              </button>

              {c.status !== "ACTIVE" ? (
                <button
                  onClick={() => handleToggleStatus(c.id, "ACTIVE")}
                  disabled={loading}
                  className="border border-[var(--accent)] bg-transparent px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-[var(--accent)] hover:bg-[var(--accent)] hover:text-[#090909] cursor-pointer"
                >
                  SET ACTIVE
                </button>
              ) : (
                <button
                  onClick={() => handleToggleStatus(c.id, "DRAFT")}
                  disabled={loading}
                  className="border border-yellow-500 bg-transparent px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-yellow-400 hover:bg-yellow-500 hover:text-[#090909] cursor-pointer"
                >
                  SET DRAFT (HIDE)
                </button>
              )}

              <button
                onClick={() => handleToggleStatus(c.id, "ARCHIVED")}
                disabled={loading}
                className="border border-[var(--border)] bg-transparent px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-[var(--muted)] hover:text-red-400 cursor-pointer"
              >
                ARCHIVE
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
