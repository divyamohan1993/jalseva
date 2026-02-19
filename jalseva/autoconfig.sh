#!/usr/bin/env bash
# =============================================================================
#  JalSeva - Server Setup & Deployment Script (autoconfig.sh)
# =============================================================================
#  Run this ON the VM (via SSH or via autoconfig.bat) to configure a blank
#  Ubuntu/Debian VM from scratch and deploy the JalSeva application.
#
#  Usage:
#    sudo ./autoconfig.sh --domain jalseva.dmj.one
#    sudo ./autoconfig.sh --domain jalseva.dmj.one --tarball /tmp/jalseva-deploy.tar.gz
#
#  What this script does:
#    1. Installs Node.js 18 LTS, nginx
#    2. Extracts the JalSeva application to /opt/jalseva
#    3. Installs npm dependencies and builds the Next.js app
#    4. Creates a systemd service for auto-start/restart
#    5. Configures nginx as a reverse proxy for your domain
#    6. Starts everything up
#
#  API Keys:
#    After deployment, edit /opt/jalseva/.env to add your API keys.
#    See the "API KEYS" section at the bottom of this script's output.
# =============================================================================

set -euo pipefail

# ── Colors ───────────────────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m' # No Color

# ── Defaults ─────────────────────────────────────────────────────────────────
DOMAIN=""
TARBALL=""
APP_DIR="/opt/jalseva"
APP_PORT=3000
NODE_VERSION=18
RUN_USER="${SUDO_USER:-$(whoami)}"

# ── Parse arguments ──────────────────────────────────────────────────────────
while [[ $# -gt 0 ]]; do
    case $1 in
        --domain)  DOMAIN="$2";  shift 2 ;;
        --tarball) TARBALL="$2"; shift 2 ;;
        --port)    APP_PORT="$2"; shift 2 ;;
        --user)    RUN_USER="$2"; shift 2 ;;
        --help|-h)
            echo "Usage: sudo $0 --domain <your-domain> [--tarball <path>] [--port <port>] [--user <username>]"
            exit 0
            ;;
        *) echo "Unknown option: $1"; exit 1 ;;
    esac
done

if [[ -z "$DOMAIN" ]]; then
    echo -e "${RED}ERROR: --domain is required.${NC}"
    echo "Usage: sudo $0 --domain jalseva.example.com"
    exit 1
fi

# ── Must run as root ─────────────────────────────────────────────────────────
if [[ $EUID -ne 0 ]]; then
    echo -e "${RED}ERROR: This script must be run with sudo or as root.${NC}"
    exit 1
fi

echo ""
echo -e "${BOLD}${BLUE}═══════════════════════════════════════════════════${NC}"
echo -e "${BOLD}${BLUE}  JalSeva Server Setup & Deployment${NC}"
echo -e "${BOLD}${BLUE}═══════════════════════════════════════════════════${NC}"
echo -e "  Domain  : ${CYAN}${DOMAIN}${NC}"
echo -e "  App Dir : ${CYAN}${APP_DIR}${NC}"
echo -e "  Port    : ${CYAN}${APP_PORT}${NC}"
echo -e "  User    : ${CYAN}${RUN_USER}${NC}"
[[ -n "$TARBALL" ]] && echo -e "  Tarball : ${CYAN}${TARBALL}${NC}"
echo -e "${BOLD}${BLUE}═══════════════════════════════════════════════════${NC}"
echo ""

# ── Helper ───────────────────────────────────────────────────────────────────
step_num=0
step() {
    step_num=$((step_num + 1))
    echo ""
    echo -e "${BOLD}${GREEN}[${step_num}] $1${NC}"
    echo "────────────────────────────────────────────"
}

# =============================================================================
# STEP 1: System update & essential packages
# =============================================================================
step "Updating system packages..."
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get install -y -qq curl gnupg2 ca-certificates lsb-release software-properties-common > /dev/null

# =============================================================================
# STEP 2: Install Node.js
# =============================================================================
step "Installing Node.js ${NODE_VERSION}..."
if command -v node &>/dev/null; then
    CURRENT_NODE=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
    echo "  Node.js v$(node -v | cut -dv -f2) already installed."
    if [[ "$CURRENT_NODE" -lt "$NODE_VERSION" ]]; then
        echo "  Upgrading to Node.js ${NODE_VERSION}..."
    else
        echo "  Version is sufficient, skipping install."
    fi
fi

if ! command -v node &>/dev/null || [[ "$(node -v | cut -dv -f2 | cut -d. -f1)" -lt "$NODE_VERSION" ]]; then
    curl -fsSL "https://deb.nodesource.com/setup_${NODE_VERSION}.x" | bash - > /dev/null 2>&1
    apt-get install -y -qq nodejs > /dev/null
fi
echo -e "  ${GREEN}Node.js $(node -v) | npm $(npm -v)${NC}"

# =============================================================================
# STEP 3: Install nginx
# =============================================================================
step "Installing nginx..."
if command -v nginx &>/dev/null; then
    echo "  nginx already installed."
