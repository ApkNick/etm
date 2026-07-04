/*
# Remove ad-media listing policy entirely

1. Issue
- The `ad-media` bucket is public. Any SELECT policy on `storage.objects` for a public bucket allows file listing via the storage API, which exposes more data than intended.
- Public buckets serve object URLs directly without going through RLS, so no SELECT policy is needed for image display.

2. Fix
- Drop the `ad_media_list_authenticated` SELECT policy completely.
- No replacement policy: object URLs work without RLS; listing is fully disabled.

3. Security
- Anonymous and authenticated clients can no longer list files in the `ad-media` bucket via the storage API.
- Individual object URLs (used in <img> tags) still work because the bucket is public.
*/

DROP POLICY IF EXISTS "ad_media_list_authenticated" ON storage.objects;
