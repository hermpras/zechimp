import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getSiteUrl } from "@/lib/env";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";
  const siteUrl = getSiteUrl() || origin;

  if (code) {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && data.user) {
      const user = data.user;
      const adminClient = createSupabaseAdminClient();

      const xIdentity = user.identities?.find(
        (id) => id.provider === "x" || id.provider === "twitter",
      );

      const xUserId =
        xIdentity?.id ||
        (xIdentity?.identity_data?.sub as string) ||
        (user.user_metadata?.sub as string) ||
        (user.user_metadata?.provider_id as string);

      const rawUsername =
        (xIdentity?.identity_data?.user_name as string) ||
        (xIdentity?.identity_data?.preferred_username as string) ||
        (user.user_metadata?.preferred_username as string) ||
        (user.user_metadata?.user_name as string) ||
        (user.user_metadata?.name as string) ||
        "";

      const username = rawUsername.replace(/^@/, "");

      const displayName =
        (xIdentity?.identity_data?.full_name as string) ||
        (xIdentity?.identity_data?.name as string) ||
        (user.user_metadata?.full_name as string) ||
        (user.user_metadata?.name as string) ||
        username ||
        "ZECHIMP User";

      const avatarUrl =
        (xIdentity?.identity_data?.avatar_url as string) ||
        (xIdentity?.identity_data?.picture as string) ||
        (user.user_metadata?.avatar_url as string) ||
        (user.user_metadata?.picture as string) ||
        null;

      // 1. Synchronize Profiles table (idempotent upsert)
      const { error: profileError } = await adminClient.from("profiles").upsert(
        {
          user_id: user.id,
          username: username || null,
          display_name: displayName || null,
          avatar_url: avatarUrl || null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" },
      );

      if (profileError) {
        console.error("Failed to sync profile:", profileError);
      }

      // 2. Synchronize X Accounts table (idempotent upsert)
      if (xUserId) {
        const { error: xAccountError } = await adminClient
          .from("x_accounts")
          .upsert(
            {
              user_id: user.id,
              x_user_id: String(xUserId),
              username: username || `user_${xUserId}`,
              display_name: displayName || null,
              avatar_url: avatarUrl || null,
              updated_at: new Date().toISOString(),
            },
            { onConflict: "user_id" },
          );

        if (xAccountError) {
          console.error("Failed to sync x_account:", xAccountError);
        }
      }

      const forwardedHost = request.headers.get("x-forwarded-host");
      const isLocalEnv = process.env.NODE_ENV === "development";

      if (isLocalEnv) {
        return NextResponse.redirect(`${siteUrl}${next}`);
      } else if (forwardedHost) {
        return NextResponse.redirect(`https://${forwardedHost}${next}`);
      } else {
        return NextResponse.redirect(`${siteUrl}${next}`);
      }
    } else if (error) {
      console.error("OAuth code exchange error:", error);
    }
  }

  return NextResponse.redirect(`${siteUrl}/?error=auth_failed`);
}