else
    apt-get install -y -qq nginx > /dev/null
fi
echo -e "  ${GREEN}nginx $(nginx -v 2>&1 | cut -d/ -f2)${NC}"

# =============================================================================
# STEP 4: Stop existing service (if running)
# =============================================================================
step "Stopping existing JalSeva service (if any)..."
systemctl stop jalseva 2>/dev/null || true
echo "  Done."

# =============================================================================
# STEP 5: Extract application
# =============================================================================
step "Deploying application to ${APP_DIR}..."

if [[ -n "$TARBALL" && -f "$TARBALL" ]]; then
    # Remove old deployment
    rm -rf "${APP_DIR}"
    mkdir -p "${APP_DIR}"
    cd "${APP_DIR}"
    tar xzf "$TARBALL" --strip-components=1
    echo "  Extracted from tarball."
elif [[ -d "${APP_DIR}/package.json" ]] || [[ -f "${APP_DIR}/package.json" ]]; then
    echo "  Using existing code at ${APP_DIR}."
else
    echo -e "${RED}ERROR: No tarball provided and no existing code at ${APP_DIR}.${NC}"
    echo "  Run with: --tarball /path/to/jalseva-deploy.tar.gz"
    exit 1
fi

# Fix ownership
chown -R "${RUN_USER}:${RUN_USER}" "${APP_DIR}"
echo -e "  ${GREEN}Application deployed.${NC}"

# =============================================================================
# STEP 6: Create .env if missing
# =============================================================================
step "Checking environment file..."
if [[ ! -f "${APP_DIR}/.env" ]]; then
    if [[ -f "${APP_DIR}/.env.example" ]]; then
        cp "${APP_DIR}/.env.example" "${APP_DIR}/.env"
        chown "${RUN_USER}:${RUN_USER}" "${APP_DIR}/.env"
        echo -e "  ${YELLOW}Created .env from .env.example — you MUST edit it with your API keys!${NC}"
    else
        echo -e "  ${YELLOW}WARNING: No .env or .env.example found. Create ${APP_DIR}/.env manually.${NC}"
    fi
else
    echo -e "  ${GREEN}.env already exists.${NC}"
fi

# =============================================================================
# STEP 7: Install dependencies & build
# =============================================================================
step "Installing npm dependencies..."
cd "${APP_DIR}"
sudo -u "${RUN_USER}" npm ci --omit=dev 2>&1 | tail -3
echo -e "  ${GREEN}Dependencies installed.${NC}"

step "Building Next.js application..."
sudo -u "${RUN_USER}" npm run build 2>&1 | tail -5
echo -e "  ${GREEN}Build complete.${NC}"

# =============================================================================
# STEP 8: Copy static assets to standalone
# =============================================================================
step "Preparing standalone deployment..."
cp -r "${APP_DIR}/.next/static" "${APP_DIR}/.next/standalone/.next/"
cp -r "${APP_DIR}/public" "${APP_DIR}/.next/standalone/"
echo -e "  ${GREEN}Static assets copied.${NC}"

# =============================================================================
# STEP 9: Create systemd service
# =============================================================================
step "Configuring systemd service..."
cat > /etc/systemd/system/jalseva.service <<SVCEOF
[Unit]
Description=JalSeva Next.js Application
After=network.target

[Service]
Type=simple
User=${RUN_USER}
WorkingDirectory=${APP_DIR}/.next/standalone
Environment=NODE_ENV=production
Environment=PORT=${APP_PORT}
Environment=HOSTNAME=0.0.0.0
ExecStart=/usr/bin/node server.js
Restart=on-failure
RestartSec=5
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
SVCEOF

systemctl daemon-reload
systemctl enable jalseva > /dev/null 2>&1
echo -e "  ${GREEN}Service created and enabled.${NC}"

# =============================================================================
# STEP 10: Configure nginx reverse proxy
# =============================================================================
step "Configuring nginx for ${DOMAIN}..."

cat > /etc/nginx/sites-available/jalseva <<NGXEOF
server {
    listen 80;
    server_name ${DOMAIN};

    # Proxy all requests to the Next.js app
    location / {
        proxy_pass http://127.0.0.1:${APP_PORT};
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        proxy_read_timeout 86400;
    }

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;
}
NGXEOF

# Enable site
ln -sf /etc/nginx/sites-available/jalseva /etc/nginx/sites-enabled/jalseva

# Remove default site if it exists (conflicts on port 80)
rm -f /etc/nginx/sites-enabled/default

# Test nginx config
nginx -t 2>&1
echo -e "  ${GREEN}nginx configured.${NC}"

# =============================================================================
# STEP 11: Start everything
# =============================================================================
step "Starting services..."
systemctl restart nginx
systemctl start jalseva

# Wait for the app to be ready
echo "  Waiting for app to start..."
for i in $(seq 1 15); do
    if curl -s -o /dev/null -w '' http://localhost:${APP_PORT}/ 2>/dev/null; then
        break
    fi
    sleep 1
done

