-- Storage cleanup work is an internal server-side outbox. It must never be
-- reachable through the Supabase Data API with anon/authenticated credentials.
REVOKE ALL ON TABLE public."StorageCleanupOutbox" FROM anon, authenticated;
ALTER TABLE public."StorageCleanupOutbox" ENABLE ROW LEVEL SECURITY;
