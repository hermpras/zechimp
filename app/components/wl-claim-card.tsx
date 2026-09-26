"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { claimWalletAction } from "@/app/actions/claims";
import type { WlClaimRow } from "@/database/types";

interface WLClaimCardProps {
  raffleWinnerId: string;
  winnerPosition: number;
  claim: WlClaimRow | null;
  raffleTitle: string;
}

export function WLClaimCard({
  raffleWinnerId,
  winnerPosition,
  claim: initialClaim,
  raffleTitle,
}: WLClaimCardProps) {
  const [claim, setClaim] = useState<WlClaimRow | null>(initialClaim);
  const [inputAddress, setInputAddress] = useState("");
  const [isConfirming, setIsConfirming] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const router = useRouter();

  const isClaimed = claim?.status === "CLAIMED";
  const isExpired = claim?.status === "EXPIRED";

  const handleConfirmClick = () => {
    setErrorMsg(null);
    const trimmed = inputAddress.trim();
    if (!trimmed) {
      setErrorMsg("Please enter a wallet address.");
      return;
    }
    const evmRegex = /^0x[a-fA-F0-9]{40}$/;
    if (!evmRegex.test(trimmed)) {
      setErrorMsg("Invalid EVM wallet address. Must start with 0x followed by 40 hex characters.");
      return;
    }
    setIsConfirming(true);
  };

  const handleLockInWallet = async () => {
    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const res = await claimWalletAction(raffleWinnerId, inputAddress);

      if (res.success && res.claim) {
        setClaim(res.claim);
        setSuccessMsg(res.message || "Wallet address successfully locked!");
        setIsConfirming(false);
        router.refresh();
      } else {
        setErrorMsg(res.error || "Failed to claim whitelist allocation.");
      }
    } catch {
      setErrorMsg("An unexpected error occurred during claim processing.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="border border-[var(--accent)] bg-[var(--background-raised)] p-6 sm:p-8">
      <div className="flex items-center justify-between border-b border-[var(--border)] pb-4">
        <div className="flex items-center gap-3">
          <span className="text-xs font-black uppercase tracking-[0.22em] text-[var(--accent)]">
            {raffleTitle.toUpperCase()} — WHITELIST CLAIM
          </span>
          <span className="border border-[var(--accent)]/40 bg-[rgba(183,255,0,0.1)] px-2 py-0.5 font-mono text-[10px] font-black text-[var(--accent)]">
            WINNER #{winnerPosition}
          </span>
        </div>
        <div>
          {isClaimed && (
            <span className="inline-flex items-center gap-1.5 border border-emerald-500 bg-emerald-500/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-emerald-400">
              ✓ WL CLAIMED
            </span>
          )}
          {isExpired && (
            <span className="inline-flex items-center gap-1.5 border border-red-500 bg-red-500/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-red-400">
              EXPIRED
            </span>
          )}
          {!isClaimed && !isExpired && (
            <span className="inline-flex items-center gap-1.5 border border-[var(--accent)] bg-[rgba(183,255,0,0.1)] px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-[var(--accent)] animate-pulse">
              ACTION REQUIRED
            </span>
          )}
        </div>
      </div>

      <div className="mt-6 flex flex-col gap-6">
        {/* Error / Success Notifications */}
        {errorMsg && (
          <div className="border border-red-500 bg-red-950/40 p-4 text-xs font-mono font-bold text-red-400">
            ⚠️ {errorMsg}
          </div>
        )}
        {successMsg && (
          <div className="border border-[var(--accent)] bg-[rgba(183,255,0,0.1)] p-4 text-xs font-mono font-bold text-[var(--accent)]">
            ✓ {successMsg}
          </div>
        )}

        {/* STATE A: EXPIRED */}
        {isExpired && (
          <div className="border border-red-500/30 bg-red-950/10 p-6">
            <h3 className="text-xl font-black text-red-400">CLAIM EXPIRED</h3>
            <p className="mt-2 text-xs font-mono text-[var(--muted)]">
              The claim deadline for this raffle allocation has passed. You did not submit a wallet address in time.
            </p>
          </div>
        )}

        {/* STATE B: CLAIMED & LOCKED */}
        {isClaimed && claim && (
          <div className="border border-emerald-500/30 bg-[#090909] p-6 space-y-6">
            <div>
              <span className="inline-block border border-emerald-500 bg-emerald-500/10 px-3 py-1 text-xs font-black uppercase tracking-[0.2em] text-emerald-400">
                ✓ WL CLAIMED
              </span>
              <h3 className="mt-3 text-2xl font-black uppercase text-[var(--foreground)]">
                WALLET LOCKED
              </h3>
              <p className="mt-2 font-mono text-sm font-bold text-[var(--accent)] break-all bg-[#121212] p-3 border border-[var(--border)]">
                {claim.wallet_address}
              </p>
              <p className="mt-2 text-xs text-[var(--muted)]">
                This wallet will be used for your future mint.
              </p>
            </div>

            {/* Non-interactive locked button */}
            <div>
              <button
                disabled
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 border border-neutral-700 bg-neutral-900/80 px-8 py-3.5 text-xs font-black uppercase tracking-[0.2em] text-neutral-400 cursor-not-allowed opacity-80"
              >
                🔒 WALLET LOCKED
              </button>
            </div>
          </div>
        )}

        {/* STATE C: CLAIMABLE (Not yet claimed, not expired) */}
        {!isClaimed && !isExpired && (
          <div className="border border-[var(--border)] bg-[#090909] p-6">
            <div>
              <span className="text-xs font-black uppercase tracking-[0.2em] text-[var(--accent)]">
                YOU WON.
              </span>
              <h3 className="mt-1 text-xl font-black text-[var(--foreground)]">
                Claim your whitelist allocation.
              </h3>
              <p className="mt-2 text-xs text-[var(--muted)] leading-relaxed">
                Claim your whitelist allocation by submitting the wallet address you want to use for the future mint.
              </p>
            </div>

            <div className="mt-6 space-y-4">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--muted)] mb-1">
                  WALLET ADDRESS
                </label>
                <input
                  type="text"
                  placeholder="0x................................"
                  value={inputAddress}
                  onChange={(e) => setInputAddress(e.target.value)}
                  className="w-full border border-[var(--border)] bg-[#121212] px-4 py-3 font-mono text-xs text-[var(--foreground)] focus:border-[var(--accent)] focus:outline-none"
                />
              </div>

              <div className="border border-amber-500/30 bg-amber-950/20 p-3 text-[11px] font-mono text-amber-300">
                <strong className="uppercase">Warning:</strong> Make sure this address is correct. Once confirmed, it cannot be changed.
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleConfirmClick}
                  disabled={loading}
                  className="w-full sm:w-auto inline-flex items-center justify-center border border-[var(--accent)] bg-[var(--accent)] px-8 py-3.5 text-xs font-black uppercase tracking-[0.2em] text-black transition-all hover:bg-transparent hover:text-[var(--accent)] cursor-pointer disabled:opacity-50"
                >
                  CONFIRM WALLET
                </button>
              </div>
            </div>
          </div>
        )}

        {/* COMPACT STATUS SECTION */}
        <div className="border border-[var(--border)] bg-[#090909] p-4 font-mono text-xs">
          <div className="grid grid-cols-3 divide-x divide-[var(--border)] text-center">
            <div className="px-2">
              <span className="block text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--muted)]">
                CLAIM STATUS
              </span>
              <span
                className={`mt-1 inline-block font-bold ${
                  isClaimed
                    ? "text-emerald-400"
                    : isExpired
                      ? "text-red-400"
                      : "text-[var(--accent)]"
                }`}
              >
                ● {isClaimed ? "CLAIMED" : isExpired ? "EXPIRED" : "CLAIMABLE"}
              </span>
            </div>

            <div className="px-2">
              <span className="block text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--muted)]">
                WALLET
              </span>
              <span
                className={`mt-1 inline-block font-bold ${
                  isClaimed ? "text-emerald-400" : "text-[var(--muted)]"
                }`}
              >
                {isClaimed ? "● LOCKED" : "○ UNCLAIMED"}
              </span>
            </div>

            <div className="px-2">
              <span className="block text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--muted)]">
                MINT
              </span>
              <span className="mt-1 inline-block font-bold text-[var(--muted)]">
                ○ PENDING
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* CONFIRMATION MODAL (STEP 2) */}
      {isConfirming && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4">
          <div className="w-full max-w-lg border border-[var(--accent)] bg-[#0d0d0d] p-6 sm:p-8">
            <div className="inline-flex items-center gap-2 border border-[var(--accent)] bg-[rgba(183,255,0,0.1)] px-2.5 py-0.5 text-[10px] font-black uppercase text-[var(--accent)]">
              CONFIRMATION REQUIRED
            </div>

            <h2 className="mt-3 text-xl font-black uppercase text-[var(--foreground)]">
              CONFIRM WALLET
            </h2>

            <div className="mt-4 border border-[var(--border)] bg-[#121212] p-4 break-all font-mono text-sm font-bold text-[var(--accent)]">
              {inputAddress.trim()}
            </div>

            <div className="mt-4 space-y-2 font-mono text-xs text-[var(--muted)]">
              <p>This wallet will be used for your future mint.</p>
              <p>Make sure you control this wallet and that the address is correct.</p>
              <p className="font-bold text-amber-400">This action cannot be undone.</p>
            </div>

            <div className="mt-6 flex items-center justify-end gap-3 font-mono text-xs">
              <button
                type="button"
                onClick={() => setIsConfirming(false)}
                disabled={loading}
                className="border border-[var(--border)] bg-[#141414] px-5 py-2.5 font-bold uppercase text-[var(--muted)] hover:text-[var(--foreground)] cursor-pointer"
              >
                CANCEL
              </button>
              <button
                type="button"
                onClick={handleLockInWallet}
                disabled={loading}
                className="border border-[var(--accent)] bg-[var(--accent)] px-6 py-2.5 font-black uppercase text-black hover:opacity-90 cursor-pointer disabled:opacity-50"
              >
                {loading ? "LOCKING IN..." : "LOCK IN WALLET"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
