-- Optional topic per group, used for cover colours and topic filters.
alter table public.groups
  add column if not exists topic text
  check (topic in ('sports', 'tech', 'food', 'travel', 'fitness', 'arts', 'music', 'photography', 'local', 'other'));

create index if not exists groups_topic_idx on public.groups (topic);
