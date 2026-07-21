# 🔒 LAPORAN AUDIT KESELAMATAN & PANDUAN DEPLOY KE HOSTINGER

## ⚠️ ISU KESELAMATAN KRITIKAL YANG DITEMUI

### 1. **CREDENTIALS TERDEDAH DI .env** (CRITICAL)
Credentials berikut telah terdedah dalam repository:

#### MongoDB Atlas:
#### MongoDB Atlas:
- Username: `your_old_mongodb_user`
- Password: `your_old_mongodb_password`
- Cluster: `cluster0.your_cluster_id.mongodb.net`

#### Cloudflare R2:
- Account ID: `your_old_account_id`
- Access Key: `your_old_access_key`
- Secret Key: `your_old_secret_key`

#### Admin Default:
- Username: `admin`
- Password: `your_old_admin_password`

---

## 🚨 TINDAKAN SEGERA YANG PERLU DILAKUKAN

### LANGKAH 1: REVOKE SEMUA CREDENTIALS LAMA

#### A. MongoDB Atlas
1. Login ke [MongoDB Atlas](https://cloud.mongodb.com/)
2. Pergi ke **Database Access**
3. **Padam user** `icthouseteam_db_user`
4. **Buat user baru** dengan password kuat
5. Copy connection string baru

#### B. Cloudflare R2
1. Login ke [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. Pergi ke **R2 Storage**
3. Pergi ke **API Tokens**
4. **Revoke/Delete** access key lama
5. **Buat API token baru** dengan permissions minimum yang diperlukan

#### C. Admin Password
- Tukar password admin dalam `.env` sebelum deploy

---

### LANGKAH 2: BUAT SEMULA FAIL .ENV DENGAN NILAI BARU

```bash
# Salin template
cp .env.example .env

# Edit .env dengan credentials BARU anda
nano .env
```

**Pastikan tukar semua nilai placeholder:**
- `MONGO_URI` = Connection string MongoDB baru
- `SESSION_SECRET` = Generate random string (lihat bawah)
- `ADMIN_USER` = Username admin baru
- `ADMIN_PASS` = Password admin kuat
- `R2_*` = Credentials R2 baru

**Generate SESSION_SECRET yang kuat:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

### LANGKAH 3: UPDATE .gitignore

`.gitignore` sudah dikemaskini untuk exclude:
- ✅ `.env` (SENSITIVE!)
- ✅ `node_modules/`
- ✅ `uploads/`
- ✅ `*.log`

---

### LANGKAH 4: CLEAN GIT HISTORY (PENTING!)

Jika anda sudah commit `.env` dengan credentials lama ke Git:

```bash
# Hapuskan .env dari git history
git rm --cached .env
git commit -m "Remove .env from tracking"

# FORCE PUSH untuk update remote repository
git push origin main --force

# ⚠️ AMARAN: Ini akan rewrite git history!
```

**Alternatif lebih selamat:**
1. Buat repository GitHub BARU
2. Clone repository baru
3. Copy semua file KECUALI .env lama
4. Push ke repository baru
5. Delete repository lama

---

## 📋 PANDUAN DEPLOY KE HOSTINGER

### Pilihan A: Deploy dengan Node.js App (Recommended)

#### 1. Setup di Hostinger
1. Login ke **hPanel** Hostinger
2. Pergi ke **Website** → **Auto Installer**
3. Pilih **Node.js**
4. Configure:
   - Domain: `yourdomain.com`
   - Node.js version: **18.x atau 20.x**
   - Application path: `/public_html`
   - Startup file: `app.js`
   - Port: `3000` (atau port yang disediakan)

#### 2. Upload Files
```bash
# Di local machine, build production
npm install --production

# Upload ke Hostinger via FTP/SFTP
# JANGAN upload: .env, node_modules, uploads/
```

#### 3. Setup Environment Variables di Hostinger
1. Di hPanel, pergi ke **Node.js Selector**
2. Pilih aplikasi anda
3. Klik **Environment Variables**
4. Add semua variables dari `.env`:
   - `PORT`
   - `MONGO_URI`
   - `SESSION_SECRET`
   - `ADMIN_USER`
   - `ADMIN_PASS`
   - `R2_ACCOUNT_ID`
   - `R2_ENDPOINT`
   - `R2_ACCESS_KEY_ID`
   - `R2_SECRET_ACCESS_KEY`
   - `R2_BUCKET_NAME`
   - `NODE_ENV=production`

#### 4. Install Dependencies di Server
```bash
cd /home/username/domains/yourdomain.com/public_html
npm install --production
```

#### 5. Start Application
```bash
# Di Hostinger Node.js Selector
# Klik "Start" atau "Restart"
```

---

### Pilihan B: Deploy dengan Docker (Advanced)

#### 1. Buat Dockerfile
```dockerfile
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install --production

COPY . .

EXPOSE 3000

CMD ["node", "app.js"]
```

#### 2. Buat .dockerignore
```
node_modules
.env
uploads
.git
*.log
```

#### 3. Build & Run
```bash
docker build -t sukma-app .
docker run -p 3000:3000 --env-file .env sukma-app
```

---

## 🔐 BEST PRACTICES KESELAMATAN

### 1. Input Validation
✅ Sudah ada basic validation di routes
📌 **Improvement**: Tambah library `express-validator` untuk validation lebih ketat

### 2. Rate Limiting
❌ **Belum ada!** - Risiko brute force attack
📌 **Tambahkan**:
```javascript
const rateLimit = require('express-rate-limit');

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});

app.use(limiter);
```

### 3. Helmet.js untuk Security Headers
❌ **Belum ada!**
📌 **Tambahkan**:
```javascript
const helmet = require('helmet');
app.use(helmet());
```

### 4. CORS Configuration
❌ **Belum configure**
📌 **Tambahkan jika perlu**:
```javascript
const cors = require('cors');
app.use(cors({
  origin: 'https://yourdomain.com',
  credentials: true
}));
```

### 5. HTTPS Enforcement
📌 Pastikan Hostinger enable SSL/TLS
- Gunakan **Let's Encrypt** (free) di hPanel
- Force HTTPS redirect

### 6. Database Security
✅ Menggunakan MongoDB Atlas (good)
📌 **Checklist**:
- [ ] Whitelist IP addresses di MongoDB Atlas
- [ ] Enable encryption at rest
- [ ] Backup automatik diaktifkan

### 7. File Upload Security
✅ Menggunakan multer dengan disk storage
📌 **Improvements**:
- Validate file types (bukan sekadar extension)
- Limit file size
- Scan untuk malware jika boleh

---

## 🧪 TESTING SEBELUM DEPLOY

```bash
# 1. Install dependencies
npm install

# 2. Create .env dengan values baru
cp .env.example .env
# Edit .env dengan credentials BARU

# 3. Test locally
node app.js

# 4. Test semua features:
# - User registration
# - Login
# - Quiz submission
# - Certificate download
# - Admin panel
```

---

## 📞 CONTACT & RESOURCES

### MongoDB Atlas Support
- https://support.mongodb.com/

### Cloudflare R2 Docs
- https://developers.cloudflare.com/r2/

### Node.js Security Best Practices
- https://nodejs.org/en/security/

### OWASP Top 10
- https://owasp.org/www-project-top-ten/

---

## ✅ CHECKLIST SEBELUM GO LIVE

- [ ] Semua credentials lama sudah direvoke
- [ ] Credentials baru sudah dibuat dan disimpan di .env
- [ ] .env sudah ditambah ke .gitignore
- [ ] Git history sudah dibersihkan (jika perlu)
- [ ] MongoDB IP whitelist sudah dikonfigurasi
- [ ] SSL/TLS sudah enabled di Hostinger
- [ ] Rate limiting sudah ditambah
- [ ] Helmet.js sudah ditambah
- [ ] Testing lengkap sudah dijalankan
- [ ] Backup strategy sudah ditetapkan

---

**Last Updated:** June 2026  
**Audit By:** Security Review Process
