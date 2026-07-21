#!/bin/bash

# ==============================================================================
# 🚀 SKRIP SETUP AUTOMASI AWS LIGHTSAIL (UBUNTU) - eLearning Atlet SUKMA
# ==============================================================================
# Skrip ini akan memasang:
# 1. 4GB Swap Space (Memori Maya) untuk mengelakkan Crash (OOM)
# 2. Node.js v20 LTS
# 3. MongoDB 7.0 Community Edition & Database Tools
# 4. Nginx Reverse Proxy
# 5. PM2 Process Manager
# ==============================================================================

# Hentikan skrip jika berlaku sebarang ralat
set -e

echo "=================================================="
echo "🎯 MEMULAKAN SETUP PELAYAN AWS LIGHTSAIL..."
echo "=================================================="

# Kemas kini senarai pakej sistem
echo "♻️ Mengemas kini senarai pakej sistem..."
sudo apt-get update -y
sudo apt-get upgrade -y

# 1. SETUP SWAP SPACE (4GB)
# ==============================================================================
echo "💾 Menyemak Swap Space..."
CURRENT_SWAP=$(free -m | awk '/^Swap:/{print $2}')

if [ "$CURRENT_SWAP" -eq 0 ]; then
    echo "⚠️ Tiada Swap dikesan. Membina 4GB Swap Space..."
    sudo fallocate -l 4G /swapfile
    sudo chmod 600 /swapfile
    sudo mkswap /swapfile
    sudo swapon /swapfile
    # Masukkan ke fstab supaya kekal selepas restart
    echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
    echo "✅ Swap Space 4GB berjaya dibina!"
else
    echo "✅ Swap Space sedia ada: ${CURRENT_SWAP}MB. Melangkau langkah ini."
fi

# 2. PASANG NODE.JS v20 LTS
# ==============================================================================
echo "🟢 Memasang Node.js v20 LTS..."
sudo apt-get install -y curl gnupg
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
echo "✅ Node.js Version: $(node -v)"
echo "✅ NPM Version: $(npm -v)"

# 3. PASANG MONGODB 7.0 & DATABASE TOOLS
# ==============================================================================
echo "🍃 Memasang MongoDB 7.0 Community Edition..."

# Dapatkan GPG Key untuk MongoDB
curl -fsSL https://www.mongodb.org/static/pgp/server-7.0.asc | \
   sudo gpg --yes --dearmor -o /usr/share/keyrings/mongodb-server-7.0.gpg

# Kenalpasti versi Ubuntu (Noble 24.04 atau Jammy 22.04)
CODENAME=$(lsb_release -cs)
if [ "$CODENAME" = "noble" ]; then
    echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] https://repo.mongodb.org/apt/ubuntu noble/mongodb-org/7.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list
else
    # Jammy 22.04 atau lain-lain, default ke Jammy
    echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list
fi

sudo apt-get update -y

# Pasang MongoDB Org dan Tools (mongodump/mongorestore)
sudo apt-get install -y mongodb-org mongodb-database-tools

# Aktifkan dan jalankan MongoDB
sudo systemctl daemon-reload
sudo systemctl enable mongod
sudo systemctl start mongod

echo "✅ MongoDB berjaya dipasang dan dijalankan!"

# 4. PASANG NGINX REVERSE PROXY
# ==============================================================================
echo "🌐 Memasang Nginx..."
sudo apt-get install -y nginx
sudo systemctl enable nginx
sudo systemctl start nginx
echo "✅ Nginx berjaya dipasang dan dijalankan!"

# 5. PASANG PM2 & UTILITI GIT
# ==============================================================================
echo "🚀 Memasang PM2 Process Manager globally..."
sudo npm install -g pm2
sudo apt-get install -y git
echo "✅ PM2 berjaya dipasang!"

# ==============================================================================
echo "=================================================="
echo "🎉 SETUP SELESAI!"
echo "=================================================="
echo "Sila pastikan port berikut dibuka pada AWS Lightsail Firewall:"
echo " - TCP 80  (HTTP - Nginx)"
echo " - TCP 443 (HTTPS - Nginx SSL)"
echo " - TCP 22  (SSH)"
echo "=================================================="
