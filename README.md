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

1. Открой SQL Editor в Supabase.
2. Выполни скрипт из файла `supabase-init.sql`.
3. Выполни скрипт из файла `supabase-rls-fix.sql`.
4. Убедись, что запросы к таблицам проходят без ошибок.

В `supabase-init.sql` уже есть:
- создание всех таблиц;
- нужные индексы;
- базовая подготовка под demo.

В `supabase-rls-fix.sql`:
- выдаются права `anon/authenticated` на таблицы;
- создаются permissive RLS policy для всех таблиц.

## Примечания

- Данные синхронизируются между устройствами через Supabase.
- В демо пароль хранится как обычный текст (как и в старой версии). Для продакшна лучше сделать Supabase Auth + хэширование на сервере.