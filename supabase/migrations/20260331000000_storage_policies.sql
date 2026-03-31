-- Victoria's Apartment Finder — Storage Policies
-- Migration: 20260331000000_storage_policies

-- ============================================================
-- Storage policies for the apartment-images bucket
-- ============================================================

-- Drop existing policies if they exist, then recreate
do $$
begin
  drop policy if exists "Anyone can view apartment images" on storage.objects;
  drop policy if exists "Landlords can upload apartment images" on storage.objects;
  drop policy if exists "Landlords can update own images" on storage.objects;
  drop policy if exists "Landlords can delete own images" on storage.objects;
end $$;

-- Anyone can view apartment images (bucket is public)
create policy "Anyone can view apartment images"
  on storage.objects for select
  using (bucket_id = 'apartment-images');

-- Authenticated users can upload images to their own folder
create policy "Landlords can upload apartment images"
  on storage.objects for insert
  with check (
    bucket_id = 'apartment-images'
    and auth.uid() is not null
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Users can update their own uploaded images
create policy "Landlords can update own images"
  on storage.objects for update
  using (
    bucket_id = 'apartment-images'
    and auth.uid() is not null
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Users can delete their own uploaded images
create policy "Landlords can delete own images"
  on storage.objects for delete
  using (
    bucket_id = 'apartment-images'
    and auth.uid() is not null
    and (storage.foldername(name))[1] = auth.uid()::text
  );
