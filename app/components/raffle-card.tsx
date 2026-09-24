"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  joinRaffleAction,
  closeRaffleAction,
  drawRaffleAction,
} from "@/app/actions/raffles";
import type { Database } from "@/database/types";

type RaffleRow = Database["public"]["Tables"]["raffles"]["Row"];

export type WinnerInfo = {
  winner_position: number;
  user_id: string;
  entry_id: string;
  username?: string | null;
  display_name?: string | null;
};

interface RaffleCardProps {
  raffle: RaffleRow | null;
  userCommittedTickets: number;
  totalPoolEntries: number;
  availableTickets: number;
  winners: WinnerInfo[];
  currentUserId: string;
}

export function RaffleCard({
  raffle,
  userCommittedTickets,
  totalPoolEntries,
  availableTickets,
  winners,
  currentUserId,
}: RaffleCardProps) {
  const [loading, setLoading] = useState(false);
  const [ticketAmount, setTicketAmount] = useState<number>(1);
  const [accessCode, setAccessCode] = useState<string>("");
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [seeding, setSeeding] = useState(false);

  const router = useRouter();

  const isUserWinner = winners.some((w) => w.user_id === currentUserId);
  const userWinningPosition = winners.find((w) => w.user_id === currentUserId)?.winner_position;

  const handleJoin = async () => {
    if (!raffle) return;
    setFeedback(null);

    if (ticketAmount <= 0) {
      setFeedback({ type: "error", text: "Please enter a valid ticket quantity." });
      return;
    }

    if (ticketAmount > availableTickets) {
      setFeedback({
        type: "error",
        text: `Insufficient available tickets (${availableTickets} available).`,
      });
      return;
    }

    setLoading(true);

    try {
      const res = await joinRaffleAction(raffle.id, ticketAmount, accessCode);
      if (res.success) {
        setFeedback({ type: "success", text: res.message || "Joined raffle!" });
        setTicketAmount(1);
        setAccessCode("");
        router.refresh();
      } else {
        setFeedback({ type: "error", text: res.error || "Failed to join raffle." });
      }
    } catch {
      setFeedback({ type: "error", text: "An unexpected error occurred." });
    } finally {
      setLoading(false);
    }
  };

  const handleCloseRaffle = async () => {
    if (!raffle) return;
    setLoading(true);
    setFeedback(null);
    try {
      const res = await closeRaffleAction(raffle.id);
      if (res.success) {
        setFeedback({ type: "success", text: res.message || "Raffle closed!" });
        router.refresh();
      } else {
        setFeedback({ type: "error", text: res.error || "Failed to close raffle." });
      }
    } catch {
      setFeedback({ type: "error", text: "An unexpected error occurred." });
    } finally {
      setLoading(false);
    }
  };

  const handleExecuteDraw = async () => {
    if (!raffle) return;
    setLoading(true);
    setFeedback(null);
    try {
      const res = await drawRaffleAction(raffle.id);
      if (res.success) {
        setFeedback({ type: "success", text: res.message || "Draw completed!" });
        router.refresh();
      } else {
        setFeedback({ type: "error", text: res.error || "Failed to execute draw." });
      }
    } catch {
      setFeedback({ type: "error", text: "An unexpected error occurred." });
    } finally {
      setLoading(false);
    }
  };

  const handleSeedRaffle = async () => {
    setSeeding(true);
    try {
      const res = await fetch("/api/dev/seed-raffle", { method: "POST" });
      if (res.ok) {
        router.refresh();
      }
    } catch (err) {
      console.error("Failed to seed raffle:", err);
    } finally {
      setSeeding(false);
    }
  };

  const getStatusBadge = (status: RaffleRow["status"]) => {
    switch (status) {
      case "OPEN":
        return (
          <span className="inline-flex items-center gap-1.5 border border-[var(--accent)] bg-[rgba(183,255,0,0.1)] px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-[var(--accent)]">
            <span className="h-2 w-2 rounded-full bg-[var(--accent)] animate-pulse" />
            OPEN FOR ENTRIES
          </span>
        );
      case "CLOSED":
        return (
          <span className="inline-flex items-center gap-1.5 border border-yellow-500 bg-yellow-500/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-yellow-400">
            ENTRIES FROZEN
          </span>
        );
      case "DRAWN":
        return (
          <span className="inline-flex items-center gap-1.5 border border-blue-500 bg-blue-500/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-blue-400">
            DRAWN & IMMUTABLE
          </span>
        );
      default:
        return (
          <span className="border border-[var(--border)] bg-[#121212] px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-[var(--muted)]">
            DRAFT
          </span>
        );
    }
  };

  return (
    <div className="border border-[var(--border)] bg-[var(--background-raised)] p-6 sm:p-8">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[var(--border)] pb-4">
        <h3 className="text-xs font-black uppercase tracking-[0.22em] text-[var(--muted)]">
          ZECHIMP Whitelist Raffle Engine
        </h3>
        {raffle && getStatusBadge(raffle.status)}
      </div>

      {!raffle ? (
        <div className="py-8 text-center">
          <h4 className="text-lg font-black text-[var(--foreground)]">
            No Active Raffle Found
          </h4>
          <p className="mt-2 text-sm text-[var(--muted)]">
            Click below to create a test whitelist raffle with 5 WL spots.
          </p>
          <button
            onClick={handleSeedRaffle}
            disabled={seeding}
            className="mt-6 inline-flex items-center gap-2 border border-[var(--accent)] bg-[var(--accent)] px-6 py-3 text-xs font-black uppercase tracking-[0.2em] text-[#090909] transition-all hover:bg-transparent hover:text-[var(--accent)] disabled:opacity-50 cursor-pointer"
          >
            {seeding ? "SEEDING RAFFLE..." : "SEED DEV RAFFLE"}
          </button>
        </div>
      ) : (
        <div className="mt-6 flex flex-col gap-6">
          {/* Winner Banner if DRAWN and User Won */}
          {raffle.status === "DRAWN" && isUserWinner && (
            <div className="border border-[var(--accent)] bg-[rgba(183,255,0,0.15)] p-5 text-center">
              <span className="text-xs font-black uppercase tracking-[0.25em] text-[var(--accent)]">
                ★ CONGRATULATIONS! YOU WON A WHITELIST SPOT ★
              </span>
              <p className="mt-2 text-2xl font-black text-[var(--foreground)]">
                WINNING POSITION #{userWinningPosition}
              </p>
              <p className="mt-1 text-xs text-[var(--muted)]">
                Your spot has been permanently secured on the ZECHIMP Genesis Whitelist.
              </p>
            </div>
          )}

          {/* Raffle Title & Description */}
          <div>
            <h2 className="text-3xl font-black text-[var(--foreground)] sm:text-4xl">
              {raffle.title}
            </h2>
            {raffle.description && (
              <p className="mt-3 max-w-2xl text-sm text-[var(--muted)] leading-relaxed">
                {raffle.description}
              </p>
            )}
          </div>

          {/* Metrics Grid */}
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="border border-[var(--border)] bg-[#090909] p-4">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--muted)]">
                Whitelist Spots
              </p>
              <p className="mt-2 text-3xl font-black text-[var(--accent)]">
                {raffle.wl_spots} <span className="text-xs font-bold text-[var(--foreground)]">SPOTS</span>
              </p>
            </div>

            <div className="border border-[var(--border)] bg-[#090909] p-4">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--muted)]">
                Your Committed Entries
              </p>
              <p className="mt-2 text-3xl font-black text-[var(--foreground)]">
                {userCommittedTickets} <span className="text-xs font-bold text-[var(--muted)]">TICKETS</span>
              </p>
            </div>

            <div className="border border-[var(--border)] bg-[#090909] p-4">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--muted)]">
                Total Pool Entries
              </p>
              <p className="mt-2 text-3xl font-black text-[var(--foreground)]">
                {totalPoolEntries} <span className="text-xs font-bold text-[var(--muted)]">ENTRIES</span>
              </p>
            </div>
          </div>

          {/* User-Facing Principle Note */}
          <div className="border border-[var(--border)] bg-[#121212] p-4 text-xs font-mono text-[var(--muted)]">
            <span className="text-[var(--accent)] font-bold">PRINCIPLE:</span> &quot;Tickets enter the draw. They don&apos;t guarantee a spot.&quot; Each ticket committed increases your probability in the deterministic draw.
          </div>

          {/* Feedback message */}
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

          {/* Action Form (OPEN status) */}
          {raffle.status === "OPEN" && (
            <div className="border border-[var(--border)] bg-[#090909] p-6">
              <h4 className="text-xs font-black uppercase tracking-[0.2em] text-[var(--foreground)]">
                Commit Tickets to Join
              </h4>

              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                {/* Access Code Input if required */}
                {raffle.access_code && (
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--muted)]">
                      Access Code Required
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. GENESIS-2026"
                      value={accessCode}
                      onChange={(e) => setAccessCode(e.target.value)}
                      className="mt-1 w-full border border-[var(--border)] bg-[#121212] px-3 py-2 text-xs font-mono text-[var(--foreground)] focus:border-[var(--accent)] focus:outline-none"
                    />
                  </div>
                )}

                {/* Ticket Quantity Selector */}
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--muted)]">
                    Tickets to Commit ({availableTickets} available)
                  </label>
                  <div className="mt-1 flex items-center gap-2">
                    <input
                      type="number"
                      min={1}
                      max={availableTickets}
                      value={ticketAmount}
                      onChange={(e) => setTicketAmount(Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-full border border-[var(--border)] bg-[#121212] px-3 py-2 text-xs font-mono text-[var(--foreground)] focus:border-[var(--accent)] focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setTicketAmount(availableTickets)}
                      className="border border-[var(--border)] bg-[#121212] px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-[var(--muted)] hover:text-[var(--accent)]"
                    >
                      MAX
                    </button>
                  </div>
                </div>
              </div>

              <div className="mt-6">
                <button
                  onClick={handleJoin}
                  disabled={loading || availableTickets <= 0}
                  className="w-full sm:w-auto inline-flex items-center justify-center border border-[var(--accent)] bg-[var(--accent)] px-8 py-3.5 text-xs font-black uppercase tracking-[0.2em] text-[#090909] transition-all hover:bg-transparent hover:text-[var(--accent)] disabled:opacity-50 cursor-pointer"
                >
                  {loading ? "COMMITTING..." : "JOIN RAFFLE"}
                </button>
              </div>
            </div>
          )}

          {/* CLOSED status info */}
          {raffle.status === "CLOSED" && (
            <div className="border border-yellow-500/30 bg-yellow-500/5 p-6 text-center">
              <h4 className="text-sm font-black uppercase tracking-[0.2em] text-yellow-400">
                ENTRIES ARE FROZEN
              </h4>
              <p className="mt-2 text-xs text-[var(--muted)] max-w-xl mx-auto">
                This raffle is closed. No new entries can be committed or modified. The deterministic cryptographic draw will process this frozen entry snapshot.
              </p>
            </div>
          )}

          {/* DRAWN status Winners List */}
          {raffle.status === "DRAWN" && winners.length > 0 && (
            <div className="border border-[var(--border)] bg-[#090909] p-6">
              <h4 className="text-xs font-black uppercase tracking-[0.2em] text-[var(--accent)]">
                Official Whitelist Winners ({winners.length} / {raffle.wl_spots} Spots)
              </h4>
              <div className="mt-4 grid gap-2">
                {winners.map((w) => {
                  const isMe = w.user_id === currentUserId;
                  return (
                    <div
                      key={w.entry_id}
                      className={`flex items-center justify-between p-3 border text-xs font-mono ${
                        isMe
                          ? "border-[var(--accent)] bg-[rgba(183,255,0,0.15)] text-[var(--accent)]"
                          : "border-[var(--border)] bg-[#121212] text-[var(--foreground)]"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="font-black text-[var(--accent)]">
                          #{w.winner_position}
                        </span>
                        <span>{w.display_name || w.username || `User ${w.user_id.substring(0, 8)}`}</span>
                        {w.username && (
                          <span className="text-[var(--muted)]">@{w.username}</span>
                        )}
                      </div>
                      {isMe && (
                        <span className="font-bold uppercase tracking-wider text-[var(--accent)]">
                          YOU
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Dev / Admin Controls */}
          {process.env.NODE_ENV === "development" && (
            <div className="mt-4 border-t border-[var(--border)] pt-4 flex flex-wrap items-center gap-3">
              <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--muted)]">
                Dev Controls:
              </span>
              {raffle.status === "OPEN" && (
                <button
                  onClick={handleCloseRaffle}
                  disabled={loading}
                  className="border border-yellow-500 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-yellow-400 hover:bg-yellow-500 hover:text-[#090909] cursor-pointer"
                >
                  CLOSE RAFFLE
                </button>
              )}
              {raffle.status === "CLOSED" && (
                <button
                  onClick={handleExecuteDraw}
                  disabled={loading}
                  className="border border-[var(--accent)] px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-[var(--accent)] hover:bg-[var(--accent)] hover:text-[#090909] cursor-pointer"
                >
                  EXECUTE DRAW
                </button>
              )}
              <button
                onClick={handleSeedRaffle}
                disabled={seeding}
                className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted)] underline hover:text-[var(--accent)] cursor-pointer"
              >
                RESET / NEW RAFFLE
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
