#!/bin/sh
set -e

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
