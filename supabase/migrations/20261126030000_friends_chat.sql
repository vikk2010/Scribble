-- Friends, conversations and real-time messages.

-- Friendships: one row per pair. The requester asks, the addressee accepts.
create table public.friendships (
  requester_id uuid not null references public.profiles (id) on delete cascade,
  addressee_id uuid not null references public.profiles (id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted')),
  created_at timestamptz not null default now(),
  responded_at timestamptz,
  primary key (requester_id, addressee_id),
  check (requester_id <> addressee_id)
);

create unique index friendships_pair_idx
  on public.friendships (least(requester_id, addressee_id), greatest(requester_id, addressee_id));
create index friendships_addressee_idx on public.friendships (addressee_id, status);

alter table public.friendships enable row level security;

create policy "Users see their own friendships"
  on public.friendships for select to authenticated
  using ((select auth.uid()) in (requester_id, addressee_id));

create policy "Users send friend requests"
  on public.friendships for insert to authenticated
  with check ((select auth.uid()) = requester_id and status = 'pending');

create policy "Addressees accept requests"
  on public.friendships for update to authenticated
  using ((select auth.uid()) = addressee_id)
  with check ((select auth.uid()) = addressee_id and status = 'accepted');

create policy "Either side removes a friendship"
  on public.friendships for delete to authenticated
  using ((select auth.uid()) in (requester_id, addressee_id));

create function public.are_friends(a uuid, b uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.friendships f
    where f.status = 'accepted'
      and least(f.requester_id, f.addressee_id) = least(a, b)
      and greatest(f.requester_id, f.addressee_id) = greatest(a, b)
  );
$$;

-- Conversations: 1:1 (is_group = false) or group chats.
create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  is_group boolean not null default false,
  title text check (title is null or char_length(title) between 1 and 50),
  created_by uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  last_message_at timestamptz not null default now()
);

create table public.conversation_members (
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  joined_at timestamptz not null default now(),
  last_read_at timestamptz not null default now(),
  primary key (conversation_id, user_id)
);

create index conversation_members_user_idx on public.conversation_members (user_id);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  sender_id uuid not null references public.profiles (id) on delete cascade,
  body text not null check (char_length(trim(body)) between 1 and 2000),
  created_at timestamptz not null default now()
);

create index messages_conversation_idx on public.messages (conversation_id, created_at desc);

-- Membership check that does not recurse through RLS.
create function public.is_conversation_member(cid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.conversation_members m
    where m.conversation_id = cid and m.user_id = (select auth.uid())
  );
$$;

alter table public.conversations enable row level security;
alter table public.conversation_members enable row level security;
alter table public.messages enable row level security;

create policy "Members see their conversations"
  on public.conversations for select to authenticated
  using (public.is_conversation_member(id));

create policy "Members see who is in their conversations"
  on public.conversation_members for select to authenticated
  using (public.is_conversation_member(conversation_id));

create policy "Members update their own read marker"
  on public.conversation_members for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Members leave conversations"
  on public.conversation_members for delete to authenticated
  using ((select auth.uid()) = user_id);

create policy "Members read messages"
  on public.messages for select to authenticated
  using (public.is_conversation_member(conversation_id));

create policy "Members send messages as themselves"
  on public.messages for insert to authenticated
  with check ((select auth.uid()) = sender_id and public.is_conversation_member(conversation_id));

create function public.touch_conversation() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  update public.conversations set last_message_at = new.created_at where id = new.conversation_id;
  update public.conversation_members set last_read_at = new.created_at
    where conversation_id = new.conversation_id and user_id = new.sender_id;
  return new;
end;
$$;

create trigger messages_touch_conversation
  after insert on public.messages
  for each row execute function public.touch_conversation();

-- Opens the 1:1 chat with a friend, creating it the first time.
create function public.start_direct_conversation(other uuid) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  me uuid := auth.uid();
  cid uuid;
begin
  if me is null then raise exception 'not signed in'; end if;
  if not public.are_friends(me, other) then raise exception 'you can only message friends'; end if;

  select c.id into cid
  from public.conversations c
  join public.conversation_members a on a.conversation_id = c.id and a.user_id = me
  join public.conversation_members b on b.conversation_id = c.id and b.user_id = other
  where not c.is_group
  limit 1;

  if cid is null then
    insert into public.conversations (is_group, created_by) values (false, me) returning id into cid;
    insert into public.conversation_members (conversation_id, user_id) values (cid, me), (cid, other);
  end if;
  return cid;
end;
$$;

-- Creates a group chat with some of your friends.
create function public.create_group_conversation(chat_title text, member_ids uuid[]) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  me uuid := auth.uid();
  cid uuid;
  m uuid;
begin
  if me is null then raise exception 'not signed in'; end if;
  if coalesce(array_length(member_ids, 1), 0) < 2 then raise exception 'pick at least two friends'; end if;
  foreach m in array member_ids loop
    if not public.are_friends(me, m) then raise exception 'you can only add friends'; end if;
  end loop;

  insert into public.conversations (is_group, title, created_by) values (true, trim(chat_title), me) returning id into cid;
  insert into public.conversation_members (conversation_id, user_id)
    select cid, u from unnest(array_append(member_ids, me)) as u
    on conflict do nothing;
  return cid;
end;
$$;

-- Inbox: my conversations with the last message, unread state and display info.
create function public.my_conversations()
returns table (
  id uuid,
  is_group boolean,
  title text,
  last_message_at timestamptz,
  last_message text,
  last_sender_id uuid,
  unread boolean,
  other_username text,
  other_display_name text,
  other_avatar_url text,
  member_count int
)
language sql stable security definer set search_path = public as $$
  select
    c.id,
    c.is_group,
    c.title,
    c.last_message_at,
    lm.body,
    lm.sender_id,
    (lm.created_at is not null and lm.created_at > me.last_read_at and lm.sender_id <> me.user_id),
    op.username,
    op.display_name,
    op.avatar_url,
    (select count(*)::int from public.conversation_members x where x.conversation_id = c.id)
  from public.conversation_members me
  join public.conversations c on c.id = me.conversation_id
  left join lateral (
    select m.body, m.sender_id, m.created_at from public.messages m
    where m.conversation_id = c.id order by m.created_at desc limit 1
  ) lm on true
  left join lateral (
    select p.username, p.display_name, p.avatar_url
    from public.conversation_members o join public.profiles p on p.id = o.user_id
    where o.conversation_id = c.id and o.user_id <> me.user_id
    limit 1
  ) op on not c.is_group
  where me.user_id = auth.uid()
  order by c.last_message_at desc
  limit 100;
$$;

revoke execute on function public.start_direct_conversation(uuid) from anon;
revoke execute on function public.create_group_conversation(text, uuid[]) from anon;
revoke execute on function public.my_conversations() from anon;

-- Stream new messages to members in real time (RLS applies to subscribers).
alter publication supabase_realtime add table public.messages;
