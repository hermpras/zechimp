import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { Json } from "@/database/types";

export type AdminVerifyResult = {
  isAuthorized: boolean;
  userId: string | null;
  reason?: string;
};

/**
 * Server-side helper to verify if the current request is from an authorized admin.
 * Checks app_metadata.role, environment allowlists, or dev environment fallback.
 */
export async function verifyAdmin(): Promise<AdminVerifyResult> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { isAuthorized: false, userId: null, reason: "unauthenticated" };
  }

  // 1. Check Supabase App Metadata role
  if (user.app_metadata?.role === "admin") {
    return { isAuthorized: true, userId: user.id, reason: "app_metadata_admin" };
  }

  // 2. Check environment variable allowlists
  const adminUserIds =
    process.env.ADMIN_USER_IDS?.split(",").map((s) => s.trim()) || [];
  const adminXUserIds =
    process.env.ADMIN_X_USER_IDS?.split(",").map((s) => s.trim()) || [];
  const adminUsernames =
    process.env.ADMIN_USERNAMES?.split(",").map((s) => s.trim().toLowerCase()) || [];

  if (adminUserIds.includes(user.id)) {
    return { isAuthorized: true, userId: user.id, reason: "allowlist_user_id" };
  }

  const adminClient = createSupabaseAdminClient();
  const { data: xAcc } = await adminClient
    .from("x_accounts")
    .select("x_user_id, username")
    .eq("user_id", user.id)
    .maybeSingle();

  if (xAcc) {
    if (adminXUserIds.includes(xAcc.x_user_id)) {
      return { isAuthorized: true, userId: user.id, reason: "allowlist_x_user_id" };
    }
    if (adminUsernames.includes(xAcc.username.toLowerCase())) {
      return { isAuthorized: true, userId: user.id, reason: "allowlist_username" };
    }
  }

  // 3. Development Fallback: In dev mode, if no env allowlist is set, allow authenticated user as admin for local testing
  const hasConfiguredAllowlist =
    adminUserIds.length > 0 ||
    adminXUserIds.length > 0 ||
    adminUsernames.length > 0;

  if (process.env.NODE_ENV === "development" && !hasConfiguredAllowlist) {
    return { isAuthorized: true, userId: user.id, reason: "dev_default_admin" };
  }

  return { isAuthorized: false, userId: user.id, reason: "not_admin" };
}

/**
 * Log an administrative action to admin_audit_logs.
 */
export async function logAdminAction(
  adminUserId: string,
  action: string,
  entityType: string,
  entityId?: string | null,
  metadata?: Record<string, unknown>,
) {
  try {
    const adminClient = createSupabaseAdminClient();
    await adminClient.from("admin_audit_logs").insert({
      admin_user_id: adminUserId,
      action,
      entity_type: entityType,
      entity_id: entityId || null,
      metadata: (metadata as Json) || {},
    });
  } catch (err) {
    console.error("Failed to log admin action:", err);
  }
}
