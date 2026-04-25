# Live Tix Ticketing System

Live Tix is a full-stack event booking and ticketing platform built with Laravel, React, Vite, and Tailwind.

Core capabilities include:

- Customer event discovery and booking checkout
- Admin event and inventory operations
- QR ticket issuance and gate scanning
- Refund and reschedule workflows
- PayMongo checkout integration with webhook/reconciliation flow
- Activity logging and notifications

## Tech Stack

- Backend: Laravel 12, PHP 8.2+
- Frontend: React, React Router, Axios, Vite, Tailwind
- Database: MySQL or PostgreSQL
- Queue: Laravel queue worker
- PDF + QR: DomPDF, Bacon QR Code

## Local Setup

1. Install dependencies:

	```bash
	composer install
	npm install
	```

2. Create environment file:

	```bash
	cp .env.example .env
	php artisan key:generate
	```

3. Configure database in `.env`, then run migrations:

	```bash
	php artisan migrate
	```

4. Start app:

	```bash
	php artisan serve
	npm run dev
	```

## PayMongo Configuration

Set these environment variables:

```env
PAYMONGO_SECRET_KEY=
PAYMONGO_PUBLIC_KEY=
PAYMONGO_WEBHOOK_SECRET=
PAYMONGO_BASE_URL=https://api.paymongo.com/v1
PAYMONGO_VERIFY_SSL=true
```

Notes:

- Use `sk_test` / `pk_test` for sandbox testing.
- Use `sk_live` / `pk_live` only in production.
- Configure webhook endpoint to: `/api/paymongo/webhook`.

## Render Deployment

This repository includes [render.yaml](render.yaml) with:

- A web service (`livetix-web`)
- A worker service (`livetix-worker`) for queue jobs

### Render Steps

1. Push repository to GitHub.
2. In Render, create Blueprint from the repo.
3. Add a PostgreSQL instance in Render.
4. Set environment variable values:
	- `APP_KEY=<base64:...>` (generate once via `php artisan key:generate --show`)
	- `APP_URL=https://<your-render-domain>`
	- `APP_FORCE_ROOT_URL=https://<your-render-domain>`
	- `DB_HOST`, `DB_DATABASE`, `DB_USERNAME`, `DB_PASSWORD`
	- PayMongo keys and webhook secret
5. Deploy.

### Required Production Environment Values

- `APP_ENV=production`
- `APP_DEBUG=false`
- `APP_FORCE_HTTPS=true`
- `SESSION_SECURE_COOKIE=true`
- `SESSION_DRIVER=database`
- `QUEUE_CONNECTION=database`

## Operations Checklist

After deployment:

1. Verify `/up` health endpoint.
2. Confirm login/logout and CSRF-protected forms.
3. Run one booking in PayMongo test mode.
4. Confirm booking status updates and tickets are issued.
5. Confirm queue worker is active (notifications/jobs process).

## Build and Quality Commands

```bash
npm run build
php artisan test
```
