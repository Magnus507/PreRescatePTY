-- NEW-18: supported Supabase transport, without scheduling or network requests.
-- Extension-managed grants are assessed through actual client reachability.
begin;
create extension if not exists pg_net;
commit;
