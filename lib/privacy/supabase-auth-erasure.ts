import { createClient } from "@supabase/supabase-js";

export type SupabaseAuthErasureResult = {
  matched: boolean;
  deleted: boolean;
};

/**
 * Removes a legacy/parallel Supabase Auth identity only when its email matches
 * the application user exactly. The application itself authenticates through
 * NextAuth/Public.User; this closes the parallel auth.* identity store during
 * account erasure.
 *
 * This is fail-closed: if the admin API cannot be checked or deletion fails,
 * account erasure must not be reported as successful.
 */
export async function eraseMatchingSupabaseAuthIdentity(email: string): Promise<SupabaseAuthErasureResult> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("supabase_auth_configuration_missing");
  }

  const targetEmail = email.trim().toLowerCase();
  if (!targetEmail) return { matched: false, deleted: false };

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const matches: Array<{ id: string }> = [];
  const perPage = 100;
  for (let page = 1; page <= 100; page += 1) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });
    if (error) throw new Error("supabase_auth_list_failed");

    for (const authUser of data.users) {
      if (authUser.email?.trim().toLowerCase() === targetEmail) {
        matches.push({ id: authUser.id });
      }
    }

    if (data.users.length < perPage) break;
  }

  if (matches.length === 0) return { matched: false, deleted: false };
  if (matches.length !== 1) throw new Error("supabase_auth_identity_ambiguous");

  const { error: deleteError } = await supabase.auth.admin.deleteUser(matches[0].id);
  if (deleteError) throw new Error("supabase_auth_delete_failed");

  return { matched: true, deleted: true };
}
