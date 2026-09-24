"use client";

import { useState } from "react";
import Link from "next/link";
import type { Database } from "@/database/types";
import {
  createRaffleAdminAction,
  updateRaffleAdminAction,
  closeRaffleAdminAction,
  drawRaffleAdminAction,
} from "@/app/actions/admin";

type RaffleRow = Database["public"]["Tables"]["raffles"]["Row"];

interface RaffleManagerProps {
  raffles: RaffleRow[];
  entryCounts: Record<string, number>;
  winnerCounts: Record<string, number>;
}

export function RaffleManager({
  raffles,
  entryCounts,
  winnerCounts,
}: RaffleManagerProps) {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingRaffle, setEditingRaffle] = useState<RaffleRow | null>(null);
  const [closingRaffle, setClosingRaffle] = useState<RaffleRow | null>(null);
  const [drawingRaffle, setDrawingRaffle] = useState<RaffleRow | null>(null);

  // Create state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [accessCode, setAccessCode] = useState("");
  const [wlSpots, setWlSpots] = useState(10);
  const [status, setStatus] = useState<"DRAFT" | "OPEN">("OPEN");

  // Edit state
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editAccessCode, setEditAccessCode] = useState("");
  const [editWlSpots, setEditWlSpots] = useState(10);

  // Draw seed state
  const [secretSeed, setSecretSeed] = useState("");

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const resetCreateForm = () => {
    setTitle("");
    setDescription("");
    setAccessCode("");
    setWlSpots(10);
    setStatus("OPEN");
    setErrorMsg(null);
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    const res = await createRaffleAdminAction(
      title,
      description,
      accessCode,
      wlSpots,
      status
    );

    setLoading(false);
    if (!res.success) {
      setErrorMsg(res.error || "Failed to create raffle.");
      return;
    }

    setSuccessMsg(res.message || "Raffle created!");
    setIsCreateOpen(false);
    resetCreateForm();
  };

  const handleEditClick = (raffle: RaffleRow) => {
    setEditingRaffle(raffle);
    setEditTitle(raffle.title);
    setEditDescription(raffle.description || "");
    setEditAccessCode(raffle.access_code);
    setEditWlSpots(raffle.wl_spots);
    setErrorMsg(null);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRaffle) return;

    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    const res = await updateRaffleAdminAction(
      editingRaffle.id,
      editTitle,
      editDescription,
      editAccessCode,
      editWlSpots
    );

    setLoading(false);
    if (!res.success) {
      setErrorMsg(res.error || "Failed to update raffle.");
      return;
    }

    setSuccessMsg(res.message || "Raffle updated!");
    setEditingRaffle(null);
  };

  const handleConfirmClose = async () => {
    if (!closingRaffle) return;

    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    const res = await closeRaffleAdminAction(closingRaffle.id);
    setLoading(false);

    if (!res.success) {
      setErrorMsg(res.error || "Failed to close raffle.");
    } else {
      setSuccessMsg(res.message || "Raffle closed!");
      setClosingRaffle(null);
    }
  };

  const handleConfirmDraw = async () => {
    if (!drawingRaffle) return;

    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    const res = await drawRaffleAdminAction(drawingRaffle.id, secretSeed || undefined);
    setLoading(false);

    if (!res.success) {
      setErrorMsg(res.error || "Draw failed.");
    } else {
      setSuccessMsg(res.message || "Draw completed successfully!");
      setDrawingRaffle(null);
      setSecretSeed("");
    }
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

      {/* Header bar */}
      <div className="flex items-center justify-between border-b border-[var(--border)] pb-4">
        <h2 className="text-sm font-black uppercase tracking-[0.2em] text-[var(--muted)]">
          RAFFLE REGISTRY & OPERATIONS ({raffles.length})
        </h2>

        <button
          onClick={() => {
            resetCreateForm();
            setIsCreateOpen(true);
          }}
          className="border border-[var(--accent)] bg-[var(--accent)] px-5 py-2 text-xs font-black uppercase tracking-[0.18em] text-black hover:opacity-90"
        >
          + CREATE RAFFLE
        </button>
      </div>

      {/* Table */}
      <div className="border border-[var(--border)] bg-[#0d0d0d]">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="border-b border-[var(--border)] bg-[#141414] uppercase text-[var(--muted)]">
              <tr>
                <th className="px-4 py-3 font-bold">Access Code</th>
                <th className="px-4 py-3 font-bold">Raffle Title</th>
                <th className="px-4 py-3 font-bold">WL Spots</th>
                <th className="px-4 py-3 font-bold">Total Entries</th>
                <th className="px-4 py-3 font-bold">Winners</th>
                <th className="px-4 py-3 font-bold">Status</th>
                <th className="px-4 py-3 font-bold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {raffles.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-[var(--muted)]">
                    No raffles created yet. Click &quot;+ CREATE RAFFLE&quot; to start.
                  </td>
                </tr>
              ) : (
                raffles.map((r) => (
                  <tr key={r.id} className="hover:bg-[#121212]">
                    <td className="px-4 py-3">
                      <span className="border border-[var(--accent)]/40 bg-[rgba(183,255,0,0.05)] px-2 py-0.5 font-bold text-[var(--accent)]">
                        {r.access_code}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-bold text-[var(--foreground)]">{r.title}</div>
                      {r.description && (
                        <div className="text-[10px] text-[var(--muted)] truncate max-w-[220px]">
                          {r.description}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 font-bold text-[var(--foreground)]">
                      {r.wl_spots} SPOTS
                    </td>
                    <td className="px-4 py-3 text-[var(--muted)]">
                      {entryCounts[r.id] || 0} tickets
                    </td>
                    <td className="px-4 py-3 font-bold text-emerald-400">
                      {winnerCounts[r.id] || 0} users
                    </td>
                    <td className="px-4 py-3">
                      {r.status === "OPEN" && (
                        <span className="border border-emerald-500/30 bg-emerald-950/20 px-2 py-0.5 text-[10px] font-bold text-emerald-400">
                          OPEN
                        </span>
                      )}
                      {r.status === "CLOSED" && (
                        <span className="border border-amber-500/40 bg-amber-950/20 px-2 py-0.5 text-[10px] font-bold text-amber-400">
                          CLOSED (FROZEN)
                        </span>
                      )}
                      {r.status === "DRAWN" && (
                        <span className="border border-purple-500/40 bg-purple-950/20 px-2 py-0.5 text-[10px] font-bold text-purple-300">
                          DRAWN
                        </span>
                      )}
                      {r.status === "DRAFT" && (
                        <span className="border border-neutral-700 bg-neutral-900 px-2 py-0.5 text-[10px] font-bold text-neutral-400">
                          DRAFT
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {r.status === "OPEN" && (
                          <button
                            onClick={() => setClosingRaffle(r)}
                            disabled={loading}
                            className="border border-amber-500 bg-amber-950/30 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-amber-400 hover:bg-amber-900/50"
                          >
                            CLOSE RAFFLE
                          </button>
                        )}

                        {r.status === "CLOSED" && (
                          <button
                            onClick={() => {
                              setDrawingRaffle(r);
                              setSecretSeed("");
                            }}
                            disabled={loading}
                            className="border border-purple-500 bg-purple-950/40 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-purple-300 hover:bg-purple-900/60"
                          >
                            EXECUTE DRAW
                          </button>
                        )}

                        {r.status === "DRAWN" && (
                          <Link
                            href={`/draw-verification/${r.id}`}
                            className="border border-[var(--accent)] bg-[rgba(183,255,0,0.1)] px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-[var(--accent)] hover:bg-[var(--accent)] hover:text-black"
                          >
                            VERIFY DRAW →
                          </Link>
                        )}

                        {r.status !== "CLOSED" && r.status !== "DRAWN" && (
                          <button
                            onClick={() => handleEditClick(r)}
                            className="border border-[var(--border)] bg-[#1a1a1a] px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-[var(--muted)] hover:text-[var(--foreground)]"
                          >
                            EDIT
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CREATE MODAL */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <div className="w-full max-w-lg border border-[var(--border)] bg-[#0d0d0d] p-6">
            <h2 className="text-xl font-black uppercase tracking-wider text-[var(--foreground)]">
              Create New Raffle
            </h2>
            <form onSubmit={handleCreateSubmit} className="mt-4 flex flex-col gap-4 text-xs font-mono">
              <div>
                <label className="block uppercase text-[var(--muted)] font-bold mb-1">
                  Raffle Title
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Genesis ZECHIMP Whitelist Round 1"
                  className="w-full border border-[var(--border)] bg-[#141414] p-2 text-[var(--foreground)]"
                />
              </div>

              <div>
                <label className="block uppercase text-[var(--muted)] font-bold mb-1">
                  Access Code (Unique Identifier)
                </label>
                <input
                  type="text"
                  required
                  value={accessCode}
                  onChange={(e) => setAccessCode(e.target.value.toUpperCase())}
                  placeholder="e.g. ZECHIMP-GENESIS-WL"
                  className="w-full border border-[var(--border)] bg-[#141414] p-2 text-[var(--foreground)] uppercase"
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
                  placeholder="Raffle details and rewards..."
                  className="w-full border border-[var(--border)] bg-[#141414] p-2 text-[var(--foreground)]"
                />
              </div>

              <div>
                <label className="block uppercase text-[var(--muted)] font-bold mb-1">
                  WL Spots Available
                </label>
                <input
                  type="number"
                  required
                  min={1}
                  value={wlSpots}
                  onChange={(e) => setWlSpots(parseInt(e.target.value) || 1)}
                  className="w-full border border-[var(--border)] bg-[#141414] p-2 text-[var(--foreground)]"
                />
              </div>

              <div>
                <label className="block uppercase text-[var(--muted)] font-bold mb-1">
                  Initial Status
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as "DRAFT" | "OPEN")}
                  className="w-full border border-[var(--border)] bg-[#141414] p-2 text-[var(--foreground)]"
                >
                  <option value="OPEN">OPEN (Accepting entries)</option>
                  <option value="DRAFT">DRAFT (Hidden / Internal)</option>
                </select>
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
                  {loading ? "SAVING..." : "CREATE RAFFLE"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT MODAL */}
      {editingRaffle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <div className="w-full max-w-lg border border-[var(--border)] bg-[#0d0d0d] p-6">
            <h2 className="text-xl font-black uppercase tracking-wider text-[var(--foreground)]">
              Edit Raffle
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
                  Access Code
                </label>
                <input
                  type="text"
                  required
                  value={editAccessCode}
                  onChange={(e) => setEditAccessCode(e.target.value.toUpperCase())}
                  className="w-full border border-[var(--border)] bg-[#141414] p-2 text-[var(--foreground)] uppercase"
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
                  WL Spots
                </label>
                <input
                  type="number"
                  required
                  min={1}
                  value={editWlSpots}
                  onChange={(e) => setEditWlSpots(parseInt(e.target.value) || 1)}
                  className="w-full border border-[var(--border)] bg-[#141414] p-2 text-[var(--foreground)]"
                />
              </div>

              <div className="mt-4 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setEditingRaffle(null)}
                  className="border border-[var(--border)] bg-[#141414] px-4 py-2 font-bold uppercase text-[var(--muted)]"
                >
                  CANCEL
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="border border-[var(--accent)] bg-[var(--accent)] px-5 py-2 font-black uppercase text-black"
                >
                  {loading ? "SAVING..." : "UPDATE RAFFLE"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CLOSE RAFFLE CONFIRMATION MODAL */}
      {closingRaffle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <div className="w-full max-w-md border border-amber-500 bg-[#0d0d0d] p-6">
            <div className="inline-flex items-center gap-2 border border-amber-500 bg-amber-950/40 px-2.5 py-0.5 text-[10px] font-black text-amber-400">
              FREEZE ENTRIES SNAPSHOT
            </div>
            <h2 className="mt-3 text-lg font-black uppercase text-[var(--foreground)]">
              Close Raffle: {closingRaffle.title}?
            </h2>
            <p className="mt-2 text-xs font-mono text-[var(--muted)] leading-relaxed">
              Closing this raffle will transition its status to <strong className="text-amber-400">CLOSED</strong> and prevent any further ticket commitments. All committed entries will be frozen for the draw.
            </p>

            <div className="mt-6 flex items-center justify-end gap-3 font-mono text-xs">
              <button
                type="button"
                onClick={() => setClosingRaffle(null)}
                className="border border-[var(--border)] bg-[#141414] px-4 py-2 font-bold uppercase text-[var(--muted)]"
              >
                CANCEL
              </button>
              <button
                type="button"
                onClick={handleConfirmClose}
                disabled={loading}
                className="border border-amber-500 bg-amber-600 px-5 py-2 font-black uppercase text-black hover:bg-amber-500"
              >
                {loading ? "CLOSING..." : "CONFIRM & CLOSE RAFFLE"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EXECUTE DRAW CONFIRMATION MODAL */}
      {drawingRaffle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <div className="w-full max-w-lg border border-purple-500 bg-[#0d0d0d] p-6">
            <div className="inline-flex items-center gap-2 border border-purple-500 bg-purple-950/40 px-2.5 py-0.5 text-[10px] font-black text-purple-300">
              HMAC-SHA256 DETERMINISTIC DRAW ENGINE
            </div>
            <h2 className="mt-3 text-xl font-black uppercase text-[var(--foreground)]">
              Execute Draw: {drawingRaffle.title}
            </h2>
            <div className="mt-3 text-xs font-mono text-[var(--muted)] space-y-2">
              <p>
                This operation will select up to <strong>{drawingRaffle.wl_spots} unique winning users</strong> from the frozen snapshot hash of {entryCounts[drawingRaffle.id] || 0} ticket entries using PRNG HMAC-SHA256.
              </p>
              <p className="text-amber-400/90 font-bold">
                ⚠️ Executing the draw is idempotent and irreversible.
              </p>
            </div>

            <div className="mt-4 flex flex-col gap-2 font-mono text-xs">
              <label className="uppercase text-[var(--muted)] font-bold">
                Secret Seed String (Optional)
              </label>
              <input
                type="text"
                value={secretSeed}
                onChange={(e) => setSecretSeed(e.target.value)}
                placeholder="Leave blank to auto-generate random server seed"
                className="w-full border border-[var(--border)] bg-[#141414] p-2 text-[var(--foreground)]"
              />
              <span className="text-[10px] text-[var(--muted)]">
                If specified, this seed will be hashed with SHA256 and stored in audit logs.
              </span>
            </div>

            <div className="mt-6 flex items-center justify-end gap-3 font-mono text-xs">
              <button
                type="button"
                onClick={() => setDrawingRaffle(null)}
                className="border border-[var(--border)] bg-[#141414] px-4 py-2 font-bold uppercase text-[var(--muted)]"
              >
                CANCEL
              </button>
              <button
                type="button"
                onClick={handleConfirmDraw}
                disabled={loading}
                className="border border-purple-500 bg-purple-600 px-5 py-2 font-black uppercase text-white hover:bg-purple-500"
              >
                {loading ? "DRAWING..." : "CONFIRM & EXECUTE DRAW"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
