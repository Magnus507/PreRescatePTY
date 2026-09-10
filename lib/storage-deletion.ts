import { createClient } from "@supabase/supabase-js";

const STORAGE_BUCKETS = new Set(["general", "profile-photos", "payment-proofs"]);
const DELETE_ON_ERASURE_BUCKETS = new Set(["general", "profile-photos"]);

export type StorageObjectRef = { bucket: string; path: string };

export function isDeleteOnErasureStorageRef(ref: StorageObjectRef) {
  return DELETE_ON_ERASURE_BUCKETS.has(ref.bucket);
}

export function parseStorageObjectRef(value: string | null | undefined): StorageObjectRef | null {
  if (!value) return null;

  try {
    const url = new URL(value, "https://prerescate.local");
    if (value.startsWith("/api/image-proxy?") && url.pathname === "/api/image-proxy") {
      const bucket = url.searchParams.get("bucket");
      const path = url.searchParams.get("path");
      if (bucket && path && STORAGE_BUCKETS.has(bucket) && !path.includes("..")) {
        return { bucket, path };
      }
      return null;
    }

    const marker = "/storage/v1/object/public/";
    const markerIndex = url.pathname.indexOf(marker);
    if (markerIndex < 0) return null;

    const configuredSupabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!configuredSupabaseUrl || url.origin !== new URL(configuredSupabaseUrl).origin) return null;

    const [bucket, ...pathParts] = url.pathname.slice(markerIndex + marker.length).split("/");
    const path = decodeURIComponent(pathParts.join("/"));
    if (!bucket || !path || !STORAGE_BUCKETS.has(bucket) || path.includes("..")) return null;
    return { bucket, path };
  } catch {
    return null;
  }
}

function createStorageAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) throw new Error("storage_configuration_missing");
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function listPrefix(
  supabase: ReturnType<typeof createStorageAdminClient>,
  bucket: string,
  prefix: string,
): Promise<StorageObjectRef[]> {
  const refs: StorageObjectRef[] = [];
  const limit = 100;
  for (let offset = 0; offset < 10_000; offset += limit) {
    const { data, error } = await supabase.storage.from(bucket).list(prefix, {
      limit,
      offset,
      sortBy: { column: "name", order: "asc" },
    });
    if (error) throw new Error(`storage_list_failed:${bucket}`);
    const rows = data ?? [];
    for (const row of rows) {
      if (!row.name || row.name === ".emptyFolderPlaceholder") continue;
      refs.push({ bucket, path: `${prefix}/${row.name}` });
    }
    if (rows.length < limit) break;
  }
  return refs;
}

/**
 * Discovers user-scoped assets classified DELETE_ON_ERASURE whose database
 * reference may already have been lost. Payment proofs are deliberately not
 * listed here: they are private RETAIN_LEGAL evidence and are removed only by
 * their retention/hold lifecycle, not by account erasure.
 */
export async function listUserScopedStorageRefs(userId: string): Promise<StorageObjectRef[]> {
  const normalizedUserId = userId.trim();
  if (!normalizedUserId || normalizedUserId.includes("/") || normalizedUserId.includes("..")) {
    throw new Error("invalid_storage_subject_id");
  }

  const supabase = createStorageAdminClient();
  const discovered = await Promise.all([
    listPrefix(supabase, "general", normalizedUserId),
    listPrefix(supabase, "profile-photos", normalizedUserId),
  ]);
  const unique = new Map<string, StorageObjectRef>();
  for (const ref of discovered.flat()) unique.set(`${ref.bucket}:${ref.path}`, ref);
  return [...unique.values()];
}

export async function deleteStorageObjects(refs: StorageObjectRef[]) {
  const grouped = new Map<string, Set<string>>();
  for (const ref of refs) {
    if (!STORAGE_BUCKETS.has(ref.bucket) || !ref.path || ref.path.includes("..")) continue;
    const paths = grouped.get(ref.bucket) ?? new Set<string>();
    paths.add(ref.path);
    grouped.set(ref.bucket, paths);
  }

  if (grouped.size === 0) return;
  const supabase = createStorageAdminClient();

  for (const [bucket, paths] of grouped) {
    const { error } = await supabase.storage.from(bucket).remove([...paths]);
    if (error) throw new Error(`storage_delete_failed:${bucket}`);
  }
}
