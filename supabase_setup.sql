-- Run this SQL in your Supabase SQL Editor to set up the avatars storage

-- 1. Create the 'avatars' bucket
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

-- 2. Allow public access to view files in the 'avatars' bucket
create policy "Avatar images are publicly accessible."
on storage.objects for select
using ( bucket_id = 'avatars' );

-- 3. Allow authenticated users to upload files to the 'avatars' bucket
-- Note: You might want to restrict this further (e.g. valid file types, size limits) in production
create policy "Anyone can upload an avatar."
on storage.objects for insert
to authenticated
with check ( bucket_id = 'avatars' );

-- 4. Allow users to update their own avatars (if separate updates allow overwriting)
create policy "Users can update their own avatars."
on storage.objects for update
to authenticated
using ( bucket_id = 'avatars' );
