#!/usr/bin/env bash

# One-time (and safely repeatable) Nginx/TLS setup for Lychgate VTT.
set -Eeuo pipefail
IFS=$'\n\t'

readonly VPS="ubuntu@51.79.156.185"
readonly DEPLOY_USER="ubuntu"
readonly DOMAIN="lychgate.sammak.in"
readonly APP_PATH="/var/www/lychgate.sammak.in/html"
readonly RELEASES_PATH="${APP_PATH}/releases"
readonly CURRENT_LINK="${APP_PATH}/current"
readonly ACME_ROOT="/var/www/letsencrypt"
readonly NGINX_CONF="/etc/nginx/sites-available/${DOMAIN}"
readonly TLS_EMAIL="${LETSENCRYPT_EMAIL:-}"
readonly -a SSH_OPTIONS=(
    -o BatchMode=yes
    -o ConnectTimeout=15
    -o ServerAliveCountMax=3
    -o ServerAliveInterval=10
    -o StrictHostKeyChecking=yes
)

if [[ ! "${TLS_EMAIL}" =~ ^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$ ]]; then
    printf '%s\n' 'Error: set LETSENCRYPT_EMAIL to a valid certificate-renewal email address.' >&2
    printf '%s\n' "Example: LETSENCRYPT_EMAIL=admin@example.com bash init-server.sh" >&2
    exit 1
fi

local_temp_dir="$(mktemp -d)"
readonly local_temp_dir
readonly bootstrap_conf="${local_temp_dir}/bootstrap.conf"
readonly final_conf="${local_temp_dir}/final.conf"
readonly renewal_hook="${local_temp_dir}/reload-nginx"
readonly remote_suffix="$$"
readonly remote_bootstrap="/tmp/${DOMAIN}.bootstrap.${remote_suffix}.conf"
readonly remote_final="/tmp/${DOMAIN}.final.${remote_suffix}.conf"
readonly remote_hook="/tmp/${DOMAIN}.reload-nginx.${remote_suffix}"

cleanup_local() {
    rm -rf -- "${local_temp_dir}"
}
trap cleanup_local EXIT

cat > "${bootstrap_conf}" <<EOF
server {
    listen 80;
    listen [::]:80;
    server_name ${DOMAIN};
    server_tokens off;

    root ${CURRENT_LINK};
    index index.html;

    add_header Content-Security-Policy "default-src 'self'; base-uri 'self'; connect-src 'self' https: wss:; font-src 'self' data:; form-action 'self'; frame-ancestors 'self'; img-src 'self' data: blob: https:; manifest-src 'self'; media-src 'self' blob:; object-src 'none'; script-src 'self'; style-src 'self' 'unsafe-inline'; worker-src 'self' blob:" always;
    add_header Permissions-Policy "camera=(self), clipboard-write=(self), fullscreen=(self), geolocation=(), microphone=(), payment=(), usb=()" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "SAMEORIGIN" always;

    location ^~ /.well-known/acme-challenge/ {
        root ${ACME_ROOT};
        default_type text/plain;
        try_files \$uri =404;
    }

    location / {
        try_files \$uri \$uri/ /index.html;
    }

    location = /index.html {
        expires -1;
    }

    location ~ /\.(?!well-known(?:/|\$)) {
        deny all;
    }

    access_log /var/log/nginx/${DOMAIN}-access.log;
    error_log /var/log/nginx/${DOMAIN}-error.log;
}
EOF

