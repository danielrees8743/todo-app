-- Run this SQL in your Supabase SQL Editor to set up the avatars storage
-- IMPORTANT: If you have existing policies, drop them first before creating new ones

-- 1. Create the 'avatars' bucket
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

-- Drop existing insecure policies (run these if policies already exist)
-- drop policy if exists "Avatar images are publicly accessible." on storage.objects;
-- drop policy if exists "Anyone can upload an avatar." on storage.objects;
-- drop policy if exists "Users can update their own avatars." on storage.objects;

-- 2. Allow public access to view files in the 'avatars' bucket
create policy "Avatar images are publicly accessible."
on storage.objects for select
using ( bucket_id = 'avatars' );

-- 3. Allow authenticated users to upload files ONLY to their own folder
-- Files must be stored in a path starting with the user's ID (e.g., "user-uuid/filename.jpg")
create policy "Users can upload their own avatar."
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- 4. Allow users to update ONLY their own avatars
create policy "Users can update their own avatars."
on storage.objects for update
to authenticated
using (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- 5. Allow users to delete ONLY their own avatars
create policy "Users can delete their own avatars."
on storage.objects for delete
to authenticated
using (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = auth.uid()::text
);