# Verify
HTTP_CODE=$(curl -s -o /dev/null -w '%{http_code}' http://localhost:${APP_PORT}/ 2>/dev/null || echo "000")
if [[ "$HTTP_CODE" == "200" ]]; then
    echo -e "  ${GREEN}JalSeva is running! (HTTP ${HTTP_CODE})${NC}"
else
    echo -e "  ${YELLOW}App returned HTTP ${HTTP_CODE}. Check logs: journalctl -u jalseva -f${NC}"
fi

# =============================================================================
# DONE
# =============================================================================
echo ""
echo -e "${BOLD}${GREEN}═══════════════════════════════════════════════════${NC}"
echo -e "${BOLD}${GREEN}  Deployment Complete!${NC}"
echo -e "${BOLD}${GREEN}═══════════════════════════════════════════════════${NC}"
echo ""
echo -e "  ${BOLD}Live URL:${NC}       http://${DOMAIN}"
echo -e "  ${BOLD}Pitch Deck:${NC}     http://${DOMAIN}/pitch.html"
echo -e "  ${BOLD}App Directory:${NC}  ${APP_DIR}"
echo -e "  ${BOLD}Service:${NC}        systemctl {start|stop|restart|status} jalseva"
echo -e "  ${BOLD}Logs:${NC}           journalctl -u jalseva -f"
echo -e "  ${BOLD}Nginx Config:${NC}   /etc/nginx/sites-available/jalseva"
echo ""
echo -e "${BOLD}${YELLOW}═══════════════════════════════════════════════════${NC}"
echo -e "${BOLD}${YELLOW}  API KEYS — EDIT BEFORE USE${NC}"
echo -e "${BOLD}${YELLOW}═══════════════════════════════════════════════════${NC}"
echo ""
echo -e "  Edit the file:  ${CYAN}nano ${APP_DIR}/.env${NC}"
echo ""
echo -e "  ${BOLD}Required keys:${NC}"
echo -e "    NEXT_PUBLIC_FIREBASE_API_KEY          ${YELLOW}← Firebase console > Project Settings${NC}"
echo -e "    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN       ${YELLOW}← e.g. yourproject.firebaseapp.com${NC}"
echo -e "    NEXT_PUBLIC_FIREBASE_PROJECT_ID        ${YELLOW}← Firebase console > Project Settings${NC}"
echo -e "    NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET    ${YELLOW}← Firebase console > Project Settings${NC}"
echo -e "    NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ${YELLOW}← Firebase console > Project Settings${NC}"
echo -e "    NEXT_PUBLIC_FIREBASE_APP_ID            ${YELLOW}← Firebase console > Project Settings${NC}"
echo ""
echo -e "  ${BOLD}Optional keys (enable extra features):${NC}"
echo -e "    NEXT_PUBLIC_GOOGLE_MAPS_API_KEY        ${YELLOW}← Google Cloud Console > APIs > Maps JS${NC}"
echo -e "    GOOGLE_GEMINI_API_KEY                  ${YELLOW}← Google AI Studio (aistudio.google.com)${NC}"
echo -e "    FIREBASE_ADMIN_PRIVATE_KEY             ${YELLOW}← Firebase console > Service Accounts${NC}"
echo -e "    FIREBASE_ADMIN_CLIENT_EMAIL            ${YELLOW}← Firebase console > Service Accounts${NC}"
echo -e "    UPSTASH_REDIS_REST_URL                 ${YELLOW}← Upstash console (upstash.com)${NC}"
echo -e "    UPSTASH_REDIS_REST_TOKEN               ${YELLOW}← Upstash console (upstash.com)${NC}"
echo -e "    WHATSAPP_BUSINESS_TOKEN                ${YELLOW}← Meta Business Suite${NC}"
echo ""
echo -e "  ${BOLD}Simulated (no real keys needed):${NC}"
echo -e "    RAZORPAY_*                             ${YELLOW}← Already pre-filled with sim values${NC}"
echo -e "    ONDC_*                                 ${YELLOW}← Already pre-filled with sim values${NC}"
echo ""
echo -e "  After editing .env, restart the app:"
echo -e "    ${CYAN}sudo systemctl restart jalseva${NC}"
echo ""
echo -e "${BOLD}${BLUE}═══════════════════════════════════════════════════${NC}"
echo -e "${BOLD}${BLUE}  HTTPS / SSL Setup${NC}"
echo -e "${BOLD}${BLUE}═══════════════════════════════════════════════════${NC}"
echo ""
echo -e "  ${BOLD}Option A: Cloudflare (recommended)${NC}"
echo -e "    1. Add an A record: ${DOMAIN} -> your VM's public IP"
echo -e "    2. Set Proxy status to 'Proxied' (orange cloud)"
echo -e "    3. SSL mode: Flexible (works with HTTP-only origin)"
echo -e "    -> HTTPS works immediately, no server changes needed"
echo ""
echo -e "  ${BOLD}Option B: Let's Encrypt (certbot)${NC}"
echo -e "    sudo apt install certbot python3-certbot-nginx"
echo -e "    sudo certbot --nginx -d ${DOMAIN}"
echo ""
