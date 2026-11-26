-- Likes, comments and short video posts.

alter table public.posts add column video_url text;
alter table public.posts drop constraint posts_not_empty;
alter table public.posts add constraint posts_not_empty
  check (char_length(trim(body)) > 0 or image_url is not null or video_url is not null);
alter table public.posts add constraint posts_one_media
  check (image_url is null or video_url is null);

-- Short videos: up to 50 MB; the app limits them to 60 seconds before upload.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('post-videos', 'post-videos', true, 52428800, array['video/mp4', 'video/webm', 'video/quicktime'])
on conflict (id) do nothing;

create policy "Users upload their own post videos"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'post-videos' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "Users delete their own post videos"
  on storage.objects for delete to authenticated
  using (bucket_id = 'post-videos' and (storage.foldername(name))[1] = (select auth.uid())::text);

create table public.post_likes (
  post_id uuid not null references public.posts (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

create index post_likes_user_idx on public.post_likes (user_id);

alter table public.post_likes enable row level security;

create policy "Likes are visible to everyone"
  on public.post_likes for select using (true);

create policy "Users like as themselves"
  on public.post_likes for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Users remove their own likes"
  on public.post_likes for delete to authenticated
  using ((select auth.uid()) = user_id);

create table public.post_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts (id) on delete cascade,
  author_id uuid not null references public.profiles (id) on delete cascade,
  body text not null check (char_length(trim(body)) between 1 and 300),
  created_at timestamptz not null default now()
);

create index post_comments_post_idx on public.post_comments (post_id, created_at);

alter table public.post_comments enable row level security;

create policy "Comments are visible to everyone"
  on public.post_comments for select using (true);

create policy "Users comment as themselves"
  on public.post_comments for insert to authenticated
  with check ((select auth.uid()) = author_id);

create policy "Authors and post owners delete comments"
  on public.post_comments for delete to authenticated
  using (
    (select auth.uid()) = author_id
    or (select auth.uid()) = (select p.author_id from public.posts p where p.id = post_id)
  );
