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
    libpq-dev \
    && docker-php-ext-install \
    bcmath \
    intl \
    mbstring \
    pdo \
    pdo_mysql \
    pdo_pgsql \
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

# Standard Laravel production entrypoint for Render (Supabase/Postgres)
CMD sh -lc ' \
    if [ -n "${DATABASE_URL:-}" ]; then \
        export DB_CONNECTION=pgsql; \
        # Extract components from DATABASE_URL (postgres://user:pass@host:port/db) \
        # This is a robust way to handle the Supabase connection string \
        export DB_URL="$DATABASE_URL"; \
    fi; \
    export SESSION_DRIVER="${SESSION_DRIVER:-file}"; \
    export CACHE_STORE="${CACHE_STORE:-file}"; \
    export LOG_CHANNEL="${LOG_CHANNEL:-stderr}"; \
    php artisan config:clear; \
    php artisan migrate --force --graceful || true; \
    php artisan serve --host=0.0.0.0 --port=${PORT:-10000} \
'
