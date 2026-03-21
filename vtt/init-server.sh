#!/bin/bash

# One-time server setup for Lychgate VTT
set -e

# Configuration
VPS="ubuntu@51.79.156.185"
APP_PATH="/var/www/lychgate.sammak.in/html"
DOMAIN="lychgate.sammak.in"
NGINX_CONF="/etc/nginx/sites-available/${DOMAIN}"

echo "Setting up ${DOMAIN} on ${VPS}..."

# Create directories on VPS
echo "Creating directories..."
ssh $VPS "sudo mkdir -p ${APP_PATH}"
ssh $VPS "sudo chown -R ubuntu:ubuntu ${APP_PATH}"

# Create nginx configuration for subdomain
echo "Creating nginx configuration..."
cat > ${DOMAIN}.conf << EOF
server {
    listen 80;
    listen [::]:80;

    server_name ${DOMAIN};

    root ${APP_PATH};
    index index.html;

    # Security headers
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    location / {
        try_files \$uri \$uri/ /index.html;
    }

    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|svg|ico|wasm)$ {
        expires 30d;
        add_header Cache-Control "public, no-transform";
    }

    # Disable caching for index.html
    location = /index.html {
        add_header Cache-Control "no-cache";
    }

    # Logging
    access_log /var/log/nginx/${DOMAIN}-access.log;
    error_log /var/log/nginx/${DOMAIN}-error.log;
}
EOF

# Upload and enable nginx config
echo "Uploading and enabling nginx configuration..."
scp ${DOMAIN}.conf $VPS:/tmp/
ssh $VPS "sudo mv /tmp/${DOMAIN}.conf ${NGINX_CONF}"
ssh $VPS "sudo ln -sf ${NGINX_CONF} /etc/nginx/sites-enabled/"

# Test and reload nginx
echo "Testing and reloading nginx..."
ssh $VPS "sudo nginx -t && sudo systemctl reload nginx"

# Clean up local temporary file
rm ${DOMAIN}.conf

echo ""
echo "Server setup complete!"
echo "Site: http://${DOMAIN}/"
echo ""
echo "Next steps:"
echo "1. Run 'npm run build && bash deploy.sh' to deploy"
echo "2. Set up SSL: ssh ${VPS} 'sudo certbot --nginx -d ${DOMAIN}'"
