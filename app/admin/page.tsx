import Link from "next/link";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/database/types";

type AuditLogRow = Database["public"]["Tables"]["admin_audit_logs"]["Row"];

export const dynamic = "force-dynamic";

export default async function AdminOverviewPage() {
  const adminClient = createSupabaseAdminClient();

  // 1. Total Registered Users
  const { count: usersCount } = await adminClient
    .from("profiles")
    .select("*", { count: "exact", head: true });

  // 2. Active Campaigns Count
  const { count: activeCampaignsCount } = await adminClient
    .from("campaigns")
    .select("*", { count: "exact", head: true })
    .eq("status", "ACTIVE");

  // 3. Total Missions Count
  const { count: totalMissionsCount } = await adminClient
    .from("missions")
    .select("*", { count: "exact", head: true });

  // 4. Total Points Issued from point_transactions ledger
  const { data: pointTxs } = await adminClient
    .from("point_transactions")
    .select("amount");

  const totalPointsIssued = (pointTxs || []).reduce(
    (sum, tx) => sum + (tx.amount || 0),
    0,
  );

  // 5. Total Tickets Issued from ticket_transactions ledger
  const { data: ticketTxs } = await adminClient
    .from("ticket_transactions")
    .select("amount");

  const totalTicketsIssued = (ticketTxs || []).reduce(
    (sum, tx) => sum + (tx.amount || 0),
    0,
  );

  // 6. Total Committed Raffle Entries
  const { count: totalRaffleEntriesCount } = await adminClient
    .from("raffle_entries")
    .select("*", { count: "exact", head: true });

  // 7. Raffles Status Counts
  const { count: openRafflesCount } = await adminClient
    .from("raffles")
    .select("*", { count: "exact", head: true })
    .eq("status", "OPEN");

  const { count: closedRafflesCount } = await adminClient
    .from("raffles")
    .select("*", { count: "exact", head: true })
    .eq("status", "CLOSED");

  const { count: drawnRafflesCount } = await adminClient
    .from("raffles")
    .select("*", { count: "exact", head: true })
    .eq("status", "DRAWN");

  // 8. Total Winners Selected
  const { count: totalWinnersCount } = await adminClient
    .from("raffle_winners")
    .select("*", { count: "exact", head: true });

  // 9. Recent Audit Logs (latest 10)
  const { data: recentLogsData } = await adminClient
    .from("admin_audit_logs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(10);

  const recentLogs = (recentLogsData || []) as AuditLogRow[];

  return (
    <div className="flex flex-col gap-8">
      {/* Header Banner */}
      <div>
        <h1 className="text-3xl font-black text-[var(--foreground)] sm:text-4xl">
          ZECHIMP Operations Overview
        </h1>
        <p className="mt-2 text-sm text-[var(--muted)]">
          Real-time metrics for campaign progression, points, ticket ledgers, raffle lifecycles, and audit logs.
        </p>
      </div>

      {/* Metrics Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard label="Registered Users" value={usersCount || 0} unit="USERS" />
        <MetricCard label="Active Campaigns" value={activeCampaignsCount || 0} unit="CAMPAIGNS" />
        <MetricCard label="Total Missions" value={totalMissionsCount || 0} unit="MISSIONS" />
        <MetricCard label="Total Points Balance" value={totalPointsIssued} unit="POINTS" highlight />

        <MetricCard label="Total Tickets Balance" value={totalTicketsIssued} unit="TICKETS" highlight />
        <MetricCard label="Committed Raffle Entries" value={totalRaffleEntriesCount || 0} unit="ENTRIES" />
        <MetricCard
          label="Raffle Lifecycles"
          value={`${openRafflesCount || 0} O / ${closedRafflesCount || 0} C / ${drawnRafflesCount || 0} D`}
          unit="OPEN/CLOSED/DRAWN"
        />
        <MetricCard label="Whitelist Winners" value={totalWinnersCount || 0} unit="SPOTS" highlight />
      </div>

      {/* Quick Action Navigation Panels */}
      <div className="grid gap-6 sm:grid-cols-3">
        <QuickActionCard
          title="Campaigns & Missions"
          description="Create, edit, and toggle active campaigns and mission rewards."
          link="/admin/campaigns"
          buttonText="MANAGE CAMPAIGNS"
        />
        <QuickActionCard
          title="Raffle Lifecycle & Draws"
          description="Create raffles, commit access codes, freeze entries, and execute cryptographic draws."
          link="/admin/raffles"
          buttonText="OPERATE RAFFLES"
        />
        <QuickActionCard
          title="Audit Log Stream"
          description="Inspect auditable administrative logs and cryptographic draw commitments."
          link="/admin/audit"
          buttonText="VIEW AUDIT LOGS"
        />
      </div>

      {/* Recent Admin Audit Activity */}
      <div className="border border-[var(--border)] bg-[var(--background-raised)] p-6">
        <div className="flex items-center justify-between border-b border-[var(--border)] pb-4">
          <h2 className="text-xs font-black uppercase tracking-[0.22em] text-[var(--foreground)]">
            Recent Admin Operations Stream
          </h2>
          <Link
            href="/admin/audit"
            className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--accent)] hover:underline"
          >
            VIEW ALL LOGS →
          </Link>
        </div>

        {recentLogs.length === 0 ? (
          <p className="mt-4 text-xs font-mono text-[var(--muted)]">
            No admin actions logged yet.
          </p>
        ) : (
          <div className="mt-4 grid gap-2">
            {recentLogs.map((log) => (
              <div
                key={log.id}
                className="flex flex-col gap-1 border border-[var(--border)] bg-[#090909] p-3 sm:flex-row sm:items-center sm:justify-between text-xs font-mono"
              >
                <div className="flex items-center gap-3">
                  <span className="border border-[var(--accent)] bg-[rgba(183,255,0,0.1)] px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-[var(--accent)]">
                    {log.action}
                  </span>
                  <span className="text-[var(--foreground)] font-bold">
                    {log.entity_type} {log.entity_id ? `(${log.entity_id.substring(0, 8)})` : ""}
                  </span>
                </div>
                <span className="text-[var(--muted)] text-[10px]">
                  {new Date(log.created_at).toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function MetricCard({
  label,
  value,
  unit,
  highlight,
}: {
  label: string;
  value: string | number;
  unit: string;
  highlight?: boolean;
}) {
  return (
    <div className="border border-[var(--border)] bg-[#0d0d0d] p-5">
      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--muted)]">
        {label}
      </p>
      <p
        className={`mt-2 text-2xl font-black ${
          highlight ? "text-[var(--accent)]" : "text-[var(--foreground)]"
        }`}
      >
        {value}{" "}
        <span className="text-[10px] font-bold text-[var(--muted)] uppercase">
          {unit}
        </span>
      </p>
    </div>
  );
}

function QuickActionCard({
  title,
  description,
  link,
  buttonText,
}: {
  title: string;
  description: string;
  link: string;
  buttonText: string;
}) {
  return (
    <div className="flex flex-col justify-between border border-[var(--border)] bg-[#0d0d0d] p-6">
      <div>
        <h3 className="text-lg font-black text-[var(--foreground)]">{title}</h3>
        <p className="mt-2 text-xs text-[var(--muted)] leading-relaxed">
          {description}
        </p>
      </div>
      <div className="mt-6">
        <Link
          href={link}
          className="inline-flex items-center justify-center border border-[var(--accent)] bg-[var(--accent)] px-5 py-2.5 text-xs font-black uppercase tracking-[0.18em] text-[#090909] transition-all hover:bg-transparent hover:text-[var(--accent)]"
        >
          {buttonText}
        </Link>
      </div>
    </div>
  );
}
