import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy | ZECHIMP",
  description: "Development placeholder privacy notice for ZECHIMP.",
};

const sections = [
  {
    title: "Development Status",
    body: "This privacy notice is a temporary development placeholder. It does not describe final production data practices and will be replaced before public launch.",
  },
  {
    title: "Information Collected",
    body: "This development website may receive basic technical information that browsers and hosting infrastructure normally provide, such as page requests, device data, and diagnostic logs.",
  },
  {
    title: "No Production Campaign Data",
    body: "This placeholder does not introduce account creation, wallet connection, referrals, missions, tickets, raffle entries, points, or admin functionality.",
  },
  {
    title: "Final Privacy Notice",
    body: "Before any official ZECHIMP public launch, this page will be replaced with a production privacy notice describing the actual data collected, why it is used, and how users can exercise applicable rights.",
  },
];

export default function PrivacyPage() {
  return (
    <main className="min-h-screen px-6 py-8 sm:px-10">
      <section className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-4xl flex-col justify-center gap-10">
        <LegalHeader currentPage="Privacy" />

        <div className="max-w-3xl">
          <p className="mb-4 text-sm font-bold uppercase tracking-[0.22em] text-[var(--accent)]">
            Development placeholder
          </p>
          <h1 className="text-5xl font-black leading-[0.95] sm:text-7xl">
            Privacy Notice
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-[var(--muted)]">
            This temporary notice is provided only for the ZECHIMP development
            website. It is not the final production privacy notice and will be
            replaced before public launch.
          </p>
        </div>

        <div className="grid gap-4">
          {sections.map((section) => (
            <section
              key={section.title}
              className="border border-[var(--border)] bg-[var(--background-raised)] p-5"
            >
              <h2 className="text-xs font-black uppercase tracking-[0.18em] text-[var(--foreground)]">
                {section.title}
              </h2>
              <p className="mt-3 leading-7 text-[var(--muted)]">{section.body}</p>
            </section>
          ))}
        </div>
      </section>
    </main>
  );
}

function LegalHeader({ currentPage }: { currentPage: string }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[var(--border)] pb-5">
      <Link
        href="/"
        className="text-sm font-black tracking-[0.28em] text-[var(--accent)]"
      >
        ZECHIMP
      </Link>
      <nav className="flex items-center gap-5 text-xs font-bold uppercase tracking-[0.18em] text-[var(--muted)]">
        <span>{currentPage}</span>
        <Link href="/terms" className="transition-colors hover:text-[var(--accent)]">
          Terms
        </Link>
      </nav>
    </div>
  );
}
