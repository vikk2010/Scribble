-- Group chat and live voice rooms. A room has at most 5 speakers ("on stage");
-- every other member can listen and chat.

create function public.is_group_member(gid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.group_members m where m.group_id = gid and m.user_id = (select auth.uid())
  );
$$;

create table public.group_messages (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups (id) on delete cascade,
  sender_id uuid not null references public.profiles (id) on delete cascade,
  body text not null check (char_length(trim(body)) between 1 and 2000),
  created_at timestamptz not null default now()
);

create index group_messages_group_idx on public.group_messages (group_id, created_at desc);

alter table public.group_messages enable row level security;

create policy "Members read group chat"
  on public.group_messages for select to authenticated
  using (public.is_group_member(group_id));

create policy "Members post in group chat"
  on public.group_messages for insert to authenticated
  with check ((select auth.uid()) = sender_id and public.is_group_member(group_id));

-- Stage seats. The LiveKit token only allows publishing audio for people listed here.
create table public.group_room_speakers (
  group_id uuid not null references public.groups (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (group_id, user_id)
);

alter table public.group_room_speakers enable row level security;

create policy "Members see who is on stage"
  on public.group_room_speakers for select to authenticated
  using (public.is_group_member(group_id));

create policy "Members take a free seat"
  on public.group_room_speakers for insert to authenticated
  with check ((select auth.uid()) = user_id and public.is_group_member(group_id));

create policy "Speakers leave, owners can clear the stage"
  on public.group_room_speakers for delete to authenticated
  using (
    (select auth.uid()) = user_id
    or exists (select 1 from public.groups g where g.id = group_id and g.created_by = (select auth.uid()))
  );

-- Hard limit of 5 seats, safe under concurrent joins.
create function public.enforce_stage_limit() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  perform pg_advisory_xact_lock(hashtext(new.group_id::text));
  if (select count(*) from public.group_room_speakers where group_id = new.group_id) >= 5 then
    raise exception 'stage_full' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

create trigger group_room_speakers_limit
  before insert on public.group_room_speakers
  for each row execute function public.enforce_stage_limit();

-- Leaving the group also frees the seat.
create function public.free_seat_on_leave() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  delete from public.group_room_speakers where group_id = old.group_id and user_id = old.user_id;
  return old;
end;
$$;

create trigger group_members_free_seat
  after delete on public.group_members
  for each row execute function public.free_seat_on_leave();

alter publication supabase_realtime add table public.group_messages;
alter publication supabase_realtime add table public.group_room_speakers;
