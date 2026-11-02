-- ==============================================================================
-- PyPaws: Supabase Storage Configuration for pet-images Bucket
-- Run this script in the Supabase SQL Editor if direct client/anon upload
-- without service_role key is required.
-- ==============================================================================

-- 1. Create bucket 'pet-images' if it doesn't already exist
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
    'pet-images',
    'pet-images',
    true,
    10485760, -- 10MB
    array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update set
    public = true,
    file_size_limit = 10485760,
    allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

-- 2. Allow public viewing (SELECT) of images in pet-images
drop policy if exists "Allow public read on pet-images" on storage.objects;
create policy "Allow public read on pet-images"
on storage.objects for select
using (bucket_id = 'pet-images');

-- 3. Allow anonymous and authenticated uploads (INSERT) to pet-images
drop policy if exists "Allow upload to pet-images" on storage.objects;
create policy "Allow upload to pet-images"
on storage.objects for insert
with check (bucket_id = 'pet-images');

-- 4. Allow updates / overwrites if upsert is true
drop policy if exists "Allow update on pet-images" on storage.objects;
create policy "Allow update on pet-images"
on storage.objects for update
using (bucket_id = 'pet-images');
