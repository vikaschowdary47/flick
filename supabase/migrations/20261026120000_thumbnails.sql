-- Image thumbnails: the uploading device makes a ~200px JPEG and stores it
-- in the same private bucket under <user_id>/thumbs/. Other devices download
-- only the thumbnail for grids and widgets. Deleting a file (by the user or
-- by 24-hour expiry) removes the thumbnail object too.
-- Run in the Supabase SQL Editor (or `supabase db push`). Safe to run twice.

alter table public.files
  add column if not exists thumb_path text;

-- Like storage_path: the first folder must be the owner's id (the bucket's
-- policies already enforce the same for the object itself).
alter table public.files drop constraint if exists files_thumb_path_belongs_to_user;
alter table public.files
  add constraint files_thumb_path_belongs_to_user
  check (thumb_path is null or split_part(thumb_path, '/', 1) = user_id::text);
