#!/bin/bash

# ==========================================
# MACE LEARNING SYSTEM - UBUNTU INSTALLATION WIZARD
# ==========================================
# Script ini akan memasang dan mengkonfigurasi:
# 1. Node.js & NPM
# 2. MongoDB Server (Local Database)
# 3. PM2 (Process Manager)
# 4. Nginx (Web Server & Reverse Proxy)
# 5. Modul MACE (React Build & Dependencies)
# ==========================================

# Warna untuk output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}=================================================${NC}"
echo -e "${BLUE}  WIZARD PEMASANGAN VPS MACE (UBUNTU 22.04+)   ${NC}"
echo -e "${BLUE}=================================================${NC}"

# Pastikan script dijalankan sebagai root
if [ "$EUID" -ne 0 ]; then 
  echo -e "${RED}Sila jalankan script ini sebagai root (Gunakan: sudo bash install.sh)${NC}"
  exit
fi

echo -e "\n${YELLOW}Langkah 1: Mengumpul Maklumat Sistem...${NC}"
read -p "Masukkan nama domain (contoh: mace.domain.com) atau IP (kosongkan jika tiada): " DOMAIN_NAME
DOMAIN_NAME=${DOMAIN_NAME:-localhost}
read -p "Masukkan Port untuk Node.js (Lalai/Default: 3000): " APP_PORT
APP_PORT=${APP_PORT:-3000}
read -p "Masukkan Kata Laluan untuk Akaun Master Admin (Lalai: admin123): " ADMIN_PASS
ADMIN_PASS=${ADMIN_PASS:-admin123}

# Generate random secrets
JWT_SECRET=$(openssl rand -hex 32)
SESSION_SECRET=$(openssl rand -hex 48)

# Gunakan localhost untuk MongoDB
MONGO_URI="mongodb://127.0.0.1:27017/mace_db"

echo -e "\n${YELLOW}Langkah 2: Memasang Pakej Asas & Node.js...${NC}"
apt update
apt install -y curl git build-essential nginx gnupg

# Install Node.js (LTS version 20)
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

echo -e "\n${YELLOW}Langkah 3: Memasang MongoDB (Local Database)...${NC}"
# Setup MongoDB 7.0 (Sesuai untuk Ubuntu 22.04)
curl -fsSL https://www.mongodb.org/static/pgp/server-7.0.asc | \
   sudo gpg -o /usr/share/keyrings/mongodb-server-7.0.gpg \
   --dearmor --yes
echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list
apt update
apt install -y mongodb-org

# Hidupkan MongoDB secara automatik
systemctl enable mongod
systemctl start mongod

echo -e "\n${YELLOW}Langkah 4: Memasang PM2...${NC}"
npm install -g pm2

echo -e "\n${YELLOW}Langkah 5: Mengkonfigurasi Fail .env...${NC}"
cat > .env << EOL
PORT=$APP_PORT
MONGO_URI=$MONGO_URI
JWT_SECRET=$JWT_SECRET
SESSION_SECRET=$SESSION_SECRET
ADMIN_USER=admin
ADMIN_PASS=$ADMIN_PASS
NODE_ENV=production
EOL
echo -e "${GREEN}Fail .env berjaya dicipta dengan Sambungan Database Local (127.0.0.1).${NC}"

echo -e "\n${YELLOW}Langkah 6: Memasang NPM Dependencies & Membina React App...${NC}"
npm install

if [ -d "client" ]; then
    echo -e "${BLUE}Membina bahagian antaramuka (Frontend/React)...${NC}"
    cd client
    npm install
    npm run build
    cd ..
else
    echo -e "${RED}Amaran: Folder 'client' tidak dijumpai. Binaan React dilangkau.${NC}"
fi

echo -e "\n${YELLOW}Langkah 7: Menghidupkan Sistem MACE melalui PM2...${NC}"
pm2 start app.js --name "mace-system"
pm2 save
pm2 startup | grep "sudo" | bash

echo -e "\n${YELLOW}Langkah 8: Mengkonfigurasi Nginx (Reverse Proxy)...${NC}"
NGINX_CONF="/etc/nginx/sites-available/mace"

cat > $NGINX_CONF << EOL
server {
    listen 80;
    server_name $DOMAIN_NAME;

    location / {
        proxy_pass http://localhost:$APP_PORT;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
    }
}
EOL

ln -sf /etc/nginx/sites-available/mace /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl restart nginx

echo -e "\n${BLUE}=================================================${NC}"
echo -e "${GREEN}✅ PEMASANGAN BERJAYA!${NC}"
echo -e "${BLUE}=================================================${NC}"
echo -e "Laman web MACE dan Database MongoDB anda kini aktif di VPS ini."
echo -e "Akses laman web anda di: http://$DOMAIN_NAME"
echo -e "Database berjalan secara senyap di latar belakang (Port: 27017)."
echo -e "\nLangkah Seterusnya:"
echo -e "1. Buka http://$DOMAIN_NAME/admin-mace"
echo -e "2. Pergi ke Settings > Backup"
echo -e "3. Upload fail JSON yang anda download dari server lama."
echo -e "${BLUE}=================================================${NC}"
