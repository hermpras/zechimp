import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Terms | ZECHIMP",
  description: "Development placeholder terms for ZECHIMP.",
};

const sections = [
  {
    title: "Development Status",
    body: "This website is currently a development environment. Features, content, eligibility rules, and any campaign mechanics may change or be removed before public launch.",
  },
  {
    title: "No Production Offer",
    body: "Nothing on this development website creates a binding offer, sale, whitelist allocation, reward, or entitlement. Do not rely on this placeholder page for final project terms.",
  },
  {
    title: "Use Of This Site",
    body: "You may view this public development website for informational purposes only. You agree not to misuse, disrupt, scrape, attack, or attempt to gain unauthorized access to the site or related systems.",
  },
  {
    title: "Future Legal Documents",
    body: "Final production legal documents will replace this placeholder before public launch and will govern any official ZECHIMP experience, campaign, mint, or service.",
  },
];

export default function TermsPage() {
  return (
    <main className="min-h-screen px-6 py-8 sm:px-10">
      <section className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-4xl flex-col justify-center gap-10">
        <LegalHeader currentPage="Terms" />

        <div className="max-w-3xl">
          <p className="mb-4 text-sm font-bold uppercase tracking-[0.22em] text-[var(--accent)]">
            Development placeholder
          </p>
          <h1 className="text-5xl font-black leading-[0.95] sm:text-7xl">
            Terms of Use
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-[var(--muted)]">
            These temporary terms are provided only for the ZECHIMP development
            website. They are not final production legal terms and will be
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
        <Link href="/privacy" className="transition-colors hover:text-[var(--accent)]">
          Privacy
        </Link>
      </nav>
    </div>
  );
}
