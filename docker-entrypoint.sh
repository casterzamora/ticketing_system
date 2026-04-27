#!/bin/sh
set -e

if [ -n "${DATABASE_URL}" ]; then
    export DB_CONNECTION=pgsql
    export DB_URL="$DATABASE_URL"
fi

export SESSION_DRIVER="${SESSION_DRIVER:-file}"
export CACHE_STORE="${CACHE_STORE:-file}"
export LOG_CHANNEL="${LOG_CHANNEL:-stderr}"

php artisan config:clear
php artisan migrate --force --graceful || true

if [ "${AUTO_SEED}" = "true" ]; then
    php artisan db:seed --force || true
fi

exec php artisan serve --host=0.0.0.0 --port="${PORT:-10000}"
