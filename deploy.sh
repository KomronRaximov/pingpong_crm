#!/bin/bash

# PingPongClub CRM - Server Deployment Script
# Targets Ubuntu/Debian servers

echo "🚀 Starting Deployment on Port 8003..."

# 1. Update & Install Dependencies
sudo apt-get update
sudo apt-get install -y php8.2 php8.2-cli php8.2-common php8.2-curl php8.2-xml php8.2-mbstring php8.2-sqlite3 php8.2-zip composer curl git nodejs npm nginx

# 2. Clone/Update Repo
cd /var/www
if [ -d "pingpong_crm" ]; then
    echo "Updating existing repo..."
    cd pingpong_crm
    git pull origin main
else
    echo "Cloning repo..."
    git clone https://github.com/KomronRaximov/pingpong_crm.git
    cd pingpong_crm
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
php artisan migrate --force

# 4. Setup Frontend
cd ../frontend
npm install
# Update Vite API URL to point to this server's IP
echo "VITE_API_URL=http://185.128.105.36:8003/api" > .env
npm run build

# 5. Config Nginx for Port 8003
cat <<EOF > /etc/nginx/sites-available/pingpong_crm
server {
    listen 8003;
    server_name _;

    root /var/www/pingpong_crm/frontend/dist;
    index index.html;

    location / {
        try_files \$uri \$uri/ /index.html;
    }

    location /api {
        alias /var/www/pingpong_crm/backend/public;
        try_files \$uri \$uri/ @api;
        
        location ~ \.php$ {
            include snippets/fastcgi-php.conf;
            fastcgi_pass unix:/var/run/php/php8.2-fpm.sock;
            fastcgi_param SCRIPT_FILENAME /var/www/pingpong_crm/backend/public/index.php;
        }
    }

    location @api {
        rewrite /api/(.*)$ /api/index.php?\$1 last;
    }
}
EOF

ln -sf /etc/nginx/sites-available/pingpong_crm /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
systemctl restart nginx

# 6. Permissions
chown -R www-data:www-data /var/www/pingpong_crm
chmod -R 775 /var/www/pingpong_crm/backend/storage
chmod -R 775 /var/www/pingpong_crm/backend/database

echo "✅ Deployment Finished! Visit http://185.128.105.36:8003"
echo "Admin Login: admin"
echo "Admin Password: admin123"
