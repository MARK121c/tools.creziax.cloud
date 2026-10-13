#!/usr/bin/env bash
# ==============================================================================
# Creziax Server Meeting Recorder - Automated Production Deployment Script
# Target OS: Ubuntu 20.04 / 22.04 / 24.04 LTS
# ==============================================================================

set -e

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}======================================================================${NC}"
echo -e "${GREEN}  Creziax Headless Server Meeting Recorder - Deployment Automated Script${NC}"
echo -e "${BLUE}======================================================================${NC}"

# Check for root / sudo
if [ "$EUID" -ne 0 ]; then
  echo -e "${RED}[ERROR] Please run this deployment script as root or with sudo.${NC}"
  exit 1
fi

echo -e "\n${YELLOW}[1/5] Updating system packages and repositories...${NC}"
apt-get update -y
apt-get install -y curl wget git ca-certificates gnupg lsb-release

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo -e "${YELLOW}[2/5] Docker not found. Installing Docker Engine & Compose plugin...${NC}"
    mkdir -p /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg --yes
    echo \
      "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
      $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null

    apt-get update -y
    apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
    systemctl enable docker
    systemctl start docker
    echo -e "${GREEN}Docker successfully installed.${NC}"
else
    echo -e "${GREEN}[2/5] Docker is already installed.${NC}"
fi

echo -e "\n${YELLOW}[3/5] Setting up environment configuration...${NC}"
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
cd "$SCRIPT_DIR"

if [ ! -f .env ]; then
    echo -e "${YELLOW}Creating .env file from .env.example...${NC}"
    cp .env.example .env
    # Generate random API key if desired
    RANDOM_KEY=$(openssl rand -hex 16 2>/dev/null || date +%s%N)
    sed -i "s/your_secure_api_key_here/$RANDOM_KEY/g" .env
    echo -e "${GREEN}Generated default API Key in .env: ${RANDOM_KEY}${NC}"
else
    echo -e "${GREEN}.env already exists. Preserving current configuration.${NC}"
fi

# Ensure storage directories exist with appropriate permissions
mkdir -p recordings logs
chmod -R 777 recordings logs

echo -e "\n${YELLOW}[4/5] Building and launching Docker container...${NC}"
if command -v docker-compose &> /dev/null; then
    docker-compose down || true
    docker-compose up --build -d
else
    docker compose down || true
    docker compose up --build -d
fi

echo -e "\n${YELLOW}[5/5] Verifying service health...${NC}"
sleep 5

HEALTH_URL="http://127.0.0.1:8080/health"
RETRIES=10
SUCCESS=false

for i in $(seq 1 $RETRIES); do
    if curl -s -f "$HEALTH_URL" > /dev/null; then
        SUCCESS=true
        break
    fi
    echo -e "Waiting for server to become healthy (attempt $i/$RETRIES)..."
    sleep 3
done

if [ "$SUCCESS" = true ]; then
    echo -e "\n${GREEN}======================================================================${NC}"
    echo -e "${GREEN}  DEPLOYMENT SUCCESSFUL! Service is running 24/7 on port 8080${NC}"
    echo -e "${GREEN}======================================================================${NC}"
    echo -e "API Base URL:  http://$(hostname -I | awk '{print $1}'):8080"
    echo -e "Health Check:  http://$(hostname -I | awk '{print $1}'):8080/health"
    echo -e "API Docs:      http://$(hostname -I | awk '{print $1}'):8080/docs"
    echo -e "Log Files:     $SCRIPT_DIR/logs/"
    echo -e "Recordings:    $SCRIPT_DIR/recordings/"
    echo -e "${BLUE}======================================================================${NC}"
else
    echo -e "\n${RED}[WARNING] Service started but healthcheck timed out. Check container logs:${NC}"
    docker logs creziax_meeting_recorder --tail 50
fi
