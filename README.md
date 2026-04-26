# TelegaDrun (GitHub Pages)

Статическая версия мессенджера для GitHub Pages с базой в Supabase.

## Как это работает

- Приложение полностью фронтендное: `index.html` + `gh-pages-api.js`.
- Запросы к `/api/*` перехватываются в `gh-pages-api.js`.
- `gh-pages-api.js` пишет/читает данные из Supabase (Postgres через REST API).
- Локальный Python/Node сервер больше не нужен.

## Деплой на GitHub Pages

1. Запушь репозиторий на GitHub.
2. Открой **Settings -> Pages**.
3. В разделе **Build and deployment** выбери:
   - **Source**: `Deploy from a branch`
   - **Branch**: `main` (или твоя ветка), папка `/ (root)`
4. Сохрани и дождись публикации.

## Настройка Supabase

Открой SQL Editor в Supabase и выполни:

```sql
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

create table if not exists calls (
  call_to text primary key,
  from_user text not null,
  type text,
  time double precision
);
```

Если включен RLS, добавь политики (или временно выключи RLS для этих таблиц), иначе клиент не сможет читать/писать.

## Примечания

- Данные синхронизируются между устройствами через Supabase.
- В демо пароль хранится как обычный текст (как и в старой версии). Для продакшна лучше сделать Supabase Auth + хэширование на сервере.