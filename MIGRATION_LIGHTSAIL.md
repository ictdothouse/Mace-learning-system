# 🚀 PANDUAN MIGRASI SISTEM KE AWS LIGHTSAIL (KUALA LUMPUR)

Panduan ini menerangkan langkah demi langkah untuk memindahkan sistem **MACE/SukmaLearning** dari Hostinger ke pelayan **AWS Lightsail (4GB RAM, 2 vCPUs)** di region **Kuala Lumpur (`ap-southeast-5`)** dengan pangkalan data MongoDB yang di-hos sendiri (self-hosted) serta storan media kekal di Cloudflare R2.

Prosedur ini direka untuk meminimumkan masa henti (*downtime*) dan memastikan sistem asal di Hostinger **kekal stabil** sepanjang proses persediaan berjalan.

---

## 📋 SENARAI SEMAK FASA MIGRASI

1. [ ] **Fasa 1:** Setup Pelayan AWS Lightsail & Firewall
2. [ ] **Fasa 2:** Pemasangan Perisian Automasi (Skrip Setup)
3. [ ] **Fasa 3:** Migrasi Pangkalan Data (MongoDB Atlas ke Lokal)
4. [ ] **Fasa 4:** Pemasangan Kod & Konfigurasi PM2
5. [ ] **Fasa 5:** Konfigurasi Nginx SSL (HTTPS)
6. [ ] **Fasa 6:** Penjadualan Auto-Backup ke Cloudflare R2
7. [ ] **Fasa 7:** Pertukaran DNS & Go Live

---

## 🛠️ LANGKAH DETEL MIGRASI

### FASA 1: Setup Pelayan AWS Lightsail & Firewall
1. Log masuk ke **AWS Console** dan pergi ke **Amazon Lightsail**.
2. Klik **Create instance**.
3. Pilih lokasi: **Kuala Lumpur, Zone A (ap-southeast-5a)**.
4. Pilih platform: **Linux/Unix (Ubuntu 22.04 LTS atau 24.04 LTS)**.
5. Pilih pelan: **$20/mo (4 GB RAM, 2 vCPUs, 80 GB SSD)**.
6. Klik **Create instance** dan tunggu sehingga status menjadi `Running`.
7. **Static IP (Wajib):** 
   * Pergi ke tab **Networking** → **Create static IP**.
   * Pilih instance anda dan klik **Create**. IP ini tidak akan berubah walaupun server direstart.
8. **Firewall (Port Access):**
   * Di tab **Networking** untuk instance anda, pergi ke bahagian **IPv4 Firewall**.
   * Tambah *rules* berikut jika belum ada:
     * `HTTP` (Port 80)
     * `HTTPS` (Port 443)
     * `SSH` (Port 22)

---

### FASA 2: Pemasangan Perisian Automasi (Skrip Setup)
1. Log masuk ke server Lightsail anda menggunakan SSH (melalui terminal atau butang browser AWS).
2. Dapatkan kod aplikasi anda dari repository Git ke folder `/home/ubuntu/Mace-learning-system`:
   ```bash
   cd /home/ubuntu
   git clone https://github.com/USERNAME/REPO_ANDA.git Mace-learning-system
   cd Mace-learning-system
   ```
3. Jalankan skrip setup automatik yang telah kami sediakan untuk memasang Node.js, MongoDB, Nginx, PM2, dan 4GB Swap Space:
   ```bash
   # Beri kebenaran eksekusi pada skrip
   chmod +x scripts/setup-lightsail.sh
   # Selesaikan isu line endings Windows (CRLF ke LF) jika ada
   sed -i -e 's/\r$//' scripts/setup-lightsail.sh
   # Jalankan skrip
   ./scripts/setup-lightsail.sh
   ```
4. Semak sama ada MongoDB sudah aktif:
   ```bash
   sudo systemctl status mongod
   ```

---

### FASA 3: Migrasi Pangkalan Data (MongoDB Atlas ke Lokal)
Langkah ini memindahkan data atlet dan keputusan kuiz dari MongoDB Atlas yang digunakan oleh Hostinger ke MongoDB tempatan di AWS Lightsail.

1. **Sediakan Dump Data dari Atlas:**
   * Di komputer lokal anda (atau dalam server Lightsail), jalankan `mongodump` untuk mengekstrak data dari Atlas (ganti URI di bawah dengan connection string dari fail `.env` Hostinger yang asal):
     ```bash
     mongodump --uri="mongodb+srv://USER:PASSWORD@cluster0.xxxxx.mongodb.net/sukma_db" --archive="atlas_backup.archive.gz" --gzip
     ```
2. **Hantar Fail Backup ke Pelayan Lightsail (jika dump di lokal):**
   * Hantar fail `atlas_backup.archive.gz` ke server AWS Lightsail menggunakan SCP/SFTP:
     ```bash
     scp -i path/to/lightsail-key.pem atlas_backup.archive.gz ubuntu@IP_STATIC_LIGHTSAIL:/home/ubuntu/
     ```
3. **Restore Data ke MongoDB Lokal di Lightsail:**
   * Di dalam pelayan Lightsail, masukkan data tersebut ke dalam MongoDB lokal baharu:
     ```bash
     mongorestore --uri="mongodb://127.0.0.1:27017/sukma_db" --archive="/home/ubuntu/atlas_backup.archive.gz" --gzip
     ```
   * *Nota: Data anda kini selamat disalin secara fizikal di dalam Malaysia.*

---

### FASA 4: Pemasangan Kod & Konfigurasi PM2
1. Pasang dependencies Node.js dalam pelayan Lightsail:
   ```bash
   cd /home/ubuntu/Mace-learning-system
   npm install --production
   ```
