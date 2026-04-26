-- Run this in Supabase SQL Editor after schema creation.
-- It grants API roles access and creates permissive policies.

grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on all tables in schema public to anon, authenticated;
grant usage, select on all sequences in schema public to anon, authenticated;
alter default privileges in schema public grant select, insert, update, delete on tables to anon, authenticated;
alter default privileges in schema public grant usage, select on sequences to anon, authenticated;

alter table users enable row level security;
drop policy if exists users_all_anon on users;
create policy users_all_anon on users for all to anon, authenticated using (true) with check (true);

alter table friends enable row level security;
drop policy if exists friends_all_anon on friends;
create policy friends_all_anon on friends for all to anon, authenticated using (true) with check (true);

alter table friend_requests enable row level security;
drop policy if exists friend_requests_all_anon on friend_requests;
create policy friend_requests_all_anon on friend_requests for all to anon, authenticated using (true) with check (true);

alter table messages enable row level security;
drop policy if exists messages_all_anon on messages;
create policy messages_all_anon on messages for all to anon, authenticated using (true) with check (true);

alter table groups enable row level security;
drop policy if exists groups_all_anon on groups;
create policy groups_all_anon on groups for all to anon, authenticated using (true) with check (true);

alter table group_messages enable row level security;
drop policy if exists group_messages_all_anon on group_messages;
create policy group_messages_all_anon on group_messages for all to anon, authenticated using (true) with check (true);

alter table calls enable row level security;
drop policy if exists calls_all_anon on calls;
create policy calls_all_anon on calls for all to anon, authenticated using (true) with check (true);
