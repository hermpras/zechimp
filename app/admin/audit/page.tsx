import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/database/types";

type AuditLogRow = Database["public"]["Tables"]["admin_audit_logs"]["Row"];

export const dynamic = "force-dynamic";

export default async function AdminAuditPage() {
  const adminClient = createSupabaseAdminClient();

  const { data: logsData } = await adminClient
    .from("admin_audit_logs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100);

  const logs = (logsData || []) as AuditLogRow[];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-black text-[var(--foreground)] sm:text-4xl">
          Admin Audit Logs Stream
        </h1>
        <p className="mt-2 text-sm text-[var(--muted)]">
          Complete append-only audit trail of administrative operations, draw executions, and manual proof reviews.
        </p>
      </div>

      <div className="border border-[var(--border)] bg-[#0d0d0d]">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="border-b border-[var(--border)] bg-[#141414] uppercase text-[var(--muted)]">
              <tr>
                <th className="px-4 py-3 font-bold">Timestamp</th>
                <th className="px-4 py-3 font-bold">Admin ID</th>
                <th className="px-4 py-3 font-bold">Action</th>
                <th className="px-4 py-3 font-bold">Entity</th>
                <th className="px-4 py-3 font-bold">Metadata Payload</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-[var(--muted)]">
                    No admin audit logs recorded yet.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-[#121212]">
                    <td className="px-4 py-3 text-[var(--muted)] whitespace-nowrap">
                      {new Date(log.created_at).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 font-bold text-[var(--foreground)]">
                      {log.admin_user_id.substring(0, 8)}...
                    </td>
                    <td className="px-4 py-3">
                      <span className="border border-[var(--border)] bg-[#1a1a1a] px-2 py-0.5 text-[10px] font-bold text-[var(--accent)]">
                        {log.action}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[var(--muted)]">
                      {log.entity_type} {log.entity_id ? `(${log.entity_id.substring(0, 8)}...)` : ""}
                    </td>
                    <td className="px-4 py-3 text-[10px] font-mono text-[var(--muted)]">
                      <pre className="whitespace-pre-wrap max-w-md bg-[#141414] p-2 border border-[var(--border)] text-[var(--foreground)]">
                        {JSON.stringify(log.metadata, null, 2)}
                      </pre>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