2. **Bina React Client Frontend (Vite):**
   * Pastikan folder `client` dibina dengan betul:
     ```bash
     cd client
     npm install
     npm run build
     cd ..
     ```
3. **Cipta fail `.env` pengeluaran (production) di pelayan Lightsail:**
   * Cipta fail `.env` baharu di `/home/ubuntu/Mace-learning-system/.env` dan tetapkan nilai seperti di bawah (pangkalan data ditukar ke localhost):
     ```env
     PORT=3000
     MONGO_URI=mongodb://127.0.0.1:27017/sukma_db
     NODE_ENV=production
     
     # Sila salin kelayakan R2 yang asal untuk kekalkan capaian video/gambar
     R2_ACCOUNT_ID=account_id_anda
     R2_ENDPOINT=https://account_id_anda.r2.cloudflarestorage.com
     R2_ACCESS_KEY_ID=access_key_anda
     R2_SECRET_ACCESS_KEY=secret_key_anda
     R2_BUCKET_NAME=modulmace
     
     # Admin & Session Credentials (Tukar kepada kata laluan kuat!)
     SESSION_SECRET=jana_random_string_panjang
     ADMIN_USER=admin_msn_2026
     ADMIN_PASS=PasswordKuatAnda123!
     ```
4. **Jalankan Aplikasi dengan PM2:**
   * Lancarkan aplikasi menggunakan fail konfigurasi kluster yang telah disediakan:
     ```bash
     pm2 start ecosystem.config.js --env production
     ```
   * Setkan PM2 supaya berjalan secara automatik apabila server reboot:
     ```bash
     pm2 startup
     # Jalankan arahan sudo env PATH... yang dipaparkan di terminal anda selepas arahan di atas
     pm2 save
     ```

---

### FASA 5: Konfigurasi Nginx SSL (HTTPS)
1. Salin konfigurasi Nginx yang telah disediakan ke direktori konfigurasi Nginx:
   ```bash
   sudo cp nginx.conf /etc/nginx/sites-available/mace-learning-system
   ```
2. Edit fail konfigurasi tersebut untuk meletakkan domain sebenar anda:
   ```bash
   sudo nano /etc/nginx/sites-available/mace-learning-system
   # Tukar line 'server_name yourdomain.com www.yourdomain.com;' ke domain anda
   ```
3. Aktifkan laman konfigurasi baharu dan padam konfigurasi default:
   ```bash
   sudo ln -s /etc/nginx/sites-available/mace-learning-system /etc/nginx/sites-enabled/
   sudo rm /etc/nginx/sites-enabled/default
   ```
4. Uji sintaks Nginx dan restart servis:
   ```bash
   sudo nginx -t
   sudo systemctl restart nginx
   ```
5. **Pasang SSL Percuma (Let's Encrypt):**
   * Pasang certbot dan jana sijil SSL:
     ```bash
     sudo apt-get install -y certbot python3-certbot-nginx
     sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
     ```
   * Ikuti arahan pada terminal (masukkan emel dan setuju untuk redirect trafik HTTP ke HTTPS secara automatik).

---

### FASA 6: Penjadualan Auto-Backup ke Cloudflare R2
Skrip `scripts/backup-mongodb.js` akan menjana backup harian secara automatik dan memuat naiknya ke Cloudflare R2.

1. Uji skrip backup secara manual terlebih dahulu untuk memastikan tiada sebarang isu:
   ```bash
   node scripts/backup-mongodb.js
   ```
   *Semak akaun Cloudflare R2 anda, satu fail zip backup pangkalan data sepatutnya muncul di bawah folder `backups/`.*
2. Setkan *Cron Job* sistem pelayan untuk menjalankan skrip ini setiap hari pada jam 3:00 pagi:
   ```bash
   # Buka konfigurasi cron
   crontab -e
   ```
   Pilih editor (nano) dan tambahkan baris berikut di bahagian paling bawah fail:
   ```text
   0 3 * * * /usr/bin/node /home/ubuntu/Mace-learning-system/scripts/backup-mongodb.js >> /home/ubuntu/Mace-learning-system/logs/backup.log 2>&1
   ```
3. Simpan dan keluar (Ctrl+O, Enter, Ctrl+X).

---

### FASA 7: Pertukaran DNS & Go Live
Apabila server AWS Lightsail sudah diuji sepenuhnya dan sedia (anda boleh menguji dengan melawat IP Static pelayan menerusi browser):

1. Pergi ke penyedia Domain DNS anda (contohnya GoDaddy, Namecheap, MYNIC).
2. Kemas kini rekod DNS berikut:
   * **A Record** | `@` (atau domain utama) | Point ke **IP Static AWS Lightsail** anda.
   * **A Record** | `www` | Point ke **IP Static AWS Lightsail** anda.
3. Tunggu proses propagasi DNS (biasanya mengambil masa 5 minit hingga beberapa jam).
4. Setelah propagasi selesai, pelawat akan mula diarahkan ke pelayan AWS Lightsail Malaysia yang baharu.
5. Anda boleh menghentikan pelayan Node.js di Hostinger secara selamat selepas itu.

---

## ⚙️ CARA MEMULIHKAN DATA (RESTORE FROM BACKUP)

Sekiranya berlaku kecemasan dan anda perlu memulihkan database dari fail backup R2:
1. Muat turun fail `.archive.gz` terbaru dari Cloudflare R2.
2. Jalankan perintah restore di server:
   ```bash
   mongorestore --uri="mongodb://127.0.0.1:27017/sukma_db" --drop --archive="nama_fail_backup.archive.gz" --gzip
   ```
   *Nota: Parameter `--drop` akan memadam koleksi sedia ada sebelum restore untuk mengelakkan pertindihan data.*
