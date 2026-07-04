/*
# Fix security issues: function search path + public bucket listing

1. Function Search Path Mutable
- `public.touch_updated_at` has a mutable search_path, which is a security risk (search_path injection).
- Fix: recreate the function with an explicit `SET search_path = public` clause so it always resolves in a safe, fixed schema path.

2. Public Bucket Allows Listing
- The `ad-media` bucket is public (public read for object URLs is intended), but the SELECT policy `ad_media_public_read` allows clients to LIST all files in the bucket via the storage API, potentially exposing file names/metadata of all users.
- Fix: replace the broad SELECT policy with one scoped to authenticated users only for listing, while keeping anon read working through public URLs (public buckets serve object URLs directly without RLS). This prevents anonymous listing while preserving public image display.
- Actually, for a public bucket, object URLs are served without going through RLS at all. The SELECT policy only governs the storage API listing endpoint. We restrict listing to authenticated users so anonymous clients cannot enumerate all files, but images still load via public URLs.

3. Security changes
- Recreate `touch_updated_at` with `SET search_path = public`.
- Drop `ad_media_public_read` and replace with `ad_media_list_authenticated` (TO authenticated).
*/

-- Fix 1: Recreate function with fixed search_path
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Fix 2: Restrict ad-media listing to authenticated users only
-- (public bucket URLs still work without RLS; this only affects the storage API list endpoint)
DROP POLICY IF EXISTS "ad_media_public_read" ON storage.objects;
DROP POLICY IF EXISTS "ad_media_list_authenticated" ON storage.objects;
CREATE POLICY "ad_media_list_authenticated" ON storage.objects
  FOR SELECT TO authenticated USING (bucket_id = 'ad-media');
