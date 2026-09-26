"use client";

import { useState } from "react";
import Link from "next/link";
import type { Database } from "@/database/types";
import type { AdminClaimDetail, ClaimStats } from "./page";
import {
  createRaffleAdminAction,
  updateRaffleAdminAction,
  closeRaffleAdminAction,
  drawRaffleAdminAction,
  exportClaimedWalletsCSVAdminAction,
  overrideWalletAddressAdminAction,
} from "@/app/actions/admin";

type RaffleRow = Database["public"]["Tables"]["raffles"]["Row"];

interface RaffleManagerProps {
  raffles: RaffleRow[];
  entryCounts: Record<string, number>;
  winnerCounts: Record<string, number>;
  claimStats: Record<string, ClaimStats>;
  claimsMap: Record<string, AdminClaimDetail[]>;
}

export function RaffleManager({
  raffles,
  entryCounts,
  winnerCounts,
  claimStats,
  claimsMap,
}: RaffleManagerProps) {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingRaffle, setEditingRaffle] = useState<RaffleRow | null>(null);
  const [closingRaffle, setClosingRaffle] = useState<RaffleRow | null>(null);
  const [drawingRaffle, setDrawingRaffle] = useState<RaffleRow | null>(null);
  const [inspectingRaffle, setInspectingRaffle] = useState<RaffleRow | null>(null);

  // Admin wallet override modal state
  const [overridingClaim, setOverridingClaim] = useState<AdminClaimDetail | null>(null);
  const [newWalletAddress, setNewWalletAddress] = useState("");

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
  const [exporting, setExporting] = useState<string | null>(null);
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

  const handleExportCSV = async (raffleId: string, format: "wallet_only" | "full") => {
    setExporting(raffleId);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const res = await exportClaimedWalletsCSVAdminAction(raffleId, format);
      if (res.success && res.csvContent && res.filename) {
        // Trigger browser download
        const blob = new Blob([res.csvContent], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", res.filename);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        setSuccessMsg(`Exported ${res.filename} successfully!`);
      } else {
        setErrorMsg(res.error || "Failed to export CSV.");
      }
    } catch {
      setErrorMsg("An error occurred during CSV export.");
    } finally {
      setExporting(null);
    }
  };

  const handleOverrideSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!overridingClaim) return;

    setLoading(true);
    setErrorMsg(null);

    const res = await overrideWalletAddressAdminAction(
      overridingClaim.claim_id,
      newWalletAddress
    );

    setLoading(false);

    if (!res.success) {
      setErrorMsg(res.error || "Failed to override wallet address.");
    } else {
      setSuccessMsg(res.message || "Wallet address overridden!");
      setOverridingClaim(null);
      setNewWalletAddress("");
      // Update locally if inspecting
      if (inspectingRaffle) {
        const list = claimsMap[inspectingRaffle.id];
        if (list) {
          const item = list.find((c) => c.claim_id === overridingClaim.claim_id);
          if (item) {
            item.wallet_address = newWalletAddress.trim();
            item.status = "CLAIMED";
          }
        }
      }
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
          className="border border-[var(--accent)] bg-[var(--accent)] px-5 py-2 text-xs font-black uppercase tracking-[0.18em] text-black hover:opacity-90 cursor-pointer"
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
                <th className="px-4 py-3 font-bold">Claim Monitoring</th>
                <th className="px-4 py-3 font-bold">Status</th>
                <th className="px-4 py-3 font-bold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {raffles.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-[var(--muted)]">
                    No raffles created yet. Click &quot;+ CREATE RAFFLE&quot; to start.
                  </td>
                </tr>
              ) : (
                raffles.map((r) => {
                  const stats = claimStats[r.id] || { claimed: 0, pending: 0, expired: 0 };
                  const totalWin = winnerCounts[r.id] || 0;

                  return (
                    <tr key={r.id} className="hover:bg-[#121212]">
                      <td className="px-4 py-3">
                        <span className="border border-[var(--accent)]/40 bg-[rgba(183,255,0,0.05)] px-2 py-0.5 font-bold text-[var(--accent)]">
                          {r.access_code}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-bold text-[var(--foreground)]">{r.title}</div>
                        {r.description && (
                          <div className="text-[10px] text-[var(--muted)] truncate max-w-[200px]">
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
                        {totalWin} users
                      </td>
                      <td className="px-4 py-3">
                        {r.status === "DRAWN" ? (
                          <div className="flex flex-col gap-0.5 text-[10px] font-mono">
                            <div className="flex justify-between gap-3 text-emerald-400 font-bold">
                              <span>CLAIMED</span>
                              <span>{stats.claimed}</span>
                            </div>
                            <div className="flex justify-between gap-3 text-amber-400">
                              <span>PENDING</span>
                              <span>{stats.pending}</span>
                            </div>
                            {stats.expired > 0 && (
                              <div className="flex justify-between gap-3 text-red-400">
                                <span>EXPIRED</span>
                                <span>{stats.expired}</span>
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-[10px] text-[var(--muted)]">N/A (NOT DRAWN)</span>
                        )}
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
                        <div className="flex flex-wrap items-center justify-end gap-2">
                          {r.status === "OPEN" && (
                            <button
                              onClick={() => setClosingRaffle(r)}
                              disabled={loading}
                              className="border border-amber-500 bg-amber-950/30 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-amber-400 hover:bg-amber-900/50 cursor-pointer"
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
                              className="border border-purple-500 bg-purple-950/40 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-purple-300 hover:bg-purple-900/60 cursor-pointer"
                            >
                              EXECUTE DRAW
                            </button>
                          )}

                          {r.status === "DRAWN" && (
                            <>
                              <button
                                onClick={() => setInspectingRaffle(r)}
                                className="border border-blue-500 bg-blue-950/30 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-blue-400 hover:bg-blue-900/50 cursor-pointer"
                              >
                                INSPECT CLAIMS
                              </button>

                              <button
                                onClick={() => handleExportCSV(r.id, "full")}
                                disabled={exporting === r.id || stats.claimed === 0}
                                className="border border-emerald-500 bg-emerald-950/40 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-emerald-400 hover:bg-emerald-900/60 disabled:opacity-40 cursor-pointer"
                              >
                                {exporting === r.id ? "EXPORTING..." : "EXPORT CSV"}
                              </button>

                              <Link
                                href={`/draw-verification/${r.id}`}
                                className="border border-[var(--accent)] bg-[rgba(183,255,0,0.1)] px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-[var(--accent)] hover:bg-[var(--accent)] hover:text-black"
                              >
                                VERIFY DRAW →
                              </Link>
                            </>
                          )}

                          {r.status !== "CLOSED" && r.status !== "DRAWN" && (
                            <button
                              onClick={() => handleEditClick(r)}
                              className="border border-[var(--border)] bg-[#1a1a1a] px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-[var(--muted)] hover:text-[var(--foreground)] cursor-pointer"
                            >
                              EDIT
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* INSPECT CLAIMS MODAL */}
      {inspectingRaffle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4">
          <div className="w-full max-w-4xl border border-blue-500 bg-[#0d0d0d] p-6 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-4">
              <div>
                <span className="text-[10px] font-mono font-bold uppercase text-blue-400 border border-blue-500/40 bg-blue-950/40 px-2 py-0.5">
                  WL CLAIM MONITORING & INSPECTION
                </span>
                <h2 className="mt-2 text-xl font-black text-[var(--foreground)] uppercase">
                  {inspectingRaffle.title} ({inspectingRaffle.access_code})
                </h2>
              </div>
              <button
                onClick={() => setInspectingRaffle(null)}
                className="text-xs font-mono font-bold text-[var(--muted)] hover:text-white cursor-pointer border border-[var(--border)] px-3 py-1"
              >
                ✕ CLOSE
              </button>
            </div>

            {/* Stats Summary Bar */}
            <div className="my-4 grid grid-cols-4 gap-3 font-mono text-xs text-center border border-[var(--border)] bg-[#121212] p-3">
              <div>
                <span className="block text-[10px] text-[var(--muted)] font-bold uppercase">Total Winners</span>
                <span className="text-base font-black text-white">{winnerCounts[inspectingRaffle.id] || 0}</span>
              </div>
              <div>
                <span className="block text-[10px] text-[var(--muted)] font-bold uppercase">Claimed & Locked</span>
                <span className="text-base font-black text-emerald-400">{claimStats[inspectingRaffle.id]?.claimed || 0}</span>
              </div>
              <div>
                <span className="block text-[10px] text-[var(--muted)] font-bold uppercase">Pending</span>
                <span className="text-base font-black text-amber-400">{claimStats[inspectingRaffle.id]?.pending || 0}</span>
              </div>
              <div>
                <span className="block text-[10px] text-[var(--muted)] font-bold uppercase">Expired</span>
                <span className="text-base font-black text-red-400">{claimStats[inspectingRaffle.id]?.expired || 0}</span>
              </div>
            </div>

            {/* CSV Export Bar inside modal */}
            <div className="mb-4 flex items-center justify-between border border-emerald-500/30 bg-emerald-950/10 p-3 text-xs font-mono">
              <span className="text-emerald-400 font-bold uppercase">
                Export Options (Claimed + Locked Wallets Only):
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleExportCSV(inspectingRaffle.id, "wallet_only")}
                  disabled={exporting === inspectingRaffle.id || (claimStats[inspectingRaffle.id]?.claimed || 0) === 0}
                  className="border border-emerald-500 bg-emerald-950/40 px-3 py-1 text-[10px] font-bold uppercase text-emerald-400 hover:bg-emerald-900/60 disabled:opacity-40 cursor-pointer"
                >
                  EXPORT WALLET LIST (CSV)
                </button>
                <button
                  onClick={() => handleExportCSV(inspectingRaffle.id, "full")}
                  disabled={exporting === inspectingRaffle.id || (claimStats[inspectingRaffle.id]?.claimed || 0) === 0}
                  className="border border-emerald-500 bg-emerald-500 px-3 py-1 text-[10px] font-black uppercase text-black hover:bg-emerald-400 disabled:opacity-40 cursor-pointer"
                >
                  EXPORT FULL CLAIM DATA (CSV)
                </button>
              </div>
            </div>

            {/* Winners & Claims Detail Table */}
            <div className="overflow-y-auto flex-1 border border-[var(--border)] bg-[#121212]">
              <table className="w-full text-left text-xs font-mono">
                <thead className="border-b border-[var(--border)] bg-[#1a1a1a] uppercase text-[var(--muted)] sticky top-0">
                  <tr>
                    <th className="px-3 py-2 font-bold">Pos</th>
                    <th className="px-3 py-2 font-bold">X Username</th>
                    <th className="px-3 py-2 font-bold">User ID</th>
                    <th className="px-3 py-2 font-bold">Wallet Address</th>
                    <th className="px-3 py-2 font-bold">Status</th>
                    <th className="px-3 py-2 font-bold">Claimed At</th>
                    <th className="px-3 py-2 font-bold text-right">Admin Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {(claimsMap[inspectingRaffle.id] || []).length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-6 text-center text-[var(--muted)]">
                        No winners found for this raffle.
                      </td>
                    </tr>
                  ) : (
                    claimsMap[inspectingRaffle.id].map((detail) => (
                      <tr key={detail.raffle_winner_id} className="hover:bg-[#181818]">
                        <td className="px-3 py-2 font-bold text-[var(--accent)]">
                          #{detail.winner_position}
                        </td>
                        <td className="px-3 py-2 font-bold text-[var(--foreground)]">
                          {detail.username.startsWith("@") ? detail.username : `@${detail.username}`}
                        </td>
                        <td className="px-3 py-2 text-[10px] text-[var(--muted)] truncate max-w-[100px]">
                          {detail.user_id}
                        </td>
                        <td className="px-3 py-2 font-mono break-all max-w-[200px]">
                          {detail.wallet_address ? (
                            <span className="text-emerald-400 font-bold">{detail.wallet_address}</span>
                          ) : (
                            <span className="text-[var(--muted)] italic">[ UNCLAIMED ]</span>
                          )}
                        </td>
                        <td className="px-3 py-2">
                          {detail.status === "CLAIMED" && (
                            <span className="border border-emerald-500/40 bg-emerald-950/20 px-2 py-0.5 text-[10px] font-bold text-emerald-400">
                              CLAIMED
                            </span>
                          )}
                          {detail.status === "CLAIMABLE" && (
                            <span className="border border-amber-500/40 bg-amber-950/20 px-2 py-0.5 text-[10px] font-bold text-amber-400">
                              PENDING
                            </span>
                          )}
                          {detail.status === "EXPIRED" && (
                            <span className="border border-red-500/40 bg-red-950/20 px-2 py-0.5 text-[10px] font-bold text-red-400">
                              EXPIRED
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-[10px] text-[var(--muted)]">
                          {detail.claimed_at ? new Date(detail.claimed_at).toLocaleString() : "-"}
                        </td>
                        <td className="px-3 py-2 text-right">
                          {detail.claim_id && (
                            <button
                              onClick={() => {
                                setOverridingClaim(detail);
                                setNewWalletAddress(detail.wallet_address);
                              }}
                              className="border border-yellow-500/50 bg-yellow-950/30 px-2 py-0.5 text-[10px] font-bold uppercase text-yellow-400 hover:bg-yellow-900/50 cursor-pointer"
                            >
                              OVERRIDE WALLET
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ADMIN OVERRIDE WALLET MODAL */}
      {overridingClaim && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4">
          <div className="w-full max-w-md border border-yellow-500 bg-[#0d0d0d] p-6 font-mono text-xs">
            <div className="inline-flex items-center gap-2 border border-yellow-500 bg-yellow-950/40 px-2 py-0.5 text-[10px] font-black text-yellow-400">
              ADMIN WALLET OVERRIDE (AUDITED)
            </div>

            <h2 className="mt-3 text-lg font-black uppercase text-[var(--foreground)]">
              Override Wallet for Pos #{overridingClaim.winner_position} ({overridingClaim.username})
            </h2>

            <form onSubmit={handleOverrideSubmit} className="mt-4 flex flex-col gap-4">
              <div>
                <label className="block text-[10px] text-[var(--muted)] font-bold uppercase mb-1">
                  Current Wallet
                </label>
                <div className="p-2 border border-[var(--border)] bg-[#141414] text-[var(--muted)] break-all">
                  {overridingClaim.wallet_address || "[ UNCLAIMED ]"}
                </div>
              </div>

              <div>
                <label className="block text-[10px] text-[var(--muted)] font-bold uppercase mb-1">
                  New EVM Wallet Address
                </label>
                <input
                  type="text"
                  required
                  placeholder="0x..."
                  value={newWalletAddress}
                  onChange={(e) => setNewWalletAddress(e.target.value)}
                  className="w-full p-2 border border-[var(--border)] bg-[#141414] text-[var(--foreground)] focus:border-yellow-500 focus:outline-none"
                />
              </div>

              <div className="border border-amber-500/30 bg-amber-950/20 p-2.5 text-[10px] text-amber-300 leading-relaxed">
                ⚠️ This administrative override will be permanently recorded in <code>admin_audit_logs</code>. The original draw result remains completely unchanged.
              </div>

              <div className="mt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setOverridingClaim(null)}
                  className="border border-[var(--border)] bg-[#141414] px-4 py-2 font-bold uppercase text-[var(--muted)]"
                >
                  CANCEL
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="border border-yellow-500 bg-yellow-500 px-5 py-2 font-black uppercase text-black hover:bg-yellow-400 cursor-pointer disabled:opacity-50"
                >
                  {loading ? "OVERRIDING..." : "CONFIRM OVERRIDE"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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
                  className="border border-[var(--border)] bg-[#141414] px-4 py-2 font-bold uppercase text-[var(--muted)] cursor-pointer"
                >
                  CANCEL
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="border border-[var(--accent)] bg-[var(--accent)] px-5 py-2 font-black uppercase text-black cursor-pointer"
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
                  className="border border-[var(--border)] bg-[#141414] px-4 py-2 font-bold uppercase text-[var(--muted)] cursor-pointer"
                >
                  CANCEL
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="border border-[var(--accent)] bg-[var(--accent)] px-5 py-2 font-black uppercase text-black cursor-pointer"
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
                className="border border-[var(--border)] bg-[#141414] px-4 py-2 font-bold uppercase text-[var(--muted)] cursor-pointer"
              >
                CANCEL
              </button>
              <button
                type="button"
                onClick={handleConfirmClose}
                disabled={loading}
                className="border border-amber-500 bg-amber-600 px-5 py-2 font-black uppercase text-black hover:bg-amber-500 cursor-pointer"
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
                className="border border-[var(--border)] bg-[#141414] px-4 py-2 font-bold uppercase text-[var(--muted)] cursor-pointer"
              >
                CANCEL
              </button>
              <button
                type="button"
                onClick={handleConfirmDraw}
                disabled={loading}
                className="border border-purple-500 bg-purple-600 px-5 py-2 font-black uppercase text-white hover:bg-purple-500 cursor-pointer"
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