cat > "${final_conf}" <<EOF
server {
    listen 80;
    listen [::]:80;
    server_name ${DOMAIN};
    server_tokens off;

    location ^~ /.well-known/acme-challenge/ {
        root ${ACME_ROOT};
        default_type text/plain;
        try_files \$uri =404;
    }

    location / {
        return 301 https://${DOMAIN}\$request_uri;
    }
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name ${DOMAIN};
    server_tokens off;

    ssl_certificate /etc/letsencrypt/live/${DOMAIN}/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/${DOMAIN}/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 1d;
    ssl_session_tickets off;

    root ${CURRENT_LINK};
    index index.html;

    add_header Content-Security-Policy "default-src 'self'; base-uri 'self'; connect-src 'self' https: wss:; font-src 'self' data:; form-action 'self'; frame-ancestors 'self'; img-src 'self' data: blob: https:; manifest-src 'self'; media-src 'self' blob:; object-src 'none'; script-src 'self'; style-src 'self' 'unsafe-inline'; worker-src 'self' blob:; upgrade-insecure-requests" always;
    add_header Cross-Origin-Opener-Policy "same-origin" always;
    add_header Permissions-Policy "camera=(self), clipboard-write=(self), fullscreen=(self), geolocation=(), microphone=(), payment=(), usb=()" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Strict-Transport-Security "max-age=31536000" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "SAMEORIGIN" always;

    location / {
        try_files \$uri \$uri/ /index.html;
    }

    location = /index.html {
        expires -1;
    }

    location = /release-id.txt {
        default_type text/plain;
        expires -1;
    }

    location ^~ /assets/ {
        try_files \$uri =404;
        expires 1y;
    }

    location ~* \.(?:css|gif|ico|jpe?g|js|png|svg|wasm|webp|woff2?)\$ {
        try_files \$uri =404;
        expires 30d;
    }

    location ~ /\.(?!well-known(?:/|\$)) {
        deny all;
    }

    access_log /var/log/nginx/${DOMAIN}-access.log;
    error_log /var/log/nginx/${DOMAIN}-error.log;
}
EOF

cat > "${renewal_hook}" <<'EOF'
#!/bin/sh
set -eu
nginx -t
systemctl reload nginx
EOF
chmod 0755 "${renewal_hook}"

printf 'Checking prerequisites on %s...\n' "${VPS}"
ssh "${SSH_OPTIONS[@]}" "${VPS}" 'command -v nginx >/dev/null && command -v certbot >/dev/null && command -v curl >/dev/null && command -v flock >/dev/null && command -v tar >/dev/null && sudo -n true' || {
    printf '%s\n' 'Error: nginx, certbot, curl, flock, tar, and non-interactive sudo are required on the VPS.' >&2
    exit 1
}

printf 'Preparing release and ACME directories...\n'
ssh "${SSH_OPTIONS[@]}" "${VPS}" bash -s -- \
    "${APP_PATH}" \
    "${RELEASES_PATH}" \
    "${CURRENT_LINK}" \
    "${ACME_ROOT}" \
    "${DEPLOY_USER}" <<'REMOTE_SETUP'
set -Eeuo pipefail
IFS=$'\n\t'

readonly app_path="$1"
readonly releases_path="$2"
readonly current_link="$3"
readonly acme_root="$4"
readonly deploy_user="$5"

sudo -n install -d -m 0755 -o "${deploy_user}" -g "${deploy_user}" "${app_path}" "${releases_path}"
sudo -n install -d -m 0755 "${acme_root}"

if [[ -e "${current_link}" && ! -L "${current_link}" ]]; then
    printf '%s\n' "Error: ${current_link} exists and is not a symbolic link." >&2
    exit 1
fi

