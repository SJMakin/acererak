# Acererak Deployment Guide

This guide provides instructions for deploying the Acererak application on a VPS with nginx.

## Prerequisites

- A VPS running Linux (Ubuntu/Debian recommended)
- Node.js (v16 or later)
- npm (v7 or later)
- nginx
- Domain name (optional but recommended)

## Project Overview

Acererak is a React-based web application for AI-powered D&D storytelling. The application requires users to provide their own OpenRouter API key, which is stored in the browser's localStorage.

## Deployment Steps

### 1. Clone and Build the Application

```bash
# Log into your VPS
ssh user@your-vps-ip

# Create directory for the application
mkdir -p /var/www/acererak

# Navigate to the directory
cd /var/www/acererak

# Clone the repository (replace with your actual repository URL)
git clone https://github.com/yourusername/acererak.git .

# Install dependencies
npm install

# Build the application
npm run build
```

### 2. Configure nginx

Create an nginx server configuration:

```bash
sudo nano /etc/nginx/sites-available/acererak
```

Add the following configuration:

```nginx
server {
    listen 80;
    server_name your-domain.com; # Replace with your domain or server IP

    root /var/www/acererak/dist;
    index index.html;

    # Security headers
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|svg|ico)$ {
        expires 30d;
        add_header Cache-Control "public, no-transform";
    }

    # Disable caching for index.html
    location = /index.html {
        add_header Cache-Control "no-cache";
    }
}
```

Enable the site:

```bash
sudo ln -s /etc/nginx/sites-available/acererak /etc/nginx/sites-enabled/
sudo nginx -t  # Test the configuration
sudo systemctl reload nginx  # Apply the configuration
```

### 3. Set Up SSL (Optional but Recommended)

Using Certbot for Let's Encrypt SSL certificate:

```bash
sudo apt-get update
sudo apt-get install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

### 4. User Instructions

Users will need to:

1. Create an OpenRouter account at https://openrouter.ai/
2. Generate an API key from https://openrouter.ai/keys
3. Enter this API key in the application settings

Include the following instructions on your site:

#### How to Get Started

1. Visit [OpenRouter](https://openrouter.ai/) and create an account
2. Generate an API key from the [Keys page](https://openrouter.ai/keys)
3. Enter the API key in the application settings at the top of the page
4. Your API key will be stored securely in your browser's local storage

## Maintenance

### Updating the Application

To update the application to a new version:

```bash
cd /var/www/acererak
git pull
npm install
npm run build
```

### Logs

Check nginx logs for issues:

```bash
sudo tail -f /var/log/nginx/error.log
```

## Security Considerations

- The application uses localStorage to store API keys, which is suitable for personal use but not for highly sensitive applications
- No server-side processing of API keys occurs; all API calls are made directly from the user's browser to OpenRouter
- Consider adding rate limiting to your nginx configuration to prevent abuse:

```nginx
# Add to the server block in your nginx configuration
limit_req_zone $binary_remote_addr zone=one:10m rate=1r/s;
location / {
    limit_req zone=one burst=10 nodelay;
    try_files $uri $uri/ /index.html;
}
```

## Troubleshooting

- **404 errors:** Make sure nginx is properly configured to serve the React application's routes
- **API key issues:** Ensure users are entering valid OpenRouter API keys
- **Performance issues:** Consider optimizing your nginx configuration for static content delivery

## Support

For issues with the application, refer to the project repository or contact the developer.