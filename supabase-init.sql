-- Run this in Supabase SQL Editor once.

create table if not exists users (
  username text primary key,
  password text not null,
  online boolean default false,
  created_at double precision,
  display_name text,
  avatar text,
  theme text,
  sound boolean default true,
  vibrate boolean default true,
  sound_type text,
  custom_sound text
);

create table if not exists friends (
  user text not null,
  friend text not null,
  primary key (user, friend)
);

create table if not exists friend_requests (
  user text not null,
  from_user text not null,
  primary key (user, from_user)
);

create table if not exists messages (
  id text primary key,
  chat_key text not null,
  sender text not null,
  text text,
  type text,
  data text,
  timestamp double precision,
  deleted_for_sender boolean default false
);

create index if not exists messages_chat_key_idx on messages(chat_key);
create index if not exists messages_timestamp_idx on messages(timestamp);

create table if not exists groups (
  name text primary key,
  members jsonb default '[]'::jsonb,
  created_at double precision,
  avatar text
);

create table if not exists group_messages (
  id text primary key,
  group_name text not null,
  sender text not null,
  text text,
  timestamp double precision
);

create index if not exists group_messages_group_name_idx on group_messages(group_name);
create index if not exists group_messages_timestamp_idx on group_messages(timestamp);

create table if not exists calls (
  call_to text primary key,
  from_user text not null,
  type text,
  time double precision
);

-- Demo mode: disable RLS so anon key can read/write.
alter table users disable row level security;
alter table friends disable row level security;
alter table friend_requests disable row level security;
alter table messages disable row level security;
alter table groups disable row level security;
alter table group_messages disable row level security;
alter table calls disable row level security;
