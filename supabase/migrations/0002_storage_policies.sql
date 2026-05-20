-- SnapStudy storage bucket + RLS policies
-- Files live at `{userId}/{captureId}.jpg` in the private `captures` bucket.

-- ============================================================
-- BUCKET
-- ============================================================
insert into storage.buckets (id, name, public)
values ('captures', 'captures', false)
on conflict (id) do nothing;

-- ============================================================
-- RLS POLICIES on storage.objects
-- ============================================================
-- Drop existing policies (idempotent re-run support)
drop policy if exists "captures_own_folder_select" on storage.objects;
drop policy if exists "captures_own_folder_insert" on storage.objects;
drop policy if exists "captures_own_folder_update" on storage.objects;
drop policy if exists "captures_own_folder_delete" on storage.objects;

-- SELECT: users can read files under their own {auth.uid()}/ prefix
create policy "captures_own_folder_select" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'captures'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- INSERT: users can upload only into their own folder
create policy "captures_own_folder_insert" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'captures'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- UPDATE: users can update only files in their own folder
create policy "captures_own_folder_update" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'captures'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'captures'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- DELETE: users can delete only files in their own folder
create policy "captures_own_folder_delete" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'captures'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
