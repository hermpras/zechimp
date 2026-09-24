import Link from "next/link";
import { redirect } from "next/navigation";
import { verifyAdmin } from "@/lib/admin";
import { LogoutButton } from "@/app/components/auth-button";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isAuthorized, userId, reason } = await verifyAdmin();

  if (!userId) {
    redirect("/");
  }

  if (!isAuthorized) {
    return (
      <main className="min-h-screen px-6 py-8 sm:px-10 flex items-center justify-center">
        <div className="max-w-md w-full border border-red-500 bg-red-950/20 p-8 text-center">
          <div className="inline-flex items-center gap-2 border border-red-500 bg-red-950/40 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-red-400">
            403 ACCESS DENIED
          </div>
          <h1 className="mt-4 text-2xl font-black text-[var(--foreground)]">
            UNAUTHORIZED ADMIN ACCESS
          </h1>
          <p className="mt-3 text-xs font-mono text-[var(--muted)] leading-relaxed">
            Your authenticated user identity ({userId.substring(0, 8)}...) is not authorized to access ZECHIMP Operations ({reason}).
          </p>
          <div className="mt-6">
            <Link
              href="/dashboard"
              className="inline-flex items-center justify-center border border-[var(--border)] bg-[#121212] px-6 py-3 text-xs font-bold uppercase tracking-[0.18em] text-[var(--foreground)] hover:border-[var(--accent)] hover:text-[var(--accent)]"
            >
              RETURN TO USER DASHBOARD
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen px-6 py-8 sm:px-10">
      <section className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-6xl flex-col gap-8">
        {/* Admin Navigation Header */}
        <div className="flex flex-col gap-4 border-b border-[var(--border)] pb-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="text-sm font-black tracking-[0.28em] text-[var(--accent)] hover:opacity-80"
            >
              ZECHIMP
            </Link>
            <span className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--muted)]">
              / OPERATIONS CONSOLE
            </span>
          </div>

          <div className="flex items-center gap-4">
            <span className="border border-[var(--accent)] bg-[rgba(183,255,0,0.1)] px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-[var(--accent)]">
              ADMIN MODE
            </span>
            <LogoutButton />
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex flex-wrap items-center gap-2 border-b border-[var(--border)] pb-4">
          <AdminNavLink href="/admin" label="OVERVIEW" />
          <AdminNavLink href="/admin/campaigns" label="CAMPAIGNS" />
          <AdminNavLink href="/admin/missions" label="MISSIONS" />
          <AdminNavLink href="/admin/raffles" label="RAFFLES" />
          <AdminNavLink href="/admin/audit" label="AUDIT LOGS" />
          <Link
            href="/dashboard"
            className="ml-auto text-xs font-bold uppercase tracking-[0.18em] text-[var(--muted)] hover:text-[var(--foreground)]"
          >
            ← USER DASHBOARD
          </Link>
        </div>

        {/* Child Pages */}
        {children}
      </section>
    </main>
  );
}

function AdminNavLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="border border-[var(--border)] bg-[#0d0d0d] px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-[var(--foreground)] transition-all hover:border-[var(--accent)] hover:text-[var(--accent)]"
    >
      {label}
    </Link>
  );
}
