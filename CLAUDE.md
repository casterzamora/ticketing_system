# Live Tix — Claude Context

## What This Project Is
A full-stack event ticketing platform called **Live Tix**, built by Shadrach Malaque as a college IT thesis project.

- **Backend**: Laravel 12 (PHP 8.4), REST API under `/api`
- **Frontend**: React SPA (React Router, Axios, Vite, Tailwind CSS)
- **Database**: MySQL locally, Supabase PostgreSQL in production
- **Deployment**: Render (Docker container) + Supabase
- **Payment**: PayMongo (GCash, Maya, card) — test keys in `.env`
- **Email**: Mailjet SMTP

## Local Development

```bash
# Start backend
php artisan serve

# Start frontend (separate terminal)
npm run dev
```

Local database is MySQL at `127.0.0.1:3306`, database name `laravel`, user `root`, no password.

## Deployment: Render + Supabase

- `Dockerfile` — builds and serves the app
- `docker-entrypoint.sh` — startup script: detects `DATABASE_URL`, sets `DB_CONNECTION=pgsql`, runs migrations, starts server
- `render.yaml` — Render Blueprint config

**Key env vars to set manually on Render dashboard** (`sync: false` in render.yaml):
- `APP_KEY` — generate with `php artisan key:generate --show`
- `APP_URL` — your Render URL (e.g. `https://livetix-web.onrender.com`)
- `DATABASE_URL` — Supabase connection string (from Supabase → Project Settings → Database → Connection String → URI)
- `MAIL_USERNAME`, `MAIL_PASSWORD`, `MAIL_FROM_ADDRESS` — Mailjet credentials
- `PAYMONGO_SECRET_KEY`, `PAYMONGO_PUBLIC_KEY`, `PAYMONGO_WEBHOOK_SECRET`

## How DATABASE_URL Works
When Render starts the container, `docker-entrypoint.sh` checks for `DATABASE_URL`. If found, it sets:
```sh
export DB_CONNECTION=pgsql
export DB_URL="$DATABASE_URL"
```
Laravel's `pgsql` connection reads `DB_URL` and parses the full PostgreSQL connection string automatically.

## MCP Servers (for Claude Code)

Two local MCP servers in the project root:

- **`mcp-database/`** — `lara-db`: Read-only MySQL queries against the local database (`query_database`, `describe_table`)
- **`mcp-laradocs/`** — `lara-docs`: Fetches Laravel 11.x documentation (`search_laradocs`)

Configured in `.claude/settings.json`. **Requires MySQL running locally** for `lara-db` to work.

## Key Architecture Points

- All API routes under `routes/api.php`, frontend served as SPA via `routes/web.php`
- Session and cache use `database` driver in production (Supabase), `database` locally too
- Queue is `sync` (no separate worker) — jobs run inline in the web request
- PayMongo webhook endpoint: `POST /api/paymongo/webhook`
- Health check: `GET /up`
- `QUEUE_CONNECTION=sync` means notifications/emails fire inline per request

## System Roles
- **Admin**: creates/manages events, scans tickets at gate, views refund ledger, manages users
- **Customer**: browses events, books tickets, pays via PayMongo, downloads PDF tickets with QR codes

## Core Tables
`users`, `events`, `ticket_types`, `bookings`, `booking_tickets`, `tickets`, `payments`, `refund_requests`, `notification_logs`, `activity_logs`, `system_settings`