if [[ -L "${current_link}" ]]; then
    resolved_current="$(readlink -f -- "${current_link}" || true)"
    case "${resolved_current}" in
        "${releases_path}"/*) ;;
        *)
            printf '%s\n' "Error: ${current_link} does not target a release below ${releases_path}." >&2
            exit 1
            ;;
    esac
    if [[ ! -f "${current_link}/index.html" ]]; then
        printf '%s\n' "Error: the active release does not contain index.html." >&2
        exit 1
    fi
else
    legacy_release="${releases_path}/bootstrap-$(date -u +%Y%m%dT%H%M%SZ)"
    mkdir -- "${legacy_release}"

    if [[ -f "${app_path}/index.html" ]]; then
        while IFS= read -r -d '' entry; do
            cp -a -- "${entry}" "${legacy_release}/"
        done < <(find "${app_path}" -mindepth 1 -maxdepth 1 \
            ! -name releases \
            ! -name current \
            ! -name .deploy.lock \
            -print0)
    else
        printf '%s\n' '<!doctype html><title>Lychgate deployment pending</title><p>Lychgate deployment pending.</p>' > "${legacy_release}/index.html"
    fi

    ln -s -- "${legacy_release}" "${current_link}"
fi
REMOTE_SETUP

install_nginx_config() {
    local local_conf="$1"
    local uploaded_conf="$2"
    local install_renewal_hook="$3"

    scp "${SSH_OPTIONS[@]}" -- "${local_conf}" "${VPS}:${uploaded_conf}"
    if [[ "${install_renewal_hook}" == true ]]; then
        scp "${SSH_OPTIONS[@]}" -- "${renewal_hook}" "${VPS}:${remote_hook}"
    fi

    ssh "${SSH_OPTIONS[@]}" "${VPS}" bash -s -- \
        "${uploaded_conf}" \
        "${NGINX_CONF}" \
        "${DOMAIN}" \
        "${install_renewal_hook}" \
        "${remote_hook}" <<'REMOTE_NGINX'
set -Eeuo pipefail
readonly uploaded_conf="$1"
readonly nginx_conf="$2"
readonly domain="$3"
readonly install_renewal_hook="$4"
readonly uploaded_hook="$5"
readonly backup_conf="${nginx_conf}.previous.$$"

cleanup() {
    rm -f -- "${uploaded_conf}" "${uploaded_hook}"
}
trap cleanup EXIT

restore_previous_config() {
    if [[ -f "${backup_conf}" ]]; then
        sudo -n mv -- "${backup_conf}" "${nginx_conf}"
    else
        sudo -n rm -f -- "${nginx_conf}"
        sudo -n rm -f -- "/etc/nginx/sites-enabled/${domain}"
    fi
    sudo -n nginx -t >/dev/null 2>&1 && sudo -n systemctl reload nginx || true
}

if [[ -f "${nginx_conf}" ]]; then
    sudo -n cp -a -- "${nginx_conf}" "${backup_conf}"
fi

sudo -n install -m 0644 "${uploaded_conf}" "${nginx_conf}"
sudo -n ln -sfn -- "${nginx_conf}" "/etc/nginx/sites-enabled/${domain}"

if ! sudo -n nginx -t; then
    restore_previous_config
    printf '%s\n' 'Nginx validation failed; the previous configuration was restored.' >&2
    exit 1
fi
if ! sudo -n systemctl reload nginx; then
    restore_previous_config
    printf '%s\n' 'Nginx reload failed; the previous configuration was restored.' >&2
    exit 1
fi

sudo -n rm -f -- "${backup_conf}"
if [[ "${install_renewal_hook}" == true ]]; then
    sudo -n install -d -m 0755 /etc/letsencrypt/renewal-hooks/deploy
    sudo -n install -m 0755 "${uploaded_hook}" /etc/letsencrypt/renewal-hooks/deploy/reload-nginx
fi
REMOTE_NGINX
}

certificate_exists=false
if ssh "${SSH_OPTIONS[@]}" "${VPS}" sudo -n test \
    -s "/etc/letsencrypt/live/${DOMAIN}/fullchain.pem" \
    -a -s "/etc/letsencrypt/live/${DOMAIN}/privkey.pem"; then
    certificate_exists=true
else
    certificate_status="$?"
    if [[ "${certificate_status}" -ne 1 ]]; then
        printf '%s\n' 'Unable to determine the TLS certificate state on the VPS.' >&2
        exit "${certificate_status}"
    fi
fi

if [[ "${certificate_exists}" == true ]]; then
    printf 'Installing the HTTPS configuration with the existing certificate...\n'
    install_nginx_config "${final_conf}" "${remote_final}" true
else
    printf 'Installing the temporary HTTP configuration...\n'
    install_nginx_config "${bootstrap_conf}" "${remote_bootstrap}" false
fi

printf 'Requesting or renewing the TLS certificate...\n'
ssh "${SSH_OPTIONS[@]}" "${VPS}" sudo -n certbot certonly \
    --webroot \
    --webroot-path "${ACME_ROOT}" \
    --domain "${DOMAIN}" \
    --non-interactive \
    --agree-tos \
    --email "${TLS_EMAIL}" \
    --keep-until-expiring

if [[ "${certificate_exists}" == false ]]; then
    printf 'Installing the HTTPS configuration and renewal hook...\n'
    install_nginx_config "${final_conf}" "${remote_final}" true
fi

printf 'Checking the HTTPS endpoint...\n'
ssh "${SSH_OPTIONS[@]}" "${VPS}" curl \
    --fail \
    --silent \
    --show-error \
    --location \
    --max-time 15 \
    --retry 3 \
    --retry-delay 2 \
    "https://${DOMAIN}/" >/dev/null

printf 'Server setup complete: https://%s/\n' "${DOMAIN}"
printf '%s\n' 'Next: configure the repository deployment secrets and run the Deploy VTT workflow.'
