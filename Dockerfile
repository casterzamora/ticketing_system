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

# Chained command to handle bootstrapping and start the server
# Using -n to skip migrations if DB isn't ready during initial boot
CMD php artisan config:cache && \
    php artisan view:cache && \
    php artisan migrate --force && \
    php artisan serve --host=0.0.0.0 --port=${PORT:-10000}
