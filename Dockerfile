FROM php:8.4-cli

# Install system dependencies in a single layer and clean up to save space
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    git \
    unzip \
    libzip-dev \
    libpng-dev \
    libonig-dev \
    libxml2-dev \
    libicu-dev \
    && docker-php-ext-install \
    bcmath \
    intl \
    mbstring \
    pdo \
    pdo_mysql \
    pcntl \
    zip \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

# Install Node.js (Stable 20)
RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y --no-install-recommends nodejs \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

WORKDIR /var/www/html

# Copy all project files
COPY . .

# Ensure fresh permissions for storage and bootstrap/cache (critical for Render)
RUN mkdir -p storage/framework/sessions storage/framework/views storage/framework/cache/data bootstrap/cache \
    && chmod -R 775 storage bootstrap/cache

# Install PHP dependencies without scripts to avoid environment issues during build
RUN composer install --no-dev --no-interaction --prefer-dist --no-scripts \
    && composer dump-autoload --optimize --no-dev

# Install Node dependencies and build Vite assets
RUN npm ci --no-audit --no-fund
RUN npm run build

EXPOSE 10000

# Bootstrap env safely on Render, then start the app.
CMD sh -lc ' \
    if [ -n "${DATABASE_URL:-}" ] && [ -z "${DB_URL:-}" ]; then export DB_URL="$DATABASE_URL"; fi; \
    if [ -n "${MYSQLHOST:-}" ]; then export DB_HOST="$MYSQLHOST"; fi; \
    if [ -n "${MYSQLPORT:-}" ]; then export DB_PORT="$MYSQLPORT"; fi; \
    if [ -n "${MYSQLDATABASE:-}" ]; then export DB_DATABASE="$MYSQLDATABASE"; fi; \
    if [ -n "${MYSQLUSER:-}" ]; then export DB_USERNAME="$MYSQLUSER"; fi; \
    if [ -n "${MYSQLPASSWORD:-}" ]; then export DB_PASSWORD="$MYSQLPASSWORD"; fi; \
    if [ "${APP_URL:-}" = "http://127.0.0.1:8000" ] || [ "${APP_URL:-}" = "http://localhost:8000" ]; then export APP_URL="https://${RENDER_EXTERNAL_HOSTNAME:-livetix-web.onrender.com}"; fi; \
    export SESSION_DRIVER="file"; \
    export CACHE_STORE="file"; \
    export LOG_CHANNEL="stderr"; \
    if [ -z "${APP_KEY:-}" ]; then export APP_KEY="$(php artisan key:generate --show --no-interaction)"; fi; \
    php artisan config:clear; \
    php artisan config:cache; \
    php artisan view:cache; \
    php artisan serve --host=0.0.0.0 --port=${PORT:-10000} \
'
