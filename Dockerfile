# ==============================================================================
# Stage 1: Frontend Build
# ==============================================================================
FROM node:20-alpine AS frontend-builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# ==============================================================================
# Stage 2: Composer Dependencies
# ==============================================================================
FROM composer:2 AS composer-builder
WORKDIR /app
COPY composer*.json ./
RUN composer install --no-dev --optimize-autoloader --no-interaction --no-scripts

# ==============================================================================
# Stage 3: Production Runtime
# ==============================================================================
FROM php:8.4-fpm-alpine AS runtime

# Install system dependencies & curl for healthchecks
RUN apk add --no-cache \
    nginx \
    supervisor \
    postgresql-client \
    libpng-dev \
    libjpeg-turbo-dev \
    libwebp-dev \
    libzip-dev \
    zip \
    unzip \
    bash \
    curl

# Add PHP Extension Installer
ADD https://github.com/mlocati/docker-php-extension-installer/releases/latest/download/install-php-extensions /usr/local/bin/

RUN chmod +x /usr/local/bin/install-php-extensions && \
    install-php-extensions pdo_pgsql redis gd zip opcache

# Configure Nginx permissions and log directories
RUN mkdir -p /var/log/supervisor /var/log/nginx /var/lib/nginx /var/tmp/nginx /var/run && \
    chown -R www-data:www-data /var/log/nginx /var/lib/nginx /var/tmp/nginx /var/run

# Set up directories and permissions
WORKDIR /var/www/html

# Copy application files
COPY --chown=www-data:www-data . .

# Copy built vendor files and node assets
COPY --from=composer-builder --chown=www-data:www-data /app/vendor ./vendor
COPY --from=frontend-builder --chown=www-data:www-data /app/public/build ./public/build

# Configure Nginx, PHP, and Supervisor
COPY docker/nginx.conf /etc/nginx/nginx.conf
COPY docker/php.ini /usr/local/etc/php/conf.d/app.ini
COPY docker/supervisord.conf /etc/supervisor/conf.d/supervisord.conf

# Set directory permissions for Laravel storage/cache
RUN chmod -R 775 storage bootstrap/cache && \
    chown -R www-data:www-data storage bootstrap/cache

# Expose port
EXPOSE 80

# Container healthcheck against local Laravel endpoint
HEALTHCHECK --interval=30s --timeout=10s --retries=3 \
  CMD curl -f http://127.0.0.1/up || exit 1

# Start Supervisor
CMD ["/usr/bin/supervisord", "-c", "/etc/supervisor/conf.d/supervisord.conf"]
