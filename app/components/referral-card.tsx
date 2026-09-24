"use client";

import { useState } from "react";

interface ReferralCardProps {
  pointsBalance: number;
  ticketBalance: number;
  referralCode: string;
  referralLink: string;
  qualifiedCount: number;
}

export function ReferralCard({
  pointsBalance,
  ticketBalance,
  referralCode,
  referralLink,
  qualifiedCount,
}: ReferralCardProps) {
  const [copied, setCopied] = useState(false);

  const ptsRemainder = pointsBalance % 10;
  const ptsNeededForNextTicket = 10 - ptsRemainder;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="border border-[var(--border)] bg-[var(--background-raised)] p-6 sm:p-8">
      <div className="flex items-center justify-between border-b border-[var(--border)] pb-4">
        <h3 className="text-xs font-black uppercase tracking-[0.22em] text-[var(--muted)]">
          ZECHIMP Economy & Referrals
        </h3>
        <span className="border border-[var(--accent)] bg-[rgba(183,255,0,0.1)] px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-[var(--accent)]">
          10 PTS = 1 TICKET
        </span>
      </div>

      <div className="mt-6 grid gap-6 md:grid-cols-3">
        {/* Points Card */}
        <div className="flex flex-col justify-between border border-[var(--border)] bg-[#090909] p-5">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--muted)]">
              Current Points
            </p>
            <p className="mt-2 text-4xl font-black text-[var(--foreground)]">
              {pointsBalance} <span className="text-xs text-[var(--muted)] font-bold">PTS</span>
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-[var(--border)]">
            <div className="flex items-center justify-between text-[10px] font-mono text-[var(--muted)]">
              <span>NEXT TICKET PROGRESS</span>
              <span className="text-[var(--accent)] font-bold">
                {ptsNeededForNextTicket === 10 && pointsBalance > 0 ? "0 PTS TO GO" : `${ptsNeededForNextTicket} PTS TO GO`}
              </span>
            </div>
            {/* Progress Bar */}
            <div className="mt-2 h-1.5 w-full bg-[#1b1b1b]">
              <div
                className="h-full bg-[var(--accent)] transition-all"
                style={{ width: `${(ptsRemainder / 10) * 100}%` }}
              />
            </div>
          </div>
        </div>

        {/* Tickets Card */}
        <div className="flex flex-col justify-between border border-[var(--border)] bg-[#090909] p-5">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--muted)]">
              Total Tickets Earned
            </p>
            <p className="mt-2 text-4xl font-black text-[var(--accent)]">
              {ticketBalance} <span className="text-xs text-[var(--foreground)] font-bold">TICKETS</span>
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-[var(--border)] text-[10px] font-mono text-[var(--muted)]">
            CONVERTED FROM POINTS & QUALIFIED REFERRALS
          </div>
        </div>

        {/* Qualified Referrals Counter Card */}
        <div className="flex flex-col justify-between border border-[var(--border)] bg-[#090909] p-5">
          <div>
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--muted)]">
                Qualified Referrals
              </p>
              <span className="text-[10px] font-mono text-[var(--accent)] font-bold">
                MAX 10
              </span>
            </div>
            <p className="mt-2 text-4xl font-black text-[var(--foreground)]">
              {qualifiedCount}{" "}
              <span className="text-xs text-[var(--muted)] font-bold">/ 10</span>
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-[var(--border)] text-[10px] font-mono text-[var(--muted)]">
            +1 TICKET PER QUALIFIED REFERRAL ({Math.max(0, 10 - qualifiedCount)} REMAINING)
          </div>
        </div>
      </div>

      {/* Shareable Referral Link Banner */}
      <div className="mt-6 border border-[var(--border)] bg-[#090909] p-5">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--muted)]">
          Your Unique Referral Link
        </p>
        <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="flex-1 overflow-x-auto border border-[var(--border)] bg-[#121212] px-4 py-2.5 font-mono text-xs text-[var(--foreground)] truncate">
            {referralLink}
          </div>
          <div className="flex items-center gap-2">
            <span className="border border-[var(--border)] bg-[#121212] px-3 py-2.5 font-mono text-xs font-bold text-[var(--accent)]">
              {referralCode}
            </span>
            <button
              onClick={handleCopyLink}
              className="inline-flex items-center gap-2 border border-[var(--accent)] bg-[var(--accent)] px-5 py-2.5 text-xs font-black uppercase tracking-[0.18em] text-[#090909] transition-all hover:bg-transparent hover:text-[var(--accent)] cursor-pointer"
            >
              {copied ? "COPIED!" : "COPY LINK"}
            </button>
          </div>
        </div>
        <p className="mt-2 text-[10px] text-[var(--muted)]">
          Share this link with friends. When they sign up and complete their first mission, you earn +1 Ticket!
        </p>
      </div>
    </div>
  );
}
