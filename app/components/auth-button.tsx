"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { getSiteUrl } from "@/lib/env";

export function LoginWithXButton() {
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setLoading(true);
    try {
      const supabase = createSupabaseBrowserClient();
      const siteUrl = getSiteUrl();

      const { error } = await supabase.auth.signInWithOAuth({
        provider: "x",
        options: {
          redirectTo: `${siteUrl}/auth/callback`,
        },
      });

      if (error) {
        console.error("Sign in error:", error.message);
        setLoading(false);
      }
    } catch (err) {
      console.error("Sign in error:", err);
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleLogin}
      disabled={loading}
      className="inline-flex items-center justify-center gap-3 border border-[var(--accent)] bg-[var(--accent)] px-6 py-3.5 text-xs font-black uppercase tracking-[0.2em] text-[#090909] transition-all hover:bg-transparent hover:text-[var(--accent)] disabled:opacity-50 cursor-pointer"
    >
      <svg
        className="h-4 w-4 fill-current"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
      </svg>
      {loading ? "CONNECTING..." : "CONNECT X"}
    </button>
  );
}

export function LogoutButton() {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogout = async () => {
    setLoading(true);
    try {
      const supabase = createSupabaseBrowserClient();
      await supabase.auth.signOut();
      router.push("/");
      router.refresh();
    } catch (err) {
      console.error("Logout error:", err);
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleLogout}
      disabled={loading}
      className="inline-flex items-center justify-center border border-[var(--border)] bg-transparent px-5 py-2.5 text-xs font-bold uppercase tracking-[0.18em] text-[var(--muted)] transition-all hover:border-[var(--foreground)] hover:text-[var(--foreground)] disabled:opacity-50 cursor-pointer"
    >
      {loading ? "DISCONNECTING..." : "DISCONNECT"}
    </button>
  );
}
