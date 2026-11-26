-- Voice and video calls. Media runs through LiveKit; this table tracks ringing and history.

create table public.calls (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  started_by uuid not null references public.profiles (id) on delete cascade,
  kind text not null check (kind in ('audio', 'video')),
  status text not null default 'ringing' check (status in ('ringing', 'active', 'ended', 'missed', 'declined')),
  created_at timestamptz not null default now(),
  answered_at timestamptz,
  ended_at timestamptz
);

create index calls_conversation_idx on public.calls (conversation_id, created_at desc);

alter table public.calls enable row level security;

create policy "Members see calls in their conversations"
  on public.calls for select to authenticated
  using (public.is_conversation_member(conversation_id));

create policy "Members start calls as themselves"
  on public.calls for insert to authenticated
  with check (
    (select auth.uid()) = started_by
    and status = 'ringing'
    and public.is_conversation_member(conversation_id)
  );

create policy "Members update call status"
  on public.calls for update to authenticated
  using (public.is_conversation_member(conversation_id))
  with check (public.is_conversation_member(conversation_id));

-- Leave a note in the chat when a call is missed or declined.
create function public.note_unanswered_call() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.status in ('missed', 'declined') and old.status = 'ringing' then
    insert into public.messages (conversation_id, sender_id, body)
    values (
      new.conversation_id,
      new.started_by,
      case new.kind when 'video' then 'Missed video call' else 'Missed voice call' end
    );
  end if;
  return new;
end;
$$;

create trigger calls_note_unanswered
  after update of status on public.calls
  for each row execute function public.note_unanswered_call();

-- Ring members in real time.
alter publication supabase_realtime add table public.calls;
