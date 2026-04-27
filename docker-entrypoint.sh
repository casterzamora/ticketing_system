#!/bin/sh
set -e

if [ -n "${DATABASE_URL}" ]; then
    export DB_CONNECTION=pgsql
    # Parse individual components so Laravel never runs URL parsing on the Supabase
    # username (postgres.PROJECTREF) — the dot causes "Tenant or user not found" via PgBouncer.
    _u="${DATABASE_URL#postgresql://}"
    _u="${_u#postgres://}"
    export DB_USERNAME="${_u%%:*}"
    _u="${_u#*:}"
    export DB_PASSWORD="${_u%%@*}"
    _u="${_u#*@}"
    export DB_HOST="${_u%%:*}"
    _u="${_u#*:}"
    export DB_PORT="${_u%%/*}"
    _db="${_u#*/}"
    export DB_DATABASE="${_db%%\?*}"
fi

export SESSION_DRIVER="${SESSION_DRIVER:-file}"
export CACHE_STORE="${CACHE_STORE:-file}"
export LOG_CHANNEL="${LOG_CHANNEL:-stderr}"

php artisan config:clear
php artisan cache:clear || true
php artisan view:clear || true
php artisan route:clear || true
php artisan migrate --force || true
php artisan storage:link --force || true

if [ "${AUTO_SEED}" = "true" ]; then
    php artisan db:seed --force || true
fi

exec php artisan serve --host=0.0.0.0 --port="${PORT:-10000}"
