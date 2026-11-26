-- Public posts and groups.

-- Posts: anyone can read; signed-in users write and delete their own.
create table public.posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles (id) on delete cascade,
  body text not null default '' check (char_length(body) <= 500),
  image_url text,
  created_at timestamptz not null default now(),
  constraint posts_not_empty check (char_length(trim(body)) > 0 or image_url is not null)
);

create index posts_created_at_idx on public.posts (created_at desc);
create index posts_author_idx on public.posts (author_id, created_at desc);

alter table public.posts enable row level security;

create policy "Posts are visible to everyone"
  on public.posts for select using (true);

create policy "Users create their own posts"
  on public.posts for insert to authenticated
  with check ((select auth.uid()) = author_id);

create policy "Users delete their own posts"
  on public.posts for delete to authenticated
  using ((select auth.uid()) = author_id);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('post-images', 'post-images', true, 10485760, array['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
on conflict (id) do nothing;

create policy "Users upload their own post images"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'post-images' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "Users delete their own post images"
  on storage.objects for delete to authenticated
  using (bucket_id = 'post-images' and (storage.foldername(name))[1] = (select auth.uid())::text);

-- Groups: visible to signed-in users; anyone signed in can create one and join or leave.
create table public.groups (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]{3,60}$'),
  name text not null check (char_length(name) between 3 and 50),
  description text not null default '' check (char_length(description) <= 300),
  created_by uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now()
);

create extension if not exists pg_trgm with schema extensions;
create index groups_name_trgm_idx on public.groups using gin (name extensions.gin_trgm_ops);

create table public.group_members (
  group_id uuid not null references public.groups (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'member')),
  joined_at timestamptz not null default now(),
  primary key (group_id, user_id)
);

create index group_members_user_idx on public.group_members (user_id);

alter table public.groups enable row level security;
alter table public.group_members enable row level security;

create policy "Signed-in users see groups"
  on public.groups for select to authenticated using (true);

create policy "Users create groups they own"
  on public.groups for insert to authenticated
  with check ((select auth.uid()) = created_by);

create policy "Owners update their groups"
  on public.groups for update to authenticated
  using ((select auth.uid()) = created_by)
  with check ((select auth.uid()) = created_by);

create policy "Signed-in users see group members"
  on public.group_members for select to authenticated using (true);

create policy "Users join groups as members"
  on public.group_members for insert to authenticated
  with check ((select auth.uid()) = user_id and role = 'member');

create policy "Users leave groups"
  on public.group_members for delete to authenticated
  using ((select auth.uid()) = user_id);

-- The creator becomes the group's owner.
create function public.add_group_owner() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.group_members (group_id, user_id, role) values (new.id, new.created_by, 'owner');
  return new;
end;
$$;

create trigger groups_add_owner
  after insert on public.groups
  for each row execute function public.add_group_owner();
