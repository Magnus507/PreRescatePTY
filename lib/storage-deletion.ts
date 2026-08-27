import { createClient } from "@supabase/supabase-js";

const DELETABLE_BUCKETS = new Set(["profile-photos", "payment-proofs"]);

export type StorageObjectRef = { bucket: string; path: string };

export function parseStorageObjectRef(value: string | null | undefined): StorageObjectRef | null {
  if (!value) return null;

  try {
    const url = new URL(value, "https://prerescate.local");
    if (value.startsWith("/api/image-proxy?") && url.pathname === "/api/image-proxy") {
      const bucket = url.searchParams.get("bucket");
      const path = url.searchParams.get("path");
      if (bucket && path && DELETABLE_BUCKETS.has(bucket) && !path.includes("..")) {
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
    if (!bucket || !path || !DELETABLE_BUCKETS.has(bucket) || path.includes("..")) return null;
    return { bucket, path };
  } catch {
    return null;
  }
}

export async function deleteStorageObjects(refs: StorageObjectRef[]) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) throw new Error("storage_configuration_missing");

  const grouped = new Map<string, Set<string>>();
  for (const ref of refs) {
    if (!DELETABLE_BUCKETS.has(ref.bucket) || !ref.path || ref.path.includes("..")) continue;
    const paths = grouped.get(ref.bucket) ?? new Set<string>();
    paths.add(ref.path);
    grouped.set(ref.bucket, paths);
  }

  if (grouped.size === 0) return;
  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  for (const [bucket, paths] of grouped) {
    const { error } = await supabase.storage.from(bucket).remove([...paths]);
    if (error) throw new Error(`storage_delete_failed:${bucket}`);
  }
}
