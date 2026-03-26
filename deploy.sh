#!/bin/bash

# PingPongClub CRM - Advanced Server Deployment Script
# Targets Ubuntu/Debian servers

echo "🚀 Starting Advanced Deployment on Port 8003..."

# Fix Git security issue (dubious ownership)
git config --global --add safe.directory /var/www/pingpong_crm 2>/dev/null || true

# 1. Update and Add PHP Repositories
echo "📦 Updating repositories and installing PHP 8.2..."
sudo apt-get update
sudo apt-get install -y software-properties-common curl ca-certificates lsb-release apt-transport-https

# Add PHP PPA (Required for 8.2 on older Ubuntu/Debian)
if [ -f /etc/lsb-release ]; then
    # Ubuntu
    sudo add-apt-repository -y ppa:ondrej/php
elif [ -f /etc/debian_version ]; then
    # Debian
    curl -sSLo /usr/share/keyrings/deb.sury.org-php.gpg https://packages.sury.org/php/apt.gpg
    echo "deb [signed-by=/usr/share/keyrings/deb.sury.org-php.gpg] https://packages.sury.org/php/ $(lsb_release -sc) main" | sudo tee /etc/apt/sources.list.d/php.list
fi

sudo apt-get update

# Install PHP 8.2 and extensions
sudo apt-get install -y php8.2 php8.2-cli php8.2-common php8.2-curl php8.2-xml php8.2-mbstring php8.2-sqlite3 php8.2-zip php8.2-fpm php8.2-bcmath php8.2-intl

# Ensure Composer is installed
if ! command -v composer &> /dev/null; then
    echo "📥 Installing Composer..."
    curl -sS https://getcomposer.org/installer | php
    sudo mv composer.phar /usr/local/bin/composer
fi

# Install Node.js and Nginx
sudo apt-get install -y nodejs npm nginx

# 2. Clone/Update Repo
cd /var/www
if [ -d "pingpong_crm" ]; then
    echo "♻️ Updating existing repo..."
    # Fix ownership before pull if needed
    sudo chown -R root:root /var/www/pingpong_crm
    cd pingpong_crm
    git config --global --add safe.directory /var/www/pingpong_crm
    git pull origin main
else
    echo "📥 Cloning repo..."
    git clone https://github.com/KomronRaximov/pingpong_crm.git
    cd pingpong_crm
    git config --global --add safe.directory /var/www/pingpong_crm
fi

# 3. Setup Backend
cd backend
composer install --no-dev --optimize-autoloader
if [ ! -f ".env" ]; then
    cp .env.example .env
    # Inject credentials and prod settings
    sed -i 's/APP_ENV=local/APP_ENV=production/' .env
    sed -i 's/APP_DEBUG=true/APP_DEBUG=false/' .env
    sed -i "s|APP_URL=.*|APP_URL=http://185.128.105.36:8003|" .env
    echo "ADMIN_USERNAME=admin" >> .env
    echo "ADMIN_PASSWORD=admin123" >> .env
    php artisan key:generate
fi
touch database/database.sqlite
php8.2 artisan optimize:clear
php8.2 artisan migrate --force


# 4. Setup Frontend
cd ../frontend
# Ensure we have latest Node/NPM if it was very old
if ! command -v n &> /dev/null; then
    sudo npm install -g n
    sudo n stable
    PATH="$PATH"
fi

npm install
echo "VITE_API_URL=http://185.128.105.36:8003/api" > .env
npm run build

# 5. Config Nginx for Port 8003
echo "⚙️ Configuring Nginx..."
cat <<'EOF' > /etc/nginx/sites-available/pingpong_crm
server {
    listen 8003;
    server_name _;

    root /var/www/pingpong_crm/frontend/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location ^~ /api {
        alias /var/www/pingpong_crm/backend/public;
        try_files $uri $uri/ @api;
        
        location ~ \.php$ {
            include fastcgi_params;
            fastcgi_pass unix:/var/run/php/php8.2-fpm.sock;
            fastcgi_param SCRIPT_FILENAME /var/www/pingpong_crm/backend/public/index.php;
            fastcgi_param SCRIPT_NAME /index.php;
        }
    }

    location @api {
        rewrite /api/(.*)$ /api/index.php last;
    }
}
EOF

ln -sf /etc/nginx/sites-available/pingpong_crm /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default 2>/dev/null || true
systemctl restart nginx

# 6. Permissions
sudo chown -R www-data:www-data /var/www/pingpong_crm
sudo chmod -R 775 /var/www/pingpong_crm/backend/storage
sudo chmod -R 775 /var/www/pingpong_crm/backend/database

echo "✅ Deployment Finished! Visit http://185.128.105.36:8003"
echo "Admin Login: admin"
echo "Admin Password: admin123"
